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

const testEnv = env as unknown as Env
const ADMIN = 'skypass-reward-admin'
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

const rpcAs = async (
  userId: string,
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
      'https://opensky.example/api/rpc/SkyWeaverAPI/GMUpdateSkypassRewards',
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

const grantAdmin = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantRewardWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_skypass_reward_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const enableAdmin = async () => {
  await grantAdmin()
  await grantRewardWrite()
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Reward Admin', 'reward-admin@example.com', ?, ?),
            (?, 'Reward Player', 'reward-player@example.com', ?, ?)`
  )
    .bind(ADMIN, now, now, PLAYER, now, now)
    .run()
  const players = new PlayerRepository(env.AUTH_DB)
  await players.bootstrap(ADMIN)
  await players.bootstrap(PLAYER)
})

describe('SkyPass reward definition updates', () => {
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

  it('replaces a season atomically with source parsing, IDs, ordering, and infinity', async () => {
    await enableAdmin()
    const inserted = await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, updated_by, is_infinite)
       VALUES (3, 503, 1, 300, 1, 0, NULL, ?, 1, 1)`
    )
      .bind(new Date().toISOString())
      .run()
    const retainedId = inserted.meta.last_row_id
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, updated_by, is_infinite)
       VALUES (99, 503, 1, 300, 1, 0, NULL, ?, 1, 0)`
    )
      .bind(new Date().toISOString())
      .run()
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
      id: retainedId,
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
        'SELECT COUNT(*) AS count FROM skypass_rewards WHERE season = 503'
      ).first('count')
    ).toBe(3)
    const audit = await env.AUTH_DB.prepare(
      `SELECT source_origin, before_json, after_json
       FROM staff_skypass_reward_audit WHERE season = 503`
    ).first<{ source_origin: string; before_json: string; after_json: string }>()
    expect(audit?.source_origin).toBe(ORIGIN)
    expect(JSON.stringify(audit)).not.toContain('do-not-log')
    expect(JSON.parse(audit!.before_json)).toHaveLength(2)
    expect(JSON.parse(audit!.after_json)).toHaveLength(3)
  })

  it('revalidates every redirect and enforces exact source content type', async () => {
    await enableAdmin()
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
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, updated_by, is_infinite)
       VALUES (1, 507, 1, 300, 1, 0, NULL, ?, 1, 1)`
    )
      .bind(new Date().toISOString())
      .run()
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
        `SELECT COUNT(*) AS count FROM skypass_rewards
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
    const inserted = await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, updated_by, is_infinite)
       VALUES (1, 508, 1, 300, 1, 0, NULL, ?, 1, 1)`
    )
      .bind(new Date().toISOString())
      .run()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_skypass_claims
         (user_id, reward_id, rewards, claimed_at)
       VALUES (?, ?, '[]', ?)`
    )
      .bind(PLAYER, inserted.meta.last_row_id, new Date().toISOString())
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
        .bind(inserted.meta.last_row_id)
        .run()
    ).rejects.toThrow('Claimed SkyPass rewards are immutable')
    await expect(
      env.AUTH_DB.prepare('UPDATE skypass_rewards SET amount = 2 WHERE id = ?')
        .bind(inserted.meta.last_row_id)
        .run()
    ).rejects.toThrow('Claimed SkyPass rewards are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO skypass_rewards
           (level, season, tier, item_type, amount, is_starter, attributes,
            updated_at, updated_by, is_infinite)
         VALUES (2, 508, 1, 300, 1, 0, NULL, ?, 1, 0)`
      )
        .bind(new Date().toISOString())
        .run()
    ).rejects.toThrow('Claimed SkyPass rewards are immutable')
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
        'SELECT COUNT(*) AS count FROM skypass_rewards WHERE season = 509'
      ).first('count')
    ).toBe(3)
  })
})
