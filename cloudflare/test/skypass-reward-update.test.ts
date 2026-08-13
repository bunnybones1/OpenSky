import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'
import { SkypassRewardUpdateRepository } from '../src/skypass-reward-update'
import {
  calculatedSkypassRewardPolicyHash,
  SKYPASS_REWARD_POLICY_HASH
} from '../src/skypass-reward-policy'
import {
  clearTestSkypassPolicies,
  createTestSkypassPolicy
} from './helpers/skypass-policy'

const testEnv = env as unknown as Env
const ADMIN = 'skypass-reward-admin'
const REVIEWER = 'skypass-reward-reviewer'
const PLAYER = 'skypass-reward-player'
const ORIGIN = 'https://rewards.cloudweasel.example'

const csv = (...records: string[][]) =>
  [
    'A,B,C,D,E,F,G,H',
    ...records.map(record =>
      record
        .map(value => `"${value.replaceAll('"', '""')}"`)
        .join(',')
    )
  ].join('\n')

const validCsv = () =>
  csv(
    ['3', 'FREE', 'SW_BASE_CARDS', '2', '0', '', 'CORE_SET', ''],
    ['3', 'FREE', 'SW_BASE_CARDS', '', '1', '140', '', 'HEXBOUND_INVASION'],
    ['4', 'FREE', 'SW_HERO', '', '', '2', '', '']
  )

const csvResponse = (body = validCsv()) =>
  new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/csv' }
  })

const rpcMethodAs = async (
  userId: string,
  method:
    | 'GMUpdateSkypassRewards'
    | 'GMActivateSkypassRewards'
    | 'GMListSkypassRewards',
  body: object,
  options: {
    signedIn?: boolean
    fetcher?: typeof fetch
    allowedOrigins?: string
  } = {}
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (options.signedIn !== false) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(
      `https://opensky.example/api/rpc/SkyWeaverAPI/${method}`,
      { method: 'POST', headers, body: JSON.stringify(body) }
    ),
    testEnv,
    {
      verifyProof: vi.fn(),
      skypassRewardFetch: options.fetcher,
      skypassRewardAllowedOrigins: options.allowedOrigins
    }
  )
}

const rpcAs = (
  userId: string,
  body: object,
  options: Parameters<typeof rpcMethodAs>[3] = {}
) => rpcMethodAs(userId, 'GMUpdateSkypassRewards', body, options)

const activateAs = (userId: string, season: number, version: number) =>
  rpcMethodAs(userId, 'GMActivateSkypassRewards', {
    season,
    version,
    reason: 'reviewed exact off-chain SkyPass policy',
    reviewReference: 'test:skypass-review'
  })

const reviewAs = (userId: string, season: number, version: number) =>
  rpcMethodAs(userId, 'GMListSkypassRewards', { season, version })

const grantAdmin = async (userId = ADMIN) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(userId, new Date().toISOString())
    .run()
}

const grantRewardWrite = async (userId = ADMIN) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_skypass_reward_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(userId, new Date().toISOString())
    .run()
}

const enableAdmin = async (userId = ADMIN) => {
  await grantAdmin(userId)
  await grantRewardWrite(userId)
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  await clearTestSkypassPolicies(
    env.AUTH_DB,
    [501, 502, 503, 504, 505, 506, 507, 508, 509, 510]
  )
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Reward Admin', 'reward-admin@example.com', ?, ?),
            (?, 'Reward Reviewer', 'reward-reviewer@example.com', ?, ?),
            (?, 'Reward Player', 'reward-player@example.com', ?, ?)`
  )
    .bind(ADMIN, now, now, REVIEWER, now, now, PLAYER, now, now)
    .run()
  const players = new PlayerRepository(env.AUTH_DB)
  await players.bootstrap(ADMIN)
  await players.bootstrap(REVIEWER)
  await players.bootstrap(PLAYER)
})

describe('SkyPass reward definition updates', () => {
  it('pins the fulfillment digest to the generated catalog and off-chain mappings', async () => {
    expect(await calculatedSkypassRewardPolicyHash()).toBe(
      SKYPASS_REWARD_POLICY_HASH
    )
  })

  it('requires identity, ADMIN, and the separately dormant write capability', async () => {
    const fetcher = vi.fn(async () => csvResponse())
    expect(
      (
        await rpcAs(ADMIN, { season: 501, url: `${ORIGIN}/rewards.csv` }, {
          signedIn: false,
          fetcher,
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(401)
    expect(
      (
        await rpcAs(PLAYER, { season: 501, url: `${ORIGIN}/rewards.csv` }, {
          fetcher,
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(403)
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, { season: 501, url: `${ORIGIN}/rewards.csv` }, {
          fetcher,
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('fails closed without an allowlisted HTTPS origin', async () => {
    await enableAdmin()
    const fetcher = vi.fn(async () => csvResponse())
    expect(
      (
        await rpcAs(
          ADMIN,
          { season: 502, url: `${ORIGIN}/rewards.csv` },
          { fetcher }
        )
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(
          ADMIN,
          { season: 502, url: 'http://rewards.cloudweasel.example/rewards.csv' },
          { fetcher, allowedOrigins: ORIGIN }
        )
      ).status
    ).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('imports an invisible draft and atomically activates it after distinct review', async () => {
    await enableAdmin()
    await enableAdmin(REVIEWER)
    await createTestSkypassPolicy(env.AUTH_DB, 503, [
      { level: 1, tier: 1, itemType: 303, amount: 1 }
    ])
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${ORIGIN}/private/rewards.csv?signature=do-not-log`)
      expect(init?.redirect).toBe('manual')
      return csvResponse()
    })
    const response = await rpcAs(
      ADMIN,
      {
        season: 503,
        url: `${ORIGIN}/private/rewards.csv?signature=do-not-log`
      },
      { fetcher, allowedOrigins: ORIGIN }
    )
    expect(response.status).toBe(200)
    const body = await response.json<{ rewards: Array<Record<string, unknown>> }>()
    expect(body.rewards).toHaveLength(3)
    expect(body.rewards.map(reward => reward.level)).toEqual([3, 3, 4])
    expect(body.rewards[0]).toMatchObject({
      level: 3,
      tier: 'FREE',
      itemType: 'SW_BASE_CARDS',
      amount: 2,
      isStarter: false,
      isInfinite: false
    })
    expect(body.rewards[1]).toMatchObject({
      level: 3,
      amount: 0,
      isStarter: true,
      attributes: { tokenIDs: [140], cardSetsExcluded: ['HEXBOUND_INVASION'] }
    })
    expect(body.rewards[2]).toMatchObject({
      itemType: 'SW_HERO',
      isInfinite: true,
      attributes: { tokenIDs: [2], unlockDeckClasses: ['AGY'] }
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM skypass_reward_active_rewards
         WHERE season = 503 AND level = 1`
      ).first('count')
    ).toBe(1)
    expect((await reviewAs(PLAYER, 503, 2)).status).toBe(403)
    const review = await reviewAs(REVIEWER, 503, 2)
    expect(review.status).toBe(200)
    expect(await review.json()).toMatchObject({
      policy: {
        season: 503,
        version: 2,
        status: 'DRAFT',
        rewardCount: 3,
        fulfillmentPolicyVersion: 1,
        fulfillmentPolicyHash: SKYPASS_REWARD_POLICY_HASH,
        createdByUserId: ADMIN,
        activatedByUserId: null
      },
      rewards: body.rewards
    })
    expect((await activateAs(ADMIN, 503, 2)).status).toBe(400)
    const activated = await activateAs(REVIEWER, 503, 2)
    expect(activated.status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM skypass_reward_active_rewards
         WHERE season = 503`
      ).first('count')
    ).toBe(3)
    const audit = await env.AUTH_DB.prepare(
      `SELECT source_origin, before_json, after_json
       FROM staff_skypass_reward_audit WHERE season = 503`
    ).first<{ source_origin: string; before_json: string; after_json: string }>()
    expect(audit?.source_origin).toBe(ORIGIN)
    expect(JSON.stringify(audit)).not.toContain('do-not-log')
    expect(JSON.parse(audit!.before_json)).toHaveLength(1)
    expect(JSON.parse(audit!.after_json)).toHaveLength(3)
  })

  it('revalidates every redirect and enforces exact source content type', async () => {
    await enableAdmin()
    await enableAdmin(REVIEWER)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: `${ORIGIN}/final.csv` }
        })
      )
      .mockResolvedValueOnce(csvResponse())
    expect(
      (
        await rpcAs(ADMIN, { season: 504, url: `${ORIGIN}/start.csv` }, {
          fetcher,
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(200)
    expect((await activateAs(REVIEWER, 504, 1)).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)

    const crossOrigin = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://metadata.example/internal' }
      })
    )
    expect(
      (
        await rpcAs(ADMIN, { season: 505, url: `${ORIGIN}/start.csv` }, {
          fetcher: crossOrigin,
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(400)
    const parameterized = vi.fn(async () =>
      new Response(validCsv(), {
        headers: { 'content-type': 'text/csv; charset=utf-8' }
      })
    )
    expect(
      (
        await rpcAs(ADMIN, { season: 506, url: `${ORIGIN}/rewards.csv` }, {
          fetcher: parameterized,
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(400)
  })

  it('rejects malformed and duplicate rows without partially changing a season', async () => {
    await enableAdmin()
    await createTestSkypassPolicy(env.AUTH_DB, 507, [
      { level: 1, tier: 1, itemType: 300, amount: 1 }
    ])
    const duplicate = csv(
      ['1', 'FREE', 'SW_BASE_CARDS', '1', '', '', '', ''],
      ['1', 'FREE', 'SW_CONQUEST_TICKET', '1', '0', '', '', '']
    )
    const response = await rpcAs(
      ADMIN,
      { season: 507, url: `${ORIGIN}/invalid.csv` },
      { fetcher: async () => csvResponse(duplicate), allowedOrigins: ORIGIN }
    )
    expect(response.status).toBe(400)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM skypass_reward_active_rewards
         WHERE season = 507 AND level = 1 AND amount = 1`
      ).first('count')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM staff_skypass_reward_audit WHERE season = 507'
      ).first('count')
    ).toBe(0)
  })

  it('validates sticker rewards against the canonical off-chain content ID', async () => {
    await enableAdmin()
    await enableAdmin(REVIEWER)
    await env.AUTH_DB.prepare(
      `INSERT INTO content_stickers (token_id, required_points, season)
       VALUES (77, 25, 510)`
    ).run()
    const stickerCsv = csv([
      '1',
      'FREE',
      'SW_STICKERS',
      '',
      '',
      '77',
      '',
      ''
    ])
    const response = await rpcAs(
      ADMIN,
      { season: 510, url: `${ORIGIN}/stickers.csv` },
      { fetcher: async () => csvResponse(stickerCsv), allowedOrigins: ORIGIN }
    )
    expect(response.status).toBe(200)
    expect((await activateAs(REVIEWER, 510, 1)).status).toBe(200)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE content_stickers SET required_points = 26 WHERE token_id = 77`
      ).run()
    ).rejects.toThrow('active SkyPass sticker metadata is immutable')
    expect(await response.json()).toMatchObject({
      rewards: [
        {
          itemType: 'SW_STICKERS',
          attributes: { tokenIDs: [77] },
          isInfinite: true
        }
      ]
    })
  })

  it('makes a season immutable after any reward definition was claimed', async () => {
    await enableAdmin()
    const policy = await createTestSkypassPolicy(env.AUTH_DB, 508, [
      { level: 1, tier: 1, itemType: 300, amount: 1 }
    ])
    const rewardId = policy.rows[0].id
    await env.AUTH_DB.prepare(
      `INSERT INTO player_skypass_claims
         (user_id, reward_id, rewards, claimed_at)
       VALUES (?, ?, '[]', ?)`
    )
      .bind(PLAYER, rewardId, new Date().toISOString())
      .run()
    expect(
      (
        await rpcAs(ADMIN, { season: 508, url: `${ORIGIN}/rewards.csv` }, {
          fetcher: async () => csvResponse(),
          allowedOrigins: ORIGIN
        })
      ).status
    ).toBe(400)
    await expect(
      env.AUTH_DB.prepare('DELETE FROM skypass_rewards WHERE id = ?')
        .bind(rewardId)
        .run()
    ).rejects.toThrow('Versioned SkyPass reward rows are immutable')
    await expect(
      env.AUTH_DB.prepare('UPDATE skypass_rewards SET amount = 2 WHERE id = ?')
        .bind(rewardId)
        .run()
    ).rejects.toThrow('Versioned SkyPass reward rows are immutable')
    await expect(
      createTestSkypassPolicy(env.AUTH_DB, 508, [
        { level: 2, tier: 1, itemType: 300, amount: 1 }
      ])
    ).rejects.toThrow('SkyPass reward policy activation is invalid')
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM staff_skypass_reward_audit WHERE season = 508'
      ).first('count')
    ).toBe(0)
  })

  it('serializes concurrent whole-season replacements with one immutable audit', async () => {
    const repo = new SkypassRewardUpdateRepository(
      env.AUTH_DB,
      async () => csvResponse(),
      ORIGIN
    )
    const results = await Promise.allSettled([
      repo.update(ADMIN, 509, `${ORIGIN}/a.csv`),
      repo.update(ADMIN, 509, `${ORIGIN}/b.csv`)
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM staff_skypass_reward_audit WHERE season = 509'
      ).first('count')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM skypass_rewards
         WHERE season = 509 AND policy_version = 1`
      ).first('count')
    ).toBe(3)
  })
})
