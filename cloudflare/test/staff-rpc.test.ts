import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'
import { seasonFromDate } from '../src/legacy-seasons'

const testEnv = env as unknown as Env
const ADMIN = 'staff-admin'
const PLAYER = 'staff-player'

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  signedIn = true
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    testEnv
  )
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM match_reviews'),
    env.AUTH_DB.prepare('DELETE FROM staff_moderation_permissions'),
    env.AUTH_DB.prepare('DELETE FROM player_account_reports'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM content_notification_templates'),
    env.AUTH_DB.prepare('DELETE FROM content_featured_streamers'),
    env.AUTH_DB.prepare('DELETE FROM content_banners'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Staff Admin', 'staff-admin@example.com', ?, ?),
            (?, 'Staff Player', 'staff-player@example.com', ?, ?)`
  )
    .bind(ADMIN, now, now, PLAYER, now, now)
    .run()
  const players = new PlayerRepository(env.AUTH_DB)
  await players.bootstrap(ADMIN)
  await players.bootstrap(PLAYER)
})

const grantAdmin = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantContentWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_permissions
       (user_id, permission, granted_by_user_id, reason, created_at)
     VALUES (?, 'CONTENT_WRITE', NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantModerationWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_moderation_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const seedReport = async () => {
  const now = '2026-08-13T15:00:00.000Z'
  const endedAt = '2026-08-13T15:15:00.000Z'
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (id, proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, player1_user_id, player2_user_id,
        match_payload_json, status, winner_player, result_json,
        created_at, updated_at, ended_at)
     VALUES (901, 'staff-report-match', 'staff-report-replay',
             'RANKED_CONSTRUCTED', 'test',
             '0x1111111111111111111111111111111111111111',
             '0x2222222222222222222222222222222222222222',
             ?, ?, '{}', 'ended', 0,
             '{"status":"COMPLETED","turnCount":8,"moveCount":12}',
             ?, ?, ?)`
  )
    .bind(ADMIN, PLAYER, now, endedAt, endedAt)
    .run()
  await env.AUTH_DB.prepare(
    `INSERT INTO player_account_reports
       (match_id, reported_user_id, reporter_user_id, comment,
        created_at, updated_at)
     VALUES (901, ?, ?, 'Repeated stalling', ?, ?)`
  )
    .bind(PLAYER, ADMIN, now, now)
    .run()
}

const seedGoldDeliveries = async () => {
  const createdAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const deliverAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  const deliveredAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquests
       (id, entry_key, user_id, status, nonce, mode, hero, deck_class,
        match_progress, created_at, ended_at)
     VALUES (951, 'staff-gold-pending', ?, 'COMPLETED', 1,
             'CONQUEST_CONSTRUCTED', 'ADA', 'STR', '{}', ?, ?),
            (952, 'staff-gold-delivered', ?, 'COMPLETED', 2,
             'CONQUEST_CONSTRUCTED', 'ADA', 'STR', '{}', ?, ?)`
  )
    .bind(PLAYER, createdAt, createdAt, PLAYER, createdAt, createdAt)
    .run()
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquest_gold_deliveries
       (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
        status, attempt_count, created_at)
     VALUES (951, ?, '[11,12]', '[1011,1012]', ?, 'PENDING', 0, ?)`
  )
    .bind(PLAYER, deliverAt, createdAt)
    .run()
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquest_gold_deliveries
       (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
        status, delivery_key, attempt_count, created_at, delivered_at)
     VALUES (952, ?, '[13]', '[1013]', ?, 'DELIVERED',
             'staff-delivery-receipt', 1, ?, ?)`
  )
    .bind(PLAYER, deliveredAt, createdAt, deliveredAt)
    .run()
  return deliverAt
}

describe('fail-closed Google identity staff authorization', () => {
  it('distinguishes missing authentication from a signed-in non-admin', async () => {
    expect((await rpcAs(PLAYER, 'GMStats', {}, false)).status).toBe(401)
    const response = await rpcAs(PLAYER, 'GMStats')
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      code: 'webrpc.permission_denied',
      msg: 'admin access required',
      status: 403
    })
  })

  it('lets only an explicitly seeded admin read source account counts', async () => {
    await grantAdmin()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED' WHERE user_id = ?`
    )
      .bind(PLAYER)
      .run()

    const response = await rpcAs(ADMIN, 'GMStats')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      stats: {
        total_active_users: 1,
        total_suspended_users: 0,
        total_banned_users: 0,
        total_vip_users: 0,
        total_flagged_users: 1,
        total_to_delete_users: 0
      }
    })
  })

  it('supports the original admin UI authorization probe without exposing actions', async () => {
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMIsAccountBanned', {
      account: `identity:${PLAYER}`
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      banned: false,
      status: 'ACTIVE',
      accountActions: []
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMIsAccountBanned', {
          account: 'identity:missing'
        })
      ).status
    ).toBe(404)
  })

  it('keeps source-unimplemented admin account RPCs behind the role check', async () => {
    expect((await rpcAs(PLAYER, 'AdminListAccounts')).status).toBe(403)
    await grantAdmin()
    expect((await rpcAs(ADMIN, 'AdminListAccounts')).status).toBe(501)
    expect((await rpcAs(ADMIN, 'AdminSearchAccounts')).status).toBe(501)
  })

  it('finds accounts by source name, address field, and preserved identity route', async () => {
    expect(
      (
        await rpcAs(PLAYER, 'GMFindAccount', {
          name: 'Staff Player'
        })
      ).status
    ).toBe(403)
    await grantAdmin()
    for (const body of [
      { name: 'Staff Player' },
      { accountAddress: `identity:${PLAYER}` },
      { name: `identity:${PLAYER}` }
    ]) {
      const response = await rpcAs(ADMIN, 'GMFindAccount', body)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        account: {
          address: `identity:${PLAYER}`,
          name: 'Staff Player',
          settings: { requestMoreInvites: false }
        }
      })
    }
    expect((await rpcAs(ADMIN, 'GMFindAccount')).status).toBe(400)
    expect(
      (await rpcAs(ADMIN, 'GMFindAccount', { name: 'Missing Player' })).status
    ).toBe(404)
  })

  it('lists filtered staff account rows with source-shaped cursor metadata', async () => {
    expect((await rpcAs(PLAYER, 'GMListAccounts')).status).toBe(403)
    await grantAdmin()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED' WHERE user_id = ?`
    )
      .bind(PLAYER)
      .run()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I'
       WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'`
    )
      .bind(PLAYER)
      .run()

    const filtered = await rpcAs(ADMIN, 'GMListAccounts', {
      page: {
        pageSize: 1,
        sort: [{ column: 'created_at', order: 'DESC' }]
      },
      accountStatus: ['FLAGGED'],
      conquestsUnlocked: true
    })
    expect(filtered.status).toBe(200)
    const body = (await filtered.json()) as {
      page: { pageSize: number; hasBefore: boolean; hasAfter: boolean }
      accounts: Array<{
        account: { address: string }
        conquestsUnlocked: boolean
        accountActions: unknown[]
        ipHistory: unknown[]
      }>
    }
    expect(body.page).toMatchObject({
      pageSize: 1,
      hasBefore: false,
      hasAfter: false
    })
    expect(body.accounts).toEqual([
      expect.objectContaining({
        account: expect.objectContaining({ address: `identity:${PLAYER}` }),
        conquestsUnlocked: true,
        accountActions: [],
        ipHistory: []
      })
    ])

    expect(
      await (
        await rpcAs(ADMIN, 'GMListAccounts', {
          accountActions: ['BANNED']
        })
      ).json()
    ).toMatchObject({ accounts: [] })
  })

  it('paginates account rows and rejects unsafe filters and sort columns', async () => {
    await grantAdmin()
    const first = (await (
      await rpcAs(ADMIN, 'GMListAccounts', { page: { pageSize: 1 } })
    ).json()) as { page: { after: string; hasBefore: boolean } }
    expect(first.page.hasBefore).toBe(true)
    const second = await rpcAs(ADMIN, 'GMListAccounts', {
      page: { pageSize: 1, before: first.page.after }
    })
    expect(await second.json()).toMatchObject({
      page: { hasBefore: false, hasAfter: true }
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMListAccounts', {
          page: { sort: [{ column: 'primary_email', order: 'ASC' }] }
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(ADMIN, 'GMListAccounts', {
          createdBefore: 'not-a-date'
        })
      ).status
    ).toBe(400)
  })

  it('lists real report signals with identity-safe audit payloads', async () => {
    await seedReport()
    expect(
      (
        await rpcAs(PLAYER, 'GMListAccountSignals', {
          account: `identity:${PLAYER}`
        })
      ).status
    ).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMListAccountSignals', {
      account: `identity:${PLAYER}`
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      signal: [
        expect.objectContaining({
          id: expect.any(Number),
          signalType: 'user report',
          signalStatus: 'PENDING',
          createdAt: '2026-08-13T15:00:00.000Z',
          updatedAt: '2026-08-13T15:00:00.000Z',
          signalData: {
            reportedBy: `identity:${ADMIN}`,
            matchId: 901,
            comment: 'Repeated stalling'
          },
          score: 0
        })
      ]
    })
    expect((await rpcAs(ADMIN, 'GMListAccountSignals', {})).status).toBe(400)
  })

  it('summarizes reported accounts without fabricating a risk score', async () => {
    await seedReport()
    expect((await rpcAs(PLAYER, 'GMAccountSignalSummaries')).status).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMAccountSignalSummaries', {
      accountStatus: [],
      createdBefore: '2026-08-14T00:00:00Z',
      page: {
        pageSize: 50,
        sort: [{ column: 'score', order: 'DESC' }]
      }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      page: { pageSize: 50, hasBefore: false, hasAfter: false },
      signals: [
        {
          accountAddress: `identity:${PLAYER}`,
          score: 0,
          updatedAt: '2026-08-13T15:00:00.000Z',
          account: { name: 'Staff Player' },
          accountActions: []
        }
      ]
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED' WHERE user_id = ?`
    )
      .bind(PLAYER)
      .run()
    expect(
      await (await rpcAs(ADMIN, 'GMAccountSignalSummaries')).json()
    ).toMatchObject({ signals: [] })
    expect(
      await (
        await rpcAs(ADMIN, 'GMAccountSignalSummaries', {
          accountStatus: ['FLAGGED']
        })
      ).json()
    ).toMatchObject({
      signals: [{ accountAddress: `identity:${PLAYER}`, score: 0 }]
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMAccountSignalSummaries', {
          accountAddress: `identity:${PLAYER}`,
          accountStatus: ['ACTIVE'],
          createdBefore: '2000-01-01T00:00:00.000Z'
        })
      ).json()
    ).toMatchObject({
      signals: [{ accountAddress: `identity:${PLAYER}` }]
    })
  })

  it('inspects authoritative matches with staff-only replay access and source filters', async () => {
    await seedReport()
    expect((await rpcAs(PLAYER, 'GMListMatches', { req: {} })).status).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMListMatches', {
      page: {
        pageSize: 10,
        sort: [{ column: 'ended_at', order: 'DESC' }]
      },
      req: {
        accountAddress: `identity:${PLAYER}`,
        modes: ['RANKED_CONSTRUCTED'],
        statuses: ['COMPLETED'],
        min_duration: '10m',
        max_duration: '20m',
        reviewed: false
      }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      page: { pageSize: 10, hasBefore: false, hasAfter: false },
      res: [
        {
          reviewed: false,
          duration: 900,
          match: {
            id: 901,
            status: 'COMPLETED',
            replayID: 'staff-report-replay',
            player1: { address: `identity:${ADMIN}` },
            player2: { address: `identity:${PLAYER}` },
            turnNonce: 8
          }
        }
      ]
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMListMatches', {
          req: { reviewed: true }
        })
      ).json()
    ).toMatchObject({ res: [] })
    expect(
      (
        await rpcAs(ADMIN, 'GMListMatches', {
          req: { min_duration: 'ten minutes' }
        })
      ).status
    ).toBe(400)
  })

  it('requires moderation-write permission and audits match review transitions', async () => {
    await seedReport()
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, 'GMSetReviewed', {
          matchId: 901,
          reviewed: true
        })
      ).status
    ).toBe(403)
    await grantModerationWrite()
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetReviewed', {
          matchId: 901,
          reviewed: true
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await (
        await rpcAs(ADMIN, 'GMListMatches', { req: { reviewed: true } })
      ).json()
    ).toMatchObject({ res: [{ reviewed: true, match: { id: 901 } }] })
    // Idempotent retries update the reviewer timestamp but do not fabricate a
    // second state-transition audit row.
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetReviewed', {
          matchId: 901,
          reviewed: true
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetReviewed', {
          matchId: 901,
          reviewed: false
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT previous_reviewed, reviewed, actor_user_id
         FROM match_review_audit WHERE match_id = 901 ORDER BY id ASC`
      ).all()
    ).toMatchObject({
      results: [
        { previous_reviewed: 0, reviewed: 1, actor_user_id: ADMIN },
        { previous_reviewed: 1, reviewed: 0, actor_user_id: ADMIN }
      ]
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMListMatches', { req: { reviewed: true } })
      ).json()
    ).toMatchObject({ res: [] })
    expect(
      (
        await rpcAs(ADMIN, 'GMSetReviewed', {
          matchId: 999999,
          reviewed: true
        })
      ).status
    ).toBe(404)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM match_review_audit WHERE match_id = 901`
      ).run()
    ).rejects.toThrow('match review audit rows are immutable')
  })

  it('lists pending Gold while counting all recent delivered card quantities', async () => {
    const deliverAt = await seedGoldDeliveries()
    expect((await rpcAs(PLAYER, 'GMListPendingCards')).status).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMListPendingCards', {
      page: {
        pageSize: 50,
        sort: [{ column: 'mint_at', order: 'DESC' }]
      }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      page: { pageSize: 50, hasBefore: false, hasAfter: false },
      response: [
        {
          account: {
            address: `identity:${PLAYER}`,
            name: 'Staff Player'
          },
          mintAt: deliverAt,
          cardsWonLastDay: 3,
          cardsWonLastWeek: 3
        }
      ]
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMListPendingCards', {
          page: { sort: [{ column: 'primary_email', order: 'ASC' }] }
        })
      ).status
    ).toBe(400)
  })

  it('lists all configured banners for staff while players see only active rows', async () => {
    const now = Date.now()
    await env.AUTH_DB.prepare(
      `INSERT INTO content_banners
         (order_by, banner_type, message, dismissable, start_at, end_at)
       VALUES (3, 'INFO', 'Expired', 1, ?, ?),
              (2, 'WARNING', 'Active', 0, ?, ?),
              (1, 'INFO', 'Scheduled', 1, ?, ?)`
    )
      .bind(
        new Date(now - 2_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now + 1_000).toISOString(),
        new Date(now + 1_000).toISOString(),
        new Date(now + 2_000).toISOString()
      )
      .run()
    expect((await rpcAs(PLAYER, 'GMListBanners')).status).toBe(403)
    await grantAdmin()
    expect(await (await rpcAs(ADMIN, 'GMListBanners')).json()).toMatchObject({
      banners: [{ msg: 'Expired' }, { msg: 'Active' }, { msg: 'Scheduled' }]
    })
    expect(await (await rpcAs(PLAYER, 'GetBanners')).json()).toMatchObject({
      banners: [{ msg: 'Active' }]
    })
  })

  it('lists one-time notification templates newest first without player delivery rows', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO content_notification_templates
         (name, data_json, filter_json, valid_from, expires_at,
          created_at, updated_at, updated_by_user_id)
       VALUES ('Older', '{"title":"Welcome"}',
               '{"age":[{">":"0h"}]}', NULL, NULL, ?, ?, ?),
              ('Newer', '["a","b"]', NULL, ?, ?, ?, ?, ?)`
    )
      .bind(
        now,
        now,
        ADMIN,
        '2026-08-13T00:00:00.000Z',
        '2026-08-14T00:00:00.000Z',
        now,
        now,
        ADMIN
      )
      .run()
    expect((await rpcAs(PLAYER, 'GMListOneTimeNotifications')).status).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMListOneTimeNotifications')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      res: [
        {
          name: 'Newer',
          data: ['a', 'b'],
          validFrom: '2026-08-13T00:00:00.000Z',
          expiresAt: '2026-08-14T00:00:00.000Z',
          updatedBy: expect.any(Number)
        },
        {
          name: 'Older',
          data: { title: 'Welcome' },
          filter: { age: [{ '>': '0h' }] }
        }
      ]
    })
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM player_notifications`
        ).first<{ count: number }>()
      )?.count
    ).toBe(0)
  })

  it('lists source-shaped SkyPass definitions in source order for staff', async () => {
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, is_infinite)
       VALUES (2, 999, 1, 500, 0, 1,
               '{"tokenIDs":[2],"unlockDeckClasses":["AGY"]}', ?, 0),
              (1, 999, 2, 403, 1, 0, NULL, ?, 0),
              (2, 999, 1, 300, 1, 0,
               '{"cardSetsExcluded":["HEXBOUND_INVASION"]}', ?, 1)`
    )
      .bind(
        '2026-08-12T00:00:00.000Z',
        '2026-08-12T00:00:00.000Z',
        '2026-08-12T00:00:00.000Z'
      )
      .run()
    expect(
      (await rpcAs(PLAYER, 'GMListSkypassRewards', { season: 999 })).status
    ).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMListSkypassRewards', {
      season: 999
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      rewards: [
        expect.objectContaining({
          level: 1,
          tier: 'PREMIUM',
          itemType: 'SW_CONQUEST_TICKET',
          isStarter: false,
          claimable: false,
          claimed: false
        }),
        expect.objectContaining({
          level: 2,
          tier: 'FREE',
          itemType: 'SW_BASE_CARDS',
          isStarter: false,
          isInfinite: true
        }),
        expect.objectContaining({
          level: 2,
          tier: 'FREE',
          itemType: 'SW_HERO',
          isStarter: true,
          attributes: expect.objectContaining({ tokenIDs: [2] })
        })
      ]
    })
  })

  it('reads optional premium entitlements without creating or requiring wallets', async () => {
    const season = seasonFromDate()
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_skypass_season_stats
         (user_id, season, has_premium, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`
    )
      .bind(PLAYER, season, now, now)
      .run()
    expect(
      (
        await rpcAs(PLAYER, 'GMHasSkypassPremium', {
          address: `identity:${PLAYER}`
        })
      ).status
    ).toBe(403)
    await grantAdmin()
    expect(
      await (
        await rpcAs(ADMIN, 'GMHasSkypassPremium', {
          address: `identity:${PLAYER}`
        })
      ).json()
    ).toEqual({ has: true })
    expect(
      await (
        await rpcAs(ADMIN, 'GMHasSkypassPremium', {
          address: `identity:${ADMIN}`
        })
      ).json()
    ).toEqual({ has: false })
    expect(
      await (await rpcAs(PLAYER, 'ListSkypassRewards', { season })).json()
    ).toMatchObject({ res: { hasPremium: true } })
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM player_skypass_season_stats`
        ).first<{ count: number }>()
      )?.count
    ).toBe(1)
  })

  it('paginates event-2 Conquest treasure progress using source thresholds', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquest_points
           (user_id, event_id, current_points, total_points, updated_at)
         VALUES (?, 2, 500, 700, ?)`
      ).bind(ADMIN, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquest_points
           (user_id, event_id, current_points, total_points, updated_at)
         VALUES (?, 2, 900, 1000, ?)`
      ).bind(PLAYER, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquest_points
           (user_id, event_id, current_points, total_points, updated_at)
         VALUES (?, 3, 99999, 99999, ?)`
      ).bind(PLAYER, now)
    ])
    expect(
      (await rpcAs(PLAYER, 'GMListConquestV2AccountTreasureProgress')).status
    ).toBe(403)
    await grantAdmin()
    const first = await rpcAs(
      ADMIN,
      'GMListConquestV2AccountTreasureProgress',
      { page: { pageSize: 1 } }
    )
    expect(first.status).toBe(200)
    const firstBody = (await first.json()) as {
      page: { after: string }
      data: unknown[]
    }
    expect(firstBody).toMatchObject({
      page: { pageSize: 1, hasBefore: true, hasAfter: false },
      data: [
        {
          accountName: 'Staff Player',
          progress: {
            treasureLevel: 2,
            treasurePoints: 150,
            treasurePointsRequired: 600
          }
        }
      ]
    })
    const second = await rpcAs(
      ADMIN,
      'GMListConquestV2AccountTreasureProgress',
      { page: { pageSize: 1, after: firstBody.page.after } }
    )
    expect(await second.json()).toMatchObject({
      page: { hasBefore: false, hasAfter: true },
      data: [
        {
          accountName: 'Staff Admin',
          progress: {
            treasureLevel: 1,
            treasurePoints: 250,
            treasurePointsRequired: 250
          }
        }
      ]
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMListConquestV2AccountTreasureProgress', {
          page: { sort: [{ column: 'account_name', order: 'ASC' }] }
        })
      ).status
    ).toBe(400)
  })

  it('requires content-write permission and audits banner mutations atomically', async () => {
    await grantAdmin()
    const request = {
      order: 3,
      bannerType: 'WARNING',
      msg: '<strong>Maintenance</strong>',
      dismissable: true,
      color: '#bc4918',
      link: 'https://cloudweasel.example/status',
      startAt: '2026-08-12T10:00:00.000Z',
      endAt: '2026-08-12T11:00:00.000Z'
    }
    expect(
      (await rpcAs(ADMIN, 'GMAddBanner', { bannersRequest: request })).status
    ).toBe(403)
    await grantContentWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMAddBanner', {
          bannersRequest: { ...request, link: 'javascript:alert(1)' }
        })
      ).status
    ).toBe(400)
    expect(
      await (
        await rpcAs(ADMIN, 'GMAddBanner', { bannersRequest: request })
      ).json()
    ).toEqual({ status: true })
    const added = await env.AUTH_DB.prepare(
      `SELECT id FROM content_banners WHERE message = ?`
    )
      .bind(request.msg)
      .first<{ id: number }>()
    expect(added).not.toBeNull()
    const modified = {
      id: added!.id,
      order: 4,
      type: 'EMERGENCY',
      msg: '<strong>Extended maintenance</strong>',
      dismissable: false,
      color: '#a9094c',
      startAt: request.startAt,
      endAt: '2026-08-12T12:00:00.000Z'
    }
    expect(
      await (await rpcAs(ADMIN, 'GMModifyBanner', { banner: modified })).json()
    ).toEqual({ status: true })
    expect(
      await (await rpcAs(ADMIN, 'GMRemoveBanner', { id: added!.id })).json()
    ).toEqual({ status: true })
    const audits = await env.AUTH_DB.prepare(
      `SELECT action, target_id, actor_user_id, before_json, after_json
         FROM staff_content_audit
         WHERE target_type = 'BANNER' AND target_id = ? ORDER BY id ASC`
    )
      .bind(String(added!.id))
      .all<{
        action: string
        target_id: string
        actor_user_id: string
        before_json: string | null
        after_json: string | null
      }>()
    expect(audits).toMatchObject({
      results: [
        { action: 'ADD', actor_user_id: ADMIN, before_json: null },
        { action: 'MODIFY', actor_user_id: ADMIN },
        { action: 'REMOVE', actor_user_id: ADMIN, after_json: null }
      ]
    })
    expect(JSON.parse(audits.results[0].after_json!)).toMatchObject({
      dismissable: true
    })
    expect(JSON.parse(audits.results[1].after_json!)).toMatchObject({
      dismissable: false
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_content_audit SET action = 'ADD'
         WHERE target_type = 'BANNER' AND target_id = ?`
      )
        .bind(String(added!.id))
        .run()
    ).rejects.toThrow('staff content audit rows are immutable')
  })

  it('validates and audits featured streamer mutations', async () => {
    await grantAdmin()
    await grantContentWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMAddFeaturedStreamer', {
          streamer: { username: 'bad/name' }
        })
      ).status
    ).toBe(400)
    expect(
      await (
        await rpcAs(ADMIN, 'GMAddFeaturedStreamer', {
          streamer: { username: 'cloud_weasel' }
        })
      ).json()
    ).toEqual({ status: true })
    expect(await (await rpcAs(PLAYER, 'GetFeaturedStreamers')).json()).toEqual({
      streamers: [{ username: 'cloud_weasel' }]
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMRemoveFeaturedStreamer', {
          streamer: { username: 'cloud_weasel' }
        })
      ).json()
    ).toEqual({ status: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT action, actor_user_id FROM staff_content_audit
         WHERE target_type = 'FEATURED_STREAMER'
           AND target_id = 'cloud_weasel' ORDER BY id ASC`
      ).all()
    ).toMatchObject({
      results: [
        { action: 'ADD', actor_user_id: ADMIN },
        { action: 'REMOVE', actor_user_id: ADMIN }
      ]
    })
  })

  it('creates, updates, and deletes notification templates with immutable audits', async () => {
    await grantAdmin()
    const notification = {
      id: 999,
      name: 'ONE_TIME_NOTIF',
      data: { title: 'Cloud Weasel', buttonPath: '/play' },
      filter: { age: [{ '>': '0h' }] },
      createdAt: '2000-01-01T00:00:00.000Z',
      validFrom: '2026-08-12T10:00:00.000Z',
      expiresAt: '2026-08-12T11:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
      updatedBy: 0
    }
    expect(
      (await rpcAs(ADMIN, 'GMCreateOneTimeNotification', { notification }))
        .status
    ).toBe(403)
    await grantContentWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMCreateOneTimeNotification', {
          notification: {
            ...notification,
            filter: { arbitrary: [{ '==': true }] }
          }
        })
      ).status
    ).toBe(400)
    const created = await rpcAs(ADMIN, 'GMCreateOneTimeNotification', {
      notification
    })
    expect(created.status).toBe(200)
    const createdTemplate = (
      (await created.json()) as { res: typeof notification }
    ).res
    expect(createdTemplate).toMatchObject({
      id: expect.any(Number),
      name: notification.name,
      data: notification.data,
      filter: notification.filter,
      updatedBy: expect.any(Number)
    })
    expect(createdTemplate.id).not.toBe(notification.id)
    expect(createdTemplate.createdAt).not.toBe(notification.createdAt)
    const updated = {
      ...createdTemplate,
      name: 'ONE_TIME_UPDATED',
      data: { title: 'Updated' },
      filter: { address: [{ '==': `identity:${PLAYER}` }] }
    }
    expect(
      await (
        await rpcAs(ADMIN, 'GMUpdateOneTimeNotification', {
          notification: updated
        })
      ).json()
    ).toMatchObject({
      res: {
        id: createdTemplate.id,
        name: 'ONE_TIME_UPDATED',
        data: { title: 'Updated' },
        createdAt: createdTemplate.createdAt,
        updatedBy: expect.any(Number)
      }
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMDeleteOneTimeNotification', {
          id: createdTemplate.id
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM player_notifications`
        ).first<{ count: number }>()
      )?.count
    ).toBe(0)
    const audits = await env.AUTH_DB.prepare(
      `SELECT action, actor_user_id, before_json, after_json
       FROM staff_notification_template_audit
       WHERE template_id = ? ORDER BY id ASC`
    )
      .bind(createdTemplate.id)
      .all()
    expect(audits).toMatchObject({
      results: [
        { action: 'CREATE', actor_user_id: ADMIN, before_json: null },
        { action: 'UPDATE', actor_user_id: ADMIN },
        { action: 'DELETE', actor_user_id: ADMIN, after_json: null }
      ]
    })
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_notification_template_audit
         WHERE template_id = ?`
      )
        .bind(createdTemplate.id)
        .run()
    ).rejects.toThrow('staff notification audit rows are immutable')
  })
})
