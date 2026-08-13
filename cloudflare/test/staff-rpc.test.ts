import { env } from 'cloudflare:workers'
import { ActionType, QuestPeriodicity } from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { AccountActionsRepository } from '../src/account-actions'
import { allLibraryCards } from '../src/card-library'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository, STARTER_CARDS } from '../src/player'
import { seasonFromDate } from '../src/legacy-seasons'
import { questPeriodAt } from '../src/quest-library'
import {
  clearTestSkypassPolicies,
  createTestSkypassPolicy
} from './helpers/skypass-policy'

const testEnv = env as unknown as Env
const ADMIN = 'staff-admin'
const PLAYER = 'staff-player'

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  signedIn = true,
  extraHeaders: Record<string, string> = {}
) => {
  const headers = new Headers({
    'content-type': 'application/json',
    ...extraHeaders
  })
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

const levelGrantHeaders = (operationKey = crypto.randomUUID()) => ({
  'x-cloud-weasel-operation-key': operationKey
})

const skypassToggleHeaders = levelGrantHeaders

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM skypass_giveaway_limits'),
    env.AUTH_DB.prepare('DELETE FROM staff_entitlement_permissions'),
    env.AUTH_DB.prepare('DELETE FROM staff_progression_permissions'),
    env.AUTH_DB.prepare('DELETE FROM staff_player_support_permissions'),
    env.AUTH_DB.prepare('DELETE FROM staff_account_action_permissions'),
    env.AUTH_DB.prepare('DELETE FROM staff_game_mode_permissions'),
    env.AUTH_DB.prepare('DELETE FROM match_reviews'),
    env.AUTH_DB.prepare('DELETE FROM staff_moderation_permissions'),
    env.AUTH_DB.prepare('DELETE FROM player_account_reports'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM content_notification_templates'),
    env.AUTH_DB.prepare('DELETE FROM content_featured_streamers'),
    env.AUTH_DB.prepare('DELETE FROM content_banners'),
    env.AUTH_DB.prepare('DELETE FROM users'),
    env.AUTH_DB.prepare(
      `UPDATE game_mode_status
       SET enabled = CASE
         WHEN game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
           THEN 0
         ELSE 1
       END,
       updated_by_user_id = 'system:test-reset',
       updated_at = ?`
    ).bind(new Date().toISOString())
  ])
  await clearTestSkypassPolicies(env.AUTH_DB, [999])
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

const grantGameModeWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_game_mode_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantAccountActionWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_account_action_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantPlayerSupportWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_player_support_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantProgressionWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_progression_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantEntitlementWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_entitlement_permissions
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

  it('gates and audits forced account renames and warm-up corrections', async () => {
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, 'GMRenameAccount', {
          accountAddress: `identity:${PLAYER}`,
          newName: 'CloudPlayer'
        })
      ).status
    ).toBe(403)
    for (const [method, body] of [
      ['GMUnlockAllBaseCards', { accountAddress: `identity:${PLAYER}` }],
      [
        'GMSetWarmupGamesCompleted',
        { accountAddress: `identity:${PLAYER}`, numGamesCompleted: 3 }
      ],
      ['GMResetStarterDecks', { address: `identity:${PLAYER}` }]
    ] as const) {
      expect((await rpcAs(ADMIN, method, body)).status).toBe(403)
    }
    await grantPlayerSupportWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMRenameAccount', {
          accountAddress: `identity:${PLAYER}`,
          newName: 'bad name'
        })
      ).status
    ).toBe(400)
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings SET name = 'StaffAdmin'
       WHERE user_id = ?`
    )
      .bind(ADMIN)
      .run()
    expect(
      (
        await rpcAs(ADMIN, 'GMRenameAccount', {
          accountAddress: `identity:${PLAYER}`,
          newName: 'StaffAdmin'
        })
      ).status
    ).toBe(409)

    const lockedUntil = '2026-09-01T12:00:00.000Z'
    const renamed = await rpcAs(ADMIN, 'GMRenameAccount', {
      oldName: 'Staff Player',
      newName: 'CloudPlayer',
      lockedUntil
    })
    expect(renamed.status).toBe(200)
    expect(await renamed.json()).toMatchObject({
      account: {
        address: `identity:${PLAYER}`,
        name: 'CloudPlayer',
        warmUps: 0,
        settings: { renameLockedUntil: lockedUntil }
      }
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMSetWarmupGamesCompleted', {
          accountAddress: `identity:${PLAYER}`,
          numGamesCompleted: 4
        })
      ).status
    ).toBe(400)
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetWarmupGamesCompleted', {
          accountAddress: `identity:${PLAYER}`,
          numGamesCompleted: 3
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await (
        await rpcAs(ADMIN, 'GMFindAccount', {
          accountAddress: `identity:${PLAYER}`
        })
      ).json()
    ).toMatchObject({ account: { name: 'CloudPlayer', warmUps: 3 } })

    const audits = await env.AUTH_DB.prepare(
      `SELECT operation, target_user_id, actor_user_id, before_json, after_json
       FROM staff_player_support_audit
       WHERE target_user_id = ? ORDER BY id ASC`
    )
      .bind(PLAYER)
      .all<{
        operation: string
        target_user_id: string
        actor_user_id: string
        before_json: string
        after_json: string
      }>()
    expect(audits.results.map(row => row.operation)).toEqual([
      'RENAME_ACCOUNT',
      'SET_WARMUPS'
    ])
    expect(audits.results[0]).toMatchObject({
      target_user_id: PLAYER,
      actor_user_id: ADMIN
    })
    expect(JSON.parse(audits.results[0].before_json)).toMatchObject({
      name: 'Staff Player'
    })
    expect(JSON.parse(audits.results[1].after_json)).toEqual({ warmUps: 3 })
  })

  it('repairs starter decks and unlocks source-library base cards atomically', async () => {
    const repairPlayer = 'staff-repair-player'
    const createdAt = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Repair Player', 'repair-player@example.com', ?, ?)`
    )
      .bind(repairPlayer, createdAt, createdAt)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(repairPlayer)
    await grantAdmin()
    await grantPlayerSupportWrite()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `DELETE FROM player_decks WHERE user_id = ? AND prism = 'agility'`
      ).bind(repairPlayer),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_HERO', 2, 1, 1, 'test', ?, ?)`
      ).bind(repairPlayer, createdAt, createdAt)
    ])

    expect(
      await (
        await rpcAs(ADMIN, 'GMResetStarterDecks', {
          address: `identity:${repairPlayer}`
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT deck_type, is_new FROM player_decks
         WHERE user_id = ? AND prism = 'agility'`
      )
        .bind(repairPlayer)
        .first()
    ).toEqual({ deck_type: 'UNLOCKED_STARTER', is_new: 1 })
    const agilityCards = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (
           SELECT value FROM json_each((
             SELECT card_ids FROM player_decks
             WHERE user_id = ? AND prism = 'agility'
           ))
         ) AND balance > 0`
    )
      .bind(repairPlayer, repairPlayer)
      .first<{ count: number }>()
    expect(agilityCards?.count).toBe(30)

    const starterCardIds = new Set<number>(STARTER_CARDS.map(([id]) => id))
    const nonStarterCard = allLibraryCards().find(
      card => !starterCardIds.has(card.id)
    )!
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_SILVER_CARDS', ?, 1, 1, 'test', ?, ?)`
    )
      .bind(
        repairPlayer,
        nonStarterCard.id,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run()
    expect(
      await (
        await rpcAs(ADMIN, 'GMUnlockAllBaseCards', {
          accountAddress: `identity:${repairPlayer}`
        })
      ).json()
    ).toEqual({ ok: true })
    const libraryCount = allLibraryCards().length
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(DISTINCT token_id) AS count FROM player_items
         WHERE user_id = ? AND balance > 0
           AND item_type IN ('SW_BASE_CARDS', 'SW_SILVER_CARDS',
                             'SW_GOLD_CARDS')`
      )
        .bind(repairPlayer)
        .first()
    ).toEqual({ count: libraryCount })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT 1 FROM player_items
         WHERE user_id = ? AND item_type = 'SW_BASE_CARDS' AND token_id = ?`
      )
        .bind(repairPlayer, nonStarterCard.id)
        .first()
    ).toBeNull()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT operation FROM staff_player_support_audit
         WHERE target_user_id = ? ORDER BY id ASC`
      )
        .bind(repairPlayer)
        .all()
    ).toMatchObject({
      results: [
        { operation: 'RESET_STARTER_DECKS' },
        { operation: 'UNLOCK_ALL_BASE_CARDS' }
      ]
    })
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_player_support_audit WHERE target_user_id = ?`
      )
        .bind(repairPlayer)
        .run()
    ).rejects.toThrow('staff player support audit rows are immutable')
  })

  it('replaces the grant-cards contract mint with an idempotent off-chain grant', async () => {
    const grantPlayer = 'operator-card-grant-player'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Grant Player', 'grant-player@example.com', ?, ?)`
    )
      .bind(grantPlayer, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(grantPlayer)
    await grantAdmin()

    const request = {
      accountAddress: `identity:${grantPlayer}`,
      prism: 'str',
      requestKey: 'operator-grant-strength-1'
    }
    expect((await rpcAs(ADMIN, 'GMGrantBaseCards', request)).status).toBe(403)
    await grantPlayerSupportWrite()

    const strengthCards = allLibraryCards().filter(card => card.class === 'STR')
    const strengthCardIdsJson = JSON.stringify(
      strengthCards.map(card => card.id)
    )
    const beforeGrant = await env.AUTH_DB.prepare(
      `SELECT token_id, balance FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))`
    )
      .bind(grantPlayer, strengthCardIdsJson)
      .all<{ token_id: number; balance: number }>()
    const beforeBalance = new Map(
      beforeGrant.results.map(item => [item.token_id, item.balance])
    )

    const first = await rpcAs(ADMIN, 'GMGrantBaseCards', request)
    expect(first.status).toBe(200)
    const result = await first.json<{
      ok: boolean
      prism: string
      grantedCardCount: number
      cardIds: number[]
    }>()
    expect(result).toEqual({
      ok: true,
      prism: 'strength',
      grantedCardCount: strengthCards.length,
      cardIds: strengthCards.map(card => card.id)
    })

    const inventory = await env.AUTH_DB.prepare(
      `SELECT token_id, balance, unlock_source FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))
       ORDER BY token_id`
    )
      .bind(grantPlayer, strengthCardIdsJson)
      .all<{ token_id: number; balance: number; unlock_source: string }>()
    expect(inventory.results).toHaveLength(strengthCards.length)
    expect(
      inventory.results.every(
        item => item.balance === (beforeBalance.get(item.token_id) ?? 0) + 1
      )
    ).toBe(true)
    expect(
      inventory.results.every(item =>
        item.unlock_source.startsWith('operator-card-grant:')
      )
    ).toBe(true)
    const grantEvidence = await env.AUTH_DB.prepare(
      `SELECT inventory_grant.token_id, inventory_grant.quantity,
              inventory_grant.before_balance, inventory_grant.after_balance
       FROM player_operator_card_grant_inventory_grants inventory_grant
       JOIN player_operator_card_grants grant_receipt
         ON grant_receipt.id = inventory_grant.operator_grant_id
       WHERE grant_receipt.actor_user_id = ?
         AND grant_receipt.request_key = ?
       ORDER BY inventory_grant.token_id`
    )
      .bind(ADMIN, request.requestKey)
      .all<{
        token_id: number
        quantity: number
        before_balance: number
        after_balance: number
      }>()
    expect(grantEvidence.results).toHaveLength(strengthCards.length)
    expect(
      grantEvidence.results.every(
        grant =>
          grant.quantity === 1 &&
          grant.before_balance === (beforeBalance.get(grant.token_id) ?? 0) &&
          grant.after_balance === grant.before_balance + 1
      )
    ).toBe(true)

    const retry = await rpcAs(ADMIN, 'GMGrantBaseCards', request)
    expect(await retry.json()).toEqual(result)
    const afterRetry = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count, SUM(balance) AS balance
       FROM player_items WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))`
    )
      .bind(grantPlayer, strengthCardIdsJson)
      .first<{ count: number; balance: number }>()
    expect(afterRetry).toEqual({
      count: strengthCards.length,
      balance:
        strengthCards.length +
        [...beforeBalance.values()].reduce(
          (total, balance) => total + balance,
          0
        )
    })

    const collision = await rpcAs(ADMIN, 'GMGrantBaseCards', {
      ...request,
      prism: 'wisdom'
    })
    expect(collision.status).toBe(409)
    const invalidPrism = await rpcAs(ADMIN, 'GMGrantBaseCards', {
      ...request,
      requestKey: 'operator-grant-invalid-1',
      prism: 'unknown'
    })
    expect(invalidPrism.status).toBe(400)

    const wisdomCards = allLibraryCards().filter(card => card.class === 'WIS')
    const wisdomIdsJson = JSON.stringify(wisdomCards.map(card => card.id))
    const wisdomBefore = await env.AUTH_DB.prepare(
      `SELECT COALESCE(SUM(balance), 0) AS balance FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))`
    )
      .bind(grantPlayer, wisdomIdsJson)
      .first<{ balance: number }>()
    const concurrentRequest = {
      accountAddress: `identity:${grantPlayer}`,
      prism: 'wis',
      requestKey: 'operator-grant-wisdom-concurrent'
    }
    const concurrent = await Promise.all([
      rpcAs(ADMIN, 'GMGrantBaseCards', concurrentRequest),
      rpcAs(ADMIN, 'GMGrantBaseCards', concurrentRequest)
    ])
    expect(concurrent.map(response => response.status)).toEqual([200, 200])
    const wisdomAfter = await env.AUTH_DB.prepare(
      `SELECT COALESCE(SUM(balance), 0) AS balance FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))`
    )
      .bind(grantPlayer, wisdomIdsJson)
      .first<{ balance: number }>()
    expect(wisdomAfter!.balance - wisdomBefore!.balance).toBe(
      wisdomCards.length
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_operator_card_grants
         WHERE actor_user_id = ? AND request_key = ?`
      )
        .bind(ADMIN, concurrentRequest.requestKey)
        .first()
    ).toEqual({ count: 1 })

    const receipt = await env.AUTH_DB.prepare(
      `SELECT user_id, actor_user_id, prism, granted_card_count,
              application_status, completed_at IS NOT NULL AS completed
       FROM player_operator_card_grants
       WHERE actor_user_id = ? AND request_key = ?`
    )
      .bind(ADMIN, request.requestKey)
      .first()
    expect(receipt).toEqual({
      user_id: grantPlayer,
      actor_user_id: ADMIN,
      prism: 'strength',
      granted_card_count: strengthCards.length,
      application_status: 'APPLIED',
      completed: 1
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_operator_card_grants SET prism = 'all'
         WHERE actor_user_id = ? AND request_key = ?`
      )
        .bind(ADMIN, request.requestKey)
        .run()
    ).rejects.toThrow('Operator card grant receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_operator_card_grant_inventory_grants
         SET after_balance = after_balance + 1
         WHERE operator_grant_id = (
           SELECT id FROM player_operator_card_grants
           WHERE actor_user_id = ? AND request_key = ?
         )`
      )
        .bind(ADMIN, request.requestKey)
        .run()
    ).rejects.toThrow('Operator card inventory grants are immutable')

    const incompleteDeliveryKey = crypto.randomUUID()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_operator_card_grants
         (request_key, delivery_key, user_id, actor_user_id, prism,
          card_ids_json, granted_card_count, created_at, application_status)
       VALUES ('operator-grant-incomplete', ?, ?, ?, 'strength', '[2]', 1,
               ?, 'PREPARING')`
    )
      .bind(incompleteDeliveryKey, grantPlayer, ADMIN, now)
      .run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_operator_card_grants
         SET application_status = 'APPLIED', completed_at = created_at
         WHERE delivery_key = ?`
      )
        .bind(incompleteDeliveryKey)
        .run()
    ).rejects.toThrow('Operator card grant receipt completion is invalid')

    const failedRequest = {
      accountAddress: `identity:${grantPlayer}`,
      prism: 'agility',
      requestKey: 'operator-grant-agility-failure'
    }
    const agilityIdsJson = JSON.stringify(
      allLibraryCards()
        .filter(card => card.class === 'AGY')
        .map(card => card.id)
    )
    const agilityBefore = await env.AUTH_DB.prepare(
      `SELECT COALESCE(SUM(balance), 0) AS balance
       FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))`
    )
      .bind(grantPlayer, agilityIdsJson)
      .first<{ balance: number }>()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_operator_card_grant_completion
       BEFORE UPDATE OF application_status ON player_operator_card_grants
       WHEN NEW.request_key = 'operator-grant-agility-failure'
         AND NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected operator card grant failure');
       END`
    ).run()
    const failed = await rpcAs(ADMIN, 'GMGrantBaseCards', failedRequest)
    expect(failed.status).toBe(500)
    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_operator_card_grant_completion'
    ).run()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_operator_card_grants
            WHERE actor_user_id = ? AND request_key = ?) AS receipts,
           (SELECT COUNT(*)
            FROM player_operator_card_grant_inventory_grants inventory_grant
            JOIN player_operator_card_grants grant_receipt
              ON grant_receipt.id = inventory_grant.operator_grant_id
            WHERE grant_receipt.actor_user_id = ?
              AND grant_receipt.request_key = ?) AS grants,
           (SELECT COALESCE(SUM(balance), 0) FROM player_items
            WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
              AND token_id IN (SELECT value FROM json_each(?))) AS balance`
      )
        .bind(
          ADMIN,
          failedRequest.requestKey,
          ADMIN,
          failedRequest.requestKey,
          grantPlayer,
          agilityIdsJson
        )
        .first()
    ).toEqual({
      receipts: 0,
      grants: 0,
      balance: agilityBefore!.balance
    })
    const recovered = await rpcAs(ADMIN, 'GMGrantBaseCards', failedRequest)
    expect(recovered.status).toBe(200)
    expect(await recovered.json()).toMatchObject({
      ok: true,
      prism: 'agility',
      grantedCardCount: allLibraryCards().filter(card => card.class === 'AGY')
        .length
    })
    const agilityAfter = await env.AUTH_DB.prepare(
      `SELECT COALESCE(SUM(balance), 0) AS balance
       FROM player_items
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS'
         AND token_id IN (SELECT value FROM json_each(?))`
    )
      .bind(grantPlayer, agilityIdsJson)
      .first<{ balance: number }>()
    expect(agilityAfter!.balance - agilityBefore!.balance).toBe(
      allLibraryCards().filter(card => card.class === 'AGY').length
    )
  })

  it('gates, scopes, and immutably audits quest support repairs', async () => {
    await grantAdmin()
    const playerQuest = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? AND status = 'active' ORDER BY rowid ASC LIMIT 1`
    )
      .bind(PLAYER)
      .first<{ id: number }>()
    const adminQuest = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? ORDER BY rowid ASC LIMIT 1`
    )
      .bind(ADMIN)
      .first<{ id: number }>()
    expect(playerQuest).not.toBeNull()
    expect(adminQuest).not.toBeNull()

    expect(
      (
        await rpcAs(ADMIN, 'GMCompleteQuest', {
          accountAddress: `identity:${PLAYER}`,
          id: playerQuest!.id
        })
      ).status
    ).toBe(403)
    expect(
      (
        await rpcAs(ADMIN, 'GMResetQuestReRolls', {
          accountAddress: `identity:${PLAYER}`,
          periodicity: 'DAILY'
        })
      ).status
    ).toBe(403)
    expect(
      (
        await rpcAs(PLAYER, 'GMDeleteQuest', {
          accountAddress: `identity:${PLAYER}`,
          id: playerQuest!.id
        })
      ).status
    ).toBe(403)
    await grantPlayerSupportWrite()

    // A quest ID never authorizes crossing the explicitly selected account.
    expect(
      (
        await rpcAs(ADMIN, 'GMCompleteQuest', {
          accountAddress: `identity:${PLAYER}`,
          id: adminQuest!.id
        })
      ).status
    ).toBe(500)
    expect(
      (
        await rpcAs(ADMIN, 'GMCompleteQuest', {
          accountAddress: `identity:${PLAYER}`,
          id: 0
        })
      ).status
    ).toBe(400)

    const completed = await rpcAs(ADMIN, 'GMCompleteQuest', {
      accountAddress: `identity:${PLAYER}`,
      id: playerQuest!.id
    })
    expect(completed.status).toBe(200)
    expect(await completed.json()).toEqual({ ok: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, progress, target FROM player_quests WHERE rowid = ?`
      )
        .bind(playerQuest!.id)
        .first()
    ).toMatchObject({ status: 'complete' })

    // The source only changes status; it does not synthesize progress/rewards.
    const completedAuditCount = async () =>
      (await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_quest_support_audit
           WHERE operation = 'COMPLETE_QUEST' AND target_user_id = ?`
      )
        .bind(PLAYER)
        .first<{ count: number }>())!.count
    expect(await completedAuditCount()).toBe(1)
    expect(
      (
        await rpcAs(ADMIN, 'GMCompleteQuest', {
          accountAddress: `identity:${PLAYER}`,
          id: playerQuest!.id
        })
      ).status
    ).toBe(200)
    expect(await completedAuditCount()).toBe(1)

    const assignments = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? ORDER BY rowid ASC LIMIT 3`
    )
      .bind(PLAYER)
      .all<{ id: number }>()
    expect(assignments.results).toHaveLength(3)
    const dailyPeriod = questPeriodAt(QuestPeriodicity.DAILY)
    const weeklyPeriod = questPeriodAt(QuestPeriodicity.WEEKLY)
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_quests
         SET periodicity = 'DAILY', period = ?, rerolls = 2 WHERE rowid = ?`
      ).bind(dailyPeriod, assignments.results[0].id),
      env.AUTH_DB.prepare(
        `UPDATE player_quests
         SET periodicity = 'WEEKLY', period = ?, rerolls = 3 WHERE rowid = ?`
      ).bind(weeklyPeriod, assignments.results[1].id),
      env.AUTH_DB.prepare(
        `UPDATE player_quests
         SET periodicity = 'DAILY', period = ?, rerolls = 4 WHERE rowid = ?`
      ).bind(dailyPeriod - 1, assignments.results[2].id)
    ])
    expect(
      (
        await rpcAs(ADMIN, 'GMResetQuestReRolls', {
          accountAddress: `identity:${PLAYER}`,
          periodicity: 'UNKNOWN'
        })
      ).status
    ).toBe(500)
    const reset = await rpcAs(ADMIN, 'GMResetQuestReRolls', {
      accountAddress: `identity:${PLAYER}`,
      periodicity: 'DAILY'
    })
    expect(reset.status).toBe(200)
    expect(await reset.json()).toEqual({ ok: true })
    expect(
      (
        await rpcAs(ADMIN, 'GMResetQuestReRolls', {
          accountAddress: `identity:${PLAYER}`,
          periodicity: 'DAILY'
        })
      ).status
    ).toBe(200)
    const rerolls = await env.AUTH_DB.prepare(
      `SELECT rowid AS id, rerolls FROM player_quests
       WHERE rowid IN (?, ?, ?) ORDER BY rowid ASC`
    )
      .bind(...assignments.results.map(row => row.id))
      .all<{ id: number; rerolls: number }>()
    expect(rerolls.results.map(row => row.rerolls)).toEqual([0, 3, 4])

    const auditRows = await env.AUTH_DB.prepare(
      `SELECT id, operation, actor_user_id, target_user_id, before_json,
              after_json
       FROM staff_quest_support_audit WHERE target_user_id = ? ORDER BY id ASC`
    )
      .bind(PLAYER)
      .all<{
        id: number
        operation: string
        actor_user_id: string
        target_user_id: string
        before_json: string
        after_json: string
      }>()
    expect(auditRows.results.map(row => row.operation)).toEqual([
      'COMPLETE_QUEST',
      'RESET_QUEST_REROLLS'
    ])
    expect(auditRows.results[1]).toMatchObject({
      actor_user_id: ADMIN,
      target_user_id: PLAYER
    })
    expect(JSON.parse(auditRows.results[1].before_json)).toMatchObject({
      periodicity: 'DAILY',
      period: dailyPeriod,
      assignments: [{ id: assignments.results[0].id, rerolls: 2 }]
    })
    expect(JSON.parse(auditRows.results[1].after_json)).toMatchObject({
      assignments: [{ id: assignments.results[0].id, rerolls: 0 }]
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_quest_support_audit SET actor_user_id = ? WHERE id = ?`
      )
        .bind(PLAYER, auditRows.results[0].id)
        .run()
    ).rejects.toThrow(/immutable/i)
    await expect(
      env.AUTH_DB.prepare(`DELETE FROM staff_quest_support_audit WHERE id = ?`)
        .bind(auditRows.results[0].id)
        .run()
    ).rejects.toThrow(/immutable/i)

    // Cloud Weasel deploys only the source production behavior: validate the
    // account, then refuse destructive quest deletion without touching D1.
    const refusedDelete = await rpcAs(ADMIN, 'GMDeleteQuest', {
      accountAddress: `identity:${PLAYER}`,
      id: playerQuest!.id
    })
    expect(refusedDelete.status).toBe(500)
    expect(await refusedDelete.json()).toMatchObject({
      msg: 'cannot delete quest in production'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT 1 AS present FROM player_quests WHERE rowid = ?`
      )
        .bind(playerQuest!.id)
        .first()
    ).toEqual({ present: 1 })
  })

  it('ports guarded level grants with source SkyPass and referral effects', async () => {
    const inviter = 'staff-progression-inviter'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Progression Inviter', 'progression-inviter@example.com', ?, ?)`
    )
      .bind(inviter, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(inviter)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_invites
         (invitee_user_id, inviter_user_id, created_at) VALUES (?, ?, ?)`
    )
      .bind(PLAYER, inviter, now)
      .run()
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, 'GMGiveLevels', {
          accountAddress: `identity:${PLAYER}`,
          levels: 3
        })
      ).status
    ).toBe(403)
    await grantProgressionWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMGiveLevels', {
          accountAddress: `identity:${PLAYER}`,
          levels: 3
        })
      ).status
    ).toBe(400)
    for (const levels of [-1, 65_536, 1.5]) {
      expect(
        (
          await rpcAs(ADMIN, 'GMGiveLevels', {
            accountAddress: `identity:${PLAYER}`,
            levels
          }, true, levelGrantHeaders())
        ).status
      ).toBe(400)
    }

    const operationKey = crypto.randomUUID()
    const [granted, duplicate] = await Promise.all(
      Array.from({ length: 2 }, () =>
        rpcAs(
          ADMIN,
          'GMGiveLevels',
          {
            accountAddress: `identity:${PLAYER}`,
            levels: 3
          },
          true,
          levelGrantHeaders(operationKey)
        )
      )
    )
    expect(granted.status).toBe(200)
    expect(await granted.json()).toEqual({ ok: true })
    expect(duplicate.status).toBe(200)
    expect(await duplicate.json()).toEqual({ ok: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT profile.level, profile.xp,
                progression.basic_skypass_level AS skypass_level,
                progression.basic_skypass_xp AS skypass_xp
         FROM player_profiles profile
         JOIN player_progression progression
           ON progression.user_id = profile.user_id
         WHERE profile.user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ level: 4, xp: 0, skypass_level: 4, skypass_xp: 0 })
    const season = seasonFromDate()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT levels, points_carried, points_spent
         FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = ?`
      )
        .bind(PLAYER, inviter, season)
        .first()
    ).toEqual({ levels: 3, points_carried: 0, points_spent: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(inviter)
        .first()
    ).toEqual({ balance: 3 })
    const ranks = await env.AUTH_DB.prepare(
      `SELECT game_mode, player_rank, player_rank_stage
       FROM player_account_stats WHERE user_id = ? AND season = ?
       ORDER BY game_mode ASC`
    )
      .bind(PLAYER, season)
      .all()
    expect(ranks.results).toEqual([
      {
        game_mode: 'RANKED_CONSTRUCTED',
        player_rank: 'WANDERER',
        player_rank_stage: 'STAGE_I'
      },
      {
        game_mode: 'RANKED_DISCOVERY',
        player_rank: 'WANDERER',
        player_rank_stage: 'STAGE_I'
      }
    ])
    const audit = await env.AUTH_DB.prepare(
      `SELECT operation, actor_user_id, target_user_id, before_json, after_json,
              operation_key
       FROM staff_progression_audit WHERE target_user_id = ? ORDER BY id ASC`
    )
      .bind(PLAYER)
      .first<{
        operation: string
        actor_user_id: string
        target_user_id: string
        before_json: string
        after_json: string
        operation_key: string
      }>()
    expect(audit).toMatchObject({
      operation: 'GIVE_LEVELS',
      actor_user_id: ADMIN,
      target_user_id: PLAYER,
      operation_key: operationKey
    })
    expect(JSON.parse(audit!.before_json)).toMatchObject({
      requestedLevels: 3,
      grantedLevels: 3,
      level: 1,
      skypassLevel: 1,
      inviterUserId: inviter
    })
    expect(JSON.parse(audit!.after_json)).toMatchObject({
      level: 4,
      skypassLevel: 4
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT operation, actor_user_id, target_user_id, requested_levels,
                granted_levels, before_level, after_level,
                inviter_levels_before, inviter_levels_after,
                inviter_stickers_before, inviter_stickers_after, status
         FROM staff_progression_operations WHERE operation_key = ?`
      )
        .bind(operationKey)
        .first()
    ).toEqual({
      operation: 'GIVE_LEVELS',
      actor_user_id: ADMIN,
      target_user_id: PLAYER,
      requested_levels: 3,
      granted_levels: 3,
      before_level: 1,
      after_level: 4,
      inviter_levels_before: 0,
      inviter_levels_after: 3,
      inviter_stickers_before: 0,
      inviter_stickers_after: 3,
      status: 'APPLIED'
    })

    // A key cannot be rebound to altered arguments, while a new key represents
    // a second deliberate operator action and therefore grants again.
    expect(
      (
        await rpcAs(
          ADMIN,
          'GMGiveLevels',
          {
            accountAddress: `identity:${PLAYER}`,
            levels: 4
          },
          true,
          levelGrantHeaders(operationKey)
        )
      ).status
    ).toBe(400)
    const secondOperationKey = crypto.randomUUID()
    expect(
      (
        await rpcAs(
          ADMIN,
          'GMGiveLevels',
          {
            accountAddress: `identity:${PLAYER}`,
            levels: 2
          },
          true,
          levelGrantHeaders(secondOperationKey)
        )
      ).status
    ).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level FROM player_profiles WHERE user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ level: 6 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT levels FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = ?`
      )
        .bind(PLAYER, inviter, season)
        .first()
    ).toEqual({ levels: 5 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(inviter)
        .first()
    ).toEqual({ balance: 5 })

    // The source accepts zero levels as a successful state no-op.
    expect(
      (
        await rpcAs(
          ADMIN,
          'GMGiveLevels',
          {
            accountAddress: `identity:${PLAYER}`,
            levels: 0
          },
          true,
          levelGrantHeaders()
        )
      ).status
    ).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_progression_audit
         WHERE target_user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ count: 2 })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_progression_operations SET completed_at = ?
         WHERE operation_key = ?`
      )
        .bind(new Date().toISOString(), operationKey)
        .run()
    ).rejects.toThrow(/completion is invalid/i)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_progression_operations WHERE operation_key = ?`
      )
        .bind(operationKey)
        .run()
    ).rejects.toThrow(/immutable/i)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_progression_audit SET actor_user_id = ? WHERE target_user_id = ?`
      )
        .bind(PLAYER, PLAYER)
        .run()
    ).rejects.toThrow(/immutable/i)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_progression_audit WHERE target_user_id = ?`
      )
        .bind(PLAYER)
        .run()
    ).rejects.toThrow(/immutable/i)

    // The completing receipt is the last statement in the grant transaction.
    // If it cannot complete, all progression, referral, and audit writes roll
    // back together and a retry remains possible.
    const failedOperationKey = '00000000-0000-4000-8000-000000000073'
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER staff_progression_test_abort_completion
       BEFORE UPDATE ON staff_progression_operations
       WHEN NEW.operation_key = '00000000-0000-4000-8000-000000000073'
         AND NEW.status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected staff progression completion failure');
       END`
    )
      .run()
    const failed = await rpcAs(
      ADMIN,
      'GMGiveLevels',
      {
        accountAddress: `identity:${PLAYER}`,
        levels: 7
      },
      true,
      levelGrantHeaders(failedOperationKey)
    )
    expect(failed.status).toBe(500)
    await env.AUTH_DB.prepare(
      'DROP TRIGGER staff_progression_test_abort_completion'
    ).run()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level FROM player_profiles WHERE user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ level: 6 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_progression_operations
         WHERE operation_key = ?`
      )
        .bind(failedOperationKey)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_progression_audit
         WHERE operation_key = ?`
      )
        .bind(failedOperationKey)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT levels FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = ?`
      )
        .bind(PLAYER, inviter, season)
        .first()
    ).toEqual({ levels: 5 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(inviter)
        .first()
    ).toEqual({ balance: 5 })

    const retried = await rpcAs(
      ADMIN,
      'GMGiveLevels',
      {
        accountAddress: `identity:${PLAYER}`,
        levels: 7
      },
      true,
      levelGrantHeaders(failedOperationKey)
    )
    expect(retried.status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level FROM player_profiles WHERE user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ level: 13 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM staff_progression_operations
         WHERE operation_key = ?`
      )
        .bind(failedOperationKey)
        .first()
    ).toEqual({ status: 'APPLIED' })
  })

  it('ports RP overrides, level-15 promotion, and grandweaver recalculation', async () => {
    const inviter = 'staff-rp-inviter'
    const invitationTime = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'RP Inviter', 'rp-inviter@example.com', ?, ?)`
    )
      .bind(inviter, invitationTime, invitationTime)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(inviter)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_invites
         (invitee_user_id, inviter_user_id, created_at) VALUES (?, ?, ?)`
    )
      .bind(PLAYER, inviter, invitationTime)
      .run()
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, 'GMSetRP', {
          accountAddress: `identity:${PLAYER}`,
          mode: 'RANKED_CONSTRUCTED',
          rankPoints: 200
        })
      ).status
    ).toBe(403)
    await grantProgressionWrite()
    for (const [mode, rankPoints] of [
      ['UNKNOWN', 200],
      ['PRACTICE_BOT', 200],
      ['RANKED_CONSTRUCTED', 199],
      ['RANKED_CONSTRUCTED', 2_147_483_648]
    ]) {
      expect(
        (
          await rpcAs(ADMIN, 'GMSetRP', {
            accountAddress: `identity:${PLAYER}`,
            mode,
            rankPoints
          })
        ).status
      ).toBe(400)
    }

    const season = seasonFromDate()
    for (const [rankPoints, rank, stage] of [
      [200, 'WANDERER', 'STAGE_III'],
      [340, 'TRAINEE', 'STAGE_I'],
      [769, 'APPRENTICE', 'STAGE_II']
    ] as const) {
      const response = await rpcAs(ADMIN, 'GMSetRP', {
        accountAddress: `identity:${PLAYER}`,
        mode: 'RANKED_CONSTRUCTED',
        rankPoints
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ ok: true })
      expect(
        await env.AUTH_DB.prepare(
          `SELECT score, player_rank, player_rank_stage, player_rank_state
           FROM player_account_stats
           WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
             AND season = ?`
        )
          .bind(PLAYER, season)
          .first()
      ).toEqual({
        score: rankPoints,
        player_rank: rank,
        player_rank_stage: stage,
        player_rank_state: JSON.stringify([1, 1750, 350, rankPoints])
      })
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT profile.level, profile.xp,
                progression.basic_skypass_level AS skypass_level
         FROM player_profiles profile
         JOIN player_progression progression
           ON progression.user_id = profile.user_id
         WHERE profile.user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ level: 16, xp: 0, skypass_level: 16 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT levels FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = ?`
      )
        .bind(PLAYER, inviter, season)
        .first()
    ).toEqual({ levels: 15 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(inviter)
        .first()
    ).toEqual({ balance: 15 })

    const conquest = await rpcAs(ADMIN, 'GMSetRP', {
      accountAddress: `identity:${PLAYER}`,
      mode: 'CONQUEST_CONSTRUCTED',
      rankPoints: 700
    })
    expect(conquest.status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT score, player_rank, player_rank_stage, player_rank_state
         FROM player_account_stats
         WHERE user_id = ? AND game_mode = 'CONQUEST_CONSTRUCTED'
           AND season = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({
      score: 0,
      player_rank: 'APPRENTICE',
      player_rank_stage: 'STAGE_II',
      player_rank_state: '[1,1750,350,700]'
    })

    const masterUsers: string[] = []
    const statements: D1PreparedStatement[] = []
    const createdAt = new Date().toISOString()
    for (let index = 0; index < 100; index++) {
      const userId = `gm-master-${String(index).padStart(3, '0')}`
      masterUsers.push(userId)
      statements.push(
        env.AUTH_DB.prepare(
          `INSERT INTO users
             (id, display_name, primary_email, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          userId,
          `Master${String(index).padStart(3, '0')}`,
          `${userId}@example.com`,
          createdAt,
          createdAt
        ),
        env.AUTH_DB.prepare(
          `INSERT INTO player_account_settings
             (user_id, name, locale, created_at, updated_at)
           VALUES (?, ?, 'en', ?, ?)`
        ).bind(
          userId,
          `Master${String(index).padStart(3, '0')}`,
          createdAt,
          createdAt
        ),
        env.AUTH_DB.prepare(
          `INSERT INTO player_account_stats
             (user_id, game_mode, season, score, player_rank,
              player_rank_stage, player_rank_state, created_at, updated_at)
           VALUES (?, 'RANKED_CONSTRUCTED', ?, ?, 'MASTER', 'STAGE_NONE', ?, ?, ?)`
        ).bind(
          userId,
          season,
          2000 - index,
          JSON.stringify([1, 1750, 350, 2000 - index]),
          createdAt,
          new Date(Date.parse(createdAt) + index).toISOString()
        )
      )
    }
    await env.AUTH_DB.batch(statements)
    const master = await rpcAs(ADMIN, 'GMSetRP', {
      accountAddress: `identity:${PLAYER}`,
      mode: 'RANKED_CONSTRUCTED',
      rankPoints: 1300
    })
    expect(master.status).toBe(200)
    const rankCounts = await env.AUTH_DB.prepare(
      `SELECT player_rank, COUNT(*) AS count FROM player_account_stats
       WHERE game_mode = 'RANKED_CONSTRUCTED' AND season = ?
         AND player_rank IN ('MASTER', 'GRANDWEAVER')
       GROUP BY player_rank ORDER BY player_rank ASC`
    )
      .bind(season)
      .all()
    expect(rankCounts.results).toEqual([
      { player_rank: 'GRANDWEAVER', count: 100 },
      { player_rank: 'MASTER', count: 1 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player_rank FROM player_account_stats
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({ player_rank: 'MASTER' })

    const audits = await env.AUTH_DB.prepare(
      `SELECT operation, before_json, after_json FROM staff_progression_audit
       WHERE target_user_id = ? AND operation = 'SET_RP' ORDER BY id ASC`
    )
      .bind(PLAYER)
      .all<{ operation: string; before_json: string; after_json: string }>()
    expect(audits.results).toHaveLength(5)
    expect(audits.results.every(row => row.operation === 'SET_RP')).toBe(true)
    expect(JSON.parse(audits.results[0].before_json)).toMatchObject({
      requestedRankPoints: 200,
      level: 1,
      stat: {
        score: 0,
        playerRank: 'UNRANKED',
        playerRankStage: 'STAGE_NONE',
        playerRankState: ''
      }
    })
    expect(JSON.parse(audits.results[0].after_json)).toMatchObject({
      level: 16,
      stat: {
        score: 200,
        playerRank: 'WANDERER',
        playerRankStage: 'STAGE_III',
        playerRankState: '[1,1750,350,200]'
      }
    })
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
          accountActions: ['ACTIVE']
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

  it('ports game-mode writes and source history behind operational authority', async () => {
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, 'GMGameModeSet', {
          gameMode: 'RANKED_CONSTRUCTED',
          enable: false
        })
      ).status
    ).toBe(403)
    await grantGameModeWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMGameModeSet', {
          gameMode: 'UNKNOWN',
          enable: false
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(ADMIN, 'GMGameModeSet', {
          gameMode: 'CONQUEST_CONSTRUCTED',
          enable: true
        })
      ).status
    ).toBe(400)

    for (const enable of [false, false, true]) {
      expect(
        await (
          await rpcAs(ADMIN, 'GMGameModeSet', {
            gameMode: 'RANKED_CONSTRUCTED',
            enable
          })
        ).json()
      ).toEqual({ ok: true })
    }
    expect(
      await (
        await rpcAs(ADMIN, 'GMGameModeStatusHistory', {
          page: { pageSize: 2 },
          gameModes: ['RANKED_CONSTRUCTED']
        })
      ).json()
    ).toMatchObject({
      page: { pageSize: 2, hasBefore: true, hasAfter: false },
      statusHistory: [
        {
          id: expect.any(Number),
          gameMode: 'RANKED_CONSTRUCTED',
          enabled: false,
          createdAt: expect.any(String)
        },
        {
          id: expect.any(Number),
          gameMode: 'RANKED_CONSTRUCTED',
          enabled: false,
          createdAt: expect.any(String)
        }
      ]
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT enabled, updated_by_user_id FROM game_mode_status
         WHERE game_mode = 'RANKED_CONSTRUCTED'`
      ).first()
    ).toMatchObject({ enabled: 1, updated_by_user_id: ADMIN })
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM game_mode_status_history
         WHERE game_mode = 'RANKED_CONSTRUCTED'`
      ).run()
    ).rejects.toThrow('game mode status history rows are immutable')
  })

  it('keeps game-mode history read-only for broad admins', async () => {
    expect((await rpcAs(PLAYER, 'GMGameModeStatusHistory')).status).toBe(403)
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMGameModeStatusHistory', {
      gameModes: ['PRACTICE_BOT']
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      page: { pageSize: 200, hasBefore: false, hasAfter: false },
      statusHistory: []
    })
  })

  it('ports account sanctions with append-only history and enforcement', async () => {
    await grantAdmin()
    await seedGoldDeliveries()
    const ban = {
      id: 999,
      accountAddress: `identity:${PLAYER}`,
      actionType: 'MOD_BAN',
      isActive: true
    }
    expect(
      (await rpcAs(ADMIN, 'GMCreateAccountAction', { action: ban })).status
    ).toBe(403)
    await grantAccountActionWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMCreateAccountAction', {
          action: { ...ban, actionType: 'AUTO_BAN' }
        })
      ).status
    ).toBe(400)

    const created = await rpcAs(ADMIN, 'GMCreateAccountAction', { action: ban })
    expect(created.status).toBe(200)
    const action = (await created.json()) as {
      action: {
        id: number
        actionType: string
        isActive: boolean
        createdBy: number
        expiresAt: string
      }
    }
    expect(action.action).toMatchObject({
      id: expect.any(Number),
      actionType: 'MOD_BAN',
      isActive: true,
      createdBy: expect.any(Number),
      expiresAt: expect.any(String)
    })
    expect(action.action.id).not.toBe(ban.id)
    expect((await rpcAs(PLAYER, 'AvailableXPBonuses')).status).toBe(403)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT leaderboard_eligible
         FROM player_account_settings
         WHERE user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ leaderboard_eligible: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status
         FROM player_conquest_gold_deliveries
         WHERE user_id = ? AND conquest_id = 951`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ status: 'DISABLED' })
    expect(
      await (
        await rpcAs(ADMIN, 'GMIsAccountBanned', {
          account: `identity:${PLAYER}`
        })
      ).json()
    ).toMatchObject({
      banned: true,
      status: 'BANNED',
      accountActions: [{ id: action.action.id, actionType: 'MOD_BAN' }]
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMListAccounts', {
          // The source schema types this action filter as AccountStatus, so
          // ACTIVE's ordinal selects MOD_BAN's matching ordinal.
          accountActions: ['ACTIVE']
        })
      ).json()
    ).toMatchObject({
      accounts: [
        {
          account: { address: `identity:${PLAYER}` },
          accountActions: [{ id: action.action.id }]
        }
      ]
    })

    const vetted = await rpcAs(ADMIN, 'GMCreateAccountAction', {
      action: {
        id: 1,
        accountAddress: `identity:${PLAYER}`,
        actionType: 'MOD_VET',
        isActive: true
      }
    })
    expect(vetted.status).toBe(200)
    expect((await rpcAs(PLAYER, 'AvailableXPBonuses')).status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT leaderboard_eligible
         FROM player_account_settings
         WHERE user_id = ?`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ leaderboard_eligible: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status
         FROM player_conquest_gold_deliveries
         WHERE user_id = ? AND conquest_id = 951`
      )
        .bind(PLAYER)
        .first()
    ).toEqual({ status: 'PENDING' })
    const history = await rpcAs(ADMIN, 'GMListAccountActions')
    expect(history.status).toBe(200)
    expect(await history.json()).toMatchObject({
      accountActions: [
        { actionType: 'MOD_VET', isActive: true },
        { actionType: 'MOD_BAN', isActive: false }
      ]
    })
    expect(
      await (
        await rpcAs(ADMIN, 'GMListAccountSignals', {
          account: `identity:${PLAYER}`
        })
      ).json()
    ).toMatchObject({
      signal: [
        { signalType: 'vetted by human' },
        { signalType: 'banned by human' }
      ]
    })
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM player_account_actions WHERE account_user_id = ?`
      )
        .bind(PLAYER)
        .run()
    ).rejects.toThrow('account action rows are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM player_account_action_deactivations`
      ).run()
    ).rejects.toThrow('account action deactivations are immutable')
  })

  it('reactivates expired ban projections on the next player access check', async () => {
    const isolated = 'staff-expiry-player'
    const createdAt = '2026-08-13T00:00:00.000Z'
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Expiry Player', 'expiry-player@example.com', ?, ?)`
    )
      .bind(isolated, createdAt, createdAt)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(isolated)
    await grantAdmin()
    await grantAccountActionWrite()
    const repository = new AccountActionsRepository(testEnv.AUTH_DB)
    await repository.create(
      ADMIN,
      {
        id: 0,
        accountAddress: `identity:${isolated}`,
        actionType: ActionType.MOD_SUSPENSION,
        isActive: true,
        expiresAt: '2026-08-13T00:00:01.000Z'
      },
      new Date('2026-08-13T00:00:00.000Z')
    )
    await expect(
      repository.enforcePlayerAccess(
        isolated,
        new Date('2026-08-13T00:00:00.500Z')
      )
    ).rejects.toThrow('account banned')
    await expect(
      repository.enforcePlayerAccess(
        isolated,
        new Date('2026-08-13T00:00:02.000Z')
      )
    ).resolves.toBeUndefined()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT account_status FROM player_account_settings WHERE user_id = ?`
      )
        .bind(isolated)
        .first()
    ).toEqual({ account_status: 'ACTIVE' })
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
    await createTestSkypassPolicy(env.AUTH_DB, 999, [
      { level: 1, tier: 2, itemType: 403, amount: 1 },
      {
        level: 2,
        tier: 1,
        itemType: 500,
        amount: 0,
        isStarter: 1,
        attributes: { tokenIDs: [2], unlockDeckClasses: ['AGY'] }
      },
      {
        level: 2,
        tier: 1,
        itemType: 300,
        amount: 1,
        attributes: { cardSetsExcluded: ['HEXBOUND_INVASION'] }
      }
    ])
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

  it('gates and audits optional SkyPass entitlement toggles under a season cap', async () => {
    const season = seasonFromDate()
    await grantAdmin()
    expect(
      (
        await rpcAs(ADMIN, 'GMToggleSkypassPremium', {
          address: `identity:${PLAYER}`
        })
      ).status
    ).toBe(403)
    await grantEntitlementWrite()
    expect(
      (
        await rpcAs(ADMIN, 'GMToggleSkypassPremium', {
          address: `identity:${PLAYER}`
        })
      ).status
    ).toBe(400)
    const missingCap = await rpcAs(
      ADMIN,
      'GMToggleSkypassPremium',
      { address: `identity:${PLAYER}` },
      true,
      skypassToggleHeaders()
    )
    expect(missingCap.status).toBe(500)
    expect(await missingCap.json()).toMatchObject({
      msg: 'skypass giveaway limit is not configured'
    })
    expect(
      (
        await rpcAs(
          ADMIN,
          'GMToggleSkypassPremium',
          { address: 'identity:missing' },
          true,
          skypassToggleHeaders()
        )
      ).status
    ).toBe(404)

    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_giveaway_limits
         (season, giveaway_limit, set_by_user_id, reason, created_at, updated_at)
       VALUES (?, 2, ?, 'test-approved season cap', ?, ?)`
    )
      .bind(season, ADMIN, now, now)
      .run()
    const grantKey = crypto.randomUUID()
    const [granted, duplicateGrant] = await Promise.all(
      Array.from({ length: 2 }, () =>
        rpcAs(
          ADMIN,
          'GMToggleSkypassPremium',
          { address: `identity:${PLAYER}` },
          true,
          skypassToggleHeaders(grantKey)
        )
      )
    )
    expect(granted.status).toBe(200)
    expect(await granted.json()).toEqual({ has: true })
    expect(duplicateGrant.status).toBe(200)
    expect(await duplicateGrant.json()).toEqual({ has: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT has_premium FROM player_skypass_season_stats
         WHERE user_id = ? AND season = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({ has_premium: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance, unlock_source FROM player_items
         WHERE user_id = ? AND item_type = 'SW_SKYPASS' AND token_id = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({ balance: 1, unlock_source: 'gm-skypass-giveaway' })
    expect(
      await (
        await rpcAs(ADMIN, 'GMHasSkypassPremium', {
          address: `identity:${PLAYER}`
        })
      ).json()
    ).toEqual({ has: true })

    expect(
      (
        await rpcAs(
          ADMIN,
          'GMToggleSkypassPremium',
          { address: `identity:${ADMIN}` },
          true,
          skypassToggleHeaders(grantKey)
        )
      ).status
    ).toBe(400)

    const removeKey = '00000000-0000-4000-8000-000000000074'
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER staff_skypass_test_abort_completion
       BEFORE UPDATE ON staff_skypass_entitlement_operations
       WHEN NEW.operation_key = '00000000-0000-4000-8000-000000000074'
         AND NEW.status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected staff skypass completion failure');
       END`
    ).run()
    const failedRemoval = await rpcAs(
      ADMIN,
      'GMToggleSkypassPremium',
      { address: `identity:${PLAYER}` },
      true,
      skypassToggleHeaders(removeKey)
    )
    expect(failedRemoval.status).toBe(500)
    await env.AUTH_DB.prepare(
      'DROP TRIGGER staff_skypass_test_abort_completion'
    ).run()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT stats.has_premium, item.balance
         FROM player_skypass_season_stats stats
         JOIN player_items item ON item.user_id = stats.user_id
          AND item.item_type = 'SW_SKYPASS' AND item.token_id = stats.season
         WHERE stats.user_id = ? AND stats.season = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({ has_premium: 1, balance: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_skypass_entitlement_operations
         WHERE operation_key = ?`
      )
        .bind(removeKey)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_skypass_entitlement_audit
         WHERE operation_key = ?`
      )
        .bind(removeKey)
        .first()
    ).toEqual({ count: 0 })

    const removed = await rpcAs(
      ADMIN,
      'GMToggleSkypassPremium',
      { address: `identity:${PLAYER}` },
      true,
      skypassToggleHeaders(removeKey)
    )
    expect(removed.status).toBe(200)
    expect(await removed.json()).toEqual({ has: false })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT stats.has_premium, item.balance
         FROM player_skypass_season_stats stats
         JOIN player_items item ON item.user_id = stats.user_id
          AND item.item_type = 'SW_SKYPASS' AND item.token_id = stats.season
         WHERE stats.user_id = ? AND stats.season = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({ has_premium: 0, balance: 0 })

    const regrantKey = crypto.randomUUID()
    const regranted = await rpcAs(
      ADMIN,
      'GMToggleSkypassPremium',
      { address: `identity:${PLAYER}` },
      true,
      skypassToggleHeaders(regrantKey)
    )
    expect(regranted.status).toBe(200)
    expect(await regranted.json()).toEqual({ has: true })
    const capped = await rpcAs(
      ADMIN,
      'GMToggleSkypassPremium',
      { address: `identity:${PLAYER}` },
      true,
      skypassToggleHeaders()
    )
    expect(capped.status).toBe(500)
    expect(await capped.json()).toMatchObject({
      msg: 'too many skypasses given away'
    })
    // Preserve the source order: reaching the giveaway count also prevents a
    // removal toggle, so the existing entitlement remains intact.
    expect(
      await env.AUTH_DB.prepare(
        `SELECT has_premium FROM player_skypass_season_stats
         WHERE user_id = ? AND season = ?`
      )
        .bind(PLAYER, season)
        .first()
    ).toEqual({ has_premium: 1 })

    const audits = await env.AUTH_DB.prepare(
      `SELECT id, actor_user_id, target_user_id, season, before_json, after_json,
              operation_key
       FROM staff_skypass_entitlement_audit ORDER BY id ASC`
    ).all<{
      id: number
      actor_user_id: string
      target_user_id: string
      season: number
      before_json: string
      after_json: string
      operation_key: string
    }>()
    expect(audits.results).toHaveLength(3)
    expect(audits.results[0]).toMatchObject({
      actor_user_id: ADMIN,
      target_user_id: PLAYER,
      season,
      operation_key: grantKey
    })
    expect(JSON.parse(audits.results[0].before_json)).toEqual({
      hasPremium: false,
      balance: 0
    })
    expect(JSON.parse(audits.results[0].after_json)).toEqual({
      hasPremium: true,
      balance: 1
    })
    expect(audits.results.map(row => row.operation_key)).toEqual([
      grantKey,
      removeKey,
      regrantKey
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT before_has_premium, after_has_premium,
                before_balance, after_balance, status
         FROM staff_skypass_entitlement_operations
         WHERE operation_key = ?`
      )
        .bind(grantKey)
        .first()
    ).toEqual({
      before_has_premium: 0,
      after_has_premium: 1,
      before_balance: 0,
      after_balance: 1,
      status: 'APPLIED'
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_skypass_entitlement_operations SET completed_at = ?
         WHERE operation_key = ?`
      )
        .bind(new Date().toISOString(), grantKey)
        .run()
    ).rejects.toThrow(/completion is invalid/i)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_skypass_entitlement_operations
         WHERE operation_key = ?`
      )
        .bind(grantKey)
        .run()
    ).rejects.toThrow(/immutable/i)
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO staff_skypass_entitlement_audit
           (operation, target_user_id, actor_user_id, season, before_json,
            after_json, created_at)
         VALUES ('TOGGLE_SKYPASS_PREMIUM', ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          PLAYER,
          ADMIN,
          season,
          JSON.stringify({ hasPremium: false, balance: 0 }),
          JSON.stringify({ hasPremium: true, balance: 1 }),
          now
        )
        .run()
    ).rejects.toThrow(/state changed/i)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_skypass_entitlement_audit SET actor_user_id = ? WHERE id = ?`
      )
        .bind(PLAYER, audits.results[0].id)
        .run()
    ).rejects.toThrow(/immutable/i)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_skypass_entitlement_audit WHERE id = ?`
      )
        .bind(audits.results[0].id)
        .run()
    ).rejects.toThrow(/immutable/i)
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
