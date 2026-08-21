import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import {
  CONQUEST_DRILL_OPERATION_HEADER,
  ConquestDrillRepository,
  conquestDrillProposalId
} from '../src/conquest-drill'
import { applyConquestGoldDeliveryQueueMessage } from '../src/conquest-delivery'
import { ConquestReadinessOperationsRepository } from '../src/conquest-readiness-operations'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'
import { settlePendingConquest } from '../../game-server-cloudflare/src/conquest-settlement'
import { approvedConquestPoolStatements } from './helpers/conquest-pool'

const actor = `drill-runner-${crypto.randomUUID()}`
const testEnv = env as unknown as Env

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  key?: string,
  signedIn = true
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (key) headers.set(CONQUEST_DRILL_OPERATION_HEADER, key)
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

const provisionActor = async () => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT OR IGNORE INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Drill Runner', ?, ?, ?)`
  )
    .bind(actor, `${actor}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(actor)
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO staff_roles
         (user_id, role, granted_by_user_id, reason, created_at)
       VALUES (?, 'ADMIN', NULL, 'test drill runner', ?)`
    ).bind(actor, now),
    env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO staff_conquest_drill_permissions
         (user_id, permission, granted_by_user_id, reason, created_at)
       VALUES (?, 'RUN', NULL, 'test drill runner', ?)`
    ).bind(actor, now)
  ])
}

const approvedPool = async (now = Date.now()) => {
  const version = `drill-pool-${crypto.randomUUID()}`
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ),
    ...approvedConquestPoolStatements(env.AUTH_DB, {
      version,
      createdAt: new Date(now - 60 * 60 * 1_000).toISOString(),
      startsAt: new Date(now - 30 * 60 * 1_000).toISOString(),
      endsAt: new Date(now + 48 * 60 * 60 * 1_000).toISOString(),
      silver: [6],
      gold: [136]
    })
  ])
  return version
}

const recordCompletedMatch = async (
  operation: Awaited<ReturnType<ConquestDrillRepository['start']>>,
  matchNumber: number,
  endedAt: string,
  targetWins = true
) => {
  const proposalId = conquestDrillProposalId(
    operation.operationKey,
    matchNumber
  )
  const opponentUserId = operation.opponentUserIds[matchNumber - 1]
  const createdAt = new Date(Date.parse(endedAt) - 1_000).toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version,
        player1_principal, player2_principal,
        player1_user_id, player2_user_id, match_payload_json,
        server_address, status, created_at, updated_at,
        winner_player, result_json, ended_at,
        player1_mode, player2_mode, dispatch_fingerprint)
     VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'readiness-test',
             ?, ?, ?, ?, '{}', 'test-game', 'ended', ?, ?, ?,
             '{"status":"COMPLETED"}', ?,
             'CONQUEST_CONSTRUCTED', 'CONQUEST_CONSTRUCTED', NULL)`
  )
    .bind(
      proposalId,
      `readiness-replay-${operation.operationKey}-${matchNumber}`,
      `0x${String(matchNumber).padStart(40, '1')}`,
      `0x${String(matchNumber).padStart(40, '2')}`,
      operation.targetUserId,
      opponentUserId,
      createdAt,
      endedAt,
      targetWins ? 0 : 1,
      endedAt
    )
    .run()
  const match = await env.AUTH_DB.prepare(
    `SELECT id FROM multiplayer_matches WHERE proposal_id = ?`
  )
    .bind(proposalId)
    .first<{ id: number }>()
  if (!match) throw new Error('test readiness match was not persisted')
  const target = await env.AUTH_DB.prepare(
    `SELECT match_progress FROM player_conquests WHERE user_id = ?`
  )
    .bind(operation.targetUserId)
    .first<{ match_progress: string }>()
  const targetProgress = JSON.parse(target!.match_progress)
  targetProgress[String(match.id)] = targetWins ? 'WIN' : 'LOSS'
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_conquest_progress
         (proposal_id, player1_result, player2_result, processed_at)
       VALUES (?, ?, ?, ?)`
    ).bind(
      proposalId,
      targetWins ? 'WIN' : 'LOSS',
      targetWins ? 'LOSS' : 'WIN',
      endedAt
    ),
    env.AUTH_DB.prepare(
      `UPDATE player_conquests
       SET match_progress = ?, status = ?,
           ended_at = CASE WHEN ? = 1 THEN ? ELSE NULL END
       WHERE user_id = ? AND status = 'IN_PROGRESS'`
    ).bind(
      JSON.stringify(targetProgress),
      targetWins && matchNumber < 3
        ? 'IN_PROGRESS'
        : targetWins
          ? 'REWARDS_PENDING'
          : 'COMPLETED',
      targetWins && matchNumber < 3 ? 0 : 1,
      endedAt,
      operation.targetUserId
    ),
    env.AUTH_DB.prepare(
      `UPDATE player_conquests
       SET match_progress = ?, status = 'COMPLETED', ended_at = ?
       WHERE user_id = ? AND status = 'IN_PROGRESS'`
    ).bind(
      JSON.stringify({ [String(match.id)]: targetWins ? 'LOSS' : 'WIN' }),
      endedAt,
      opponentUserId
    )
  ])
  return match.id
}

beforeEach(async () => {
  await provisionActor()
  await env.AUTH_DB.prepare(
    `UPDATE game_mode_status SET enabled = 0, updated_at = ?
     WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')`
  )
    .bind(new Date().toISOString())
    .run()
})

describe('dormant Conquest readiness drill operations', () => {
  it('provisions four isolated system runs idempotently without enabling a queue', async () => {
    const version = await approvedPool()
    const key = crypto.randomUUID()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion: version, reason: 'Exercise the reviewed reward pool' },
      key
    )
    expect(operation).toMatchObject({
      operationKey: key,
      poolVersion: version,
      actorUserId: actor,
      status: 'RUNNING',
      completedMatchCount: 0
    })
    expect(operation.opponentUserIds).toHaveLength(3)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquests
            WHERE reward_pool_version = ? AND status = 'IN_PROGRESS') runs,
           (SELECT COUNT(*) FROM multiplayer_matches
            WHERE proposal_id LIKE ?) matches,
           (SELECT COUNT(*) FROM conquest_queue_readiness
            WHERE pool_version = ?) readiness,
           (SELECT COUNT(*) FROM game_mode_status
            WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
              AND enabled = 1) enabled_modes,
           (SELECT COUNT(*) FROM users
            WHERE user_kind = 'SYSTEM' AND (
              id = ? OR id IN (SELECT value FROM json_each(?))
            )) system_accounts,
           (SELECT COUNT(*) FROM player_account_settings settings
            JOIN users ON users.id = settings.user_id
            WHERE users.user_kind = 'SYSTEM'
              AND settings.leaderboard_eligible <> 0) visible_system_accounts,
           (SELECT COUNT(*) FROM staff_conquest_drill_audit
            WHERE operation_key = ?) audit_rows`
      )
        .bind(
          version,
          `readiness-drill-match-${key}-%`,
          version,
          operation.targetUserId,
          JSON.stringify(operation.opponentUserIds),
          key
        )
        .first()
    ).toEqual({
      runs: 4,
      matches: 0,
      readiness: 0,
      enabled_modes: 0,
      system_accounts: 4,
      visible_system_accounts: 0,
      audit_rows: 2
    })

    expect(
      await repository.start(
        actor,
        { poolVersion: version, reason: 'Exercise the reviewed reward pool' },
        key
      )
    ).toEqual(operation)
    await expect(
      repository.start(
        actor,
        { poolVersion: version, reason: 'Different request' },
        key
      )
    ).rejects.toThrow('operation key was already used')
    expect(
      (
        await repository.run(
          async () => {
            throw new Error('close completed test operation')
          },
          new Date(),
          key
        )
      ).failed
    ).toBe(1)
  })

  it('keeps drill principals out of player discovery while retaining staff inspection', async () => {
    const version = await approvedPool()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion: version, reason: 'System-principal visibility boundary' },
      crypto.randomUUID()
    )
    const reference = `identity:${operation.targetUserId}`
    const setting = await env.AUTH_DB.prepare(
      `SELECT name FROM player_account_settings WHERE user_id = ?`
    )
      .bind(operation.targetUserId)
      .first<{ name: string }>()

    const byReference = await rpcAs(
      actor,
      'GetAccount',
      { address: reference },
      undefined,
      false
    )
    expect(byReference.status).toBe(200)
    expect(await byReference.json()).toEqual({ account: null })

    const exists = await rpcAs(
      actor,
      'AccountExists',
      { address: reference },
      undefined,
      false
    )
    expect(exists.status).toBe(200)
    expect(await exists.json()).toEqual({
      exists: false,
      pending_migration: false
    })
    expect(
      (
        await rpcAs(
          actor,
          'GetAccountByUsername',
          { username: setting!.name },
          undefined,
          false
        )
      ).status
    ).toBe(404)
    expect(
      (
        await rpcAs(
          actor,
          'GetAccountStats',
          { address: reference },
          undefined,
          false
        )
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(
          actor,
          'GetCardOwnership',
          { accountAddress: reference },
          undefined,
          false
        )
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(actor, 'GetFeed', {
          req: { accountAddress: reference }
        })
      ).status
    ).toBe(404)
    expect(
      (
        await rpcAs(actor, 'SetInvitedBy', {
          req: {
            address: `identity:${actor}`,
            invitedBy: reference
          }
        })
      ).status
    ).toBe(400)

    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET player_rank = 'GRANDWEAVER', score = 999999
       WHERE user_id = ?`
    )
      .bind(operation.targetUserId)
      .run()
    const leaderboard = await rpcAs(
      actor,
      'ListLeaderboard',
      { req: { gameMode: 'RANKED_CONSTRUCTED' } },
      undefined,
      false
    )
    expect(leaderboard.status).toBe(200)
    expect(
      (
        await leaderboard.json<{
          res: Array<{ account?: { address?: string } }>
        }>()
      ).res.some(entry => entry.account?.address === reference)
    ).toBe(false)

    const staff = await rpcAs(actor, 'GMFindAccount', {
      accountAddress: reference
    })
    expect(staff.status).toBe(200)
    expect(await staff.json()).toMatchObject({
      account: { address: reference, name: setting!.name }
    })
  })

  it('enforces the reserved system namespace and social/reward guards in D1', async () => {
    const version = await approvedPool()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion: version, reason: 'Database system-account guard test' },
      crypto.randomUUID()
    )
    const now = new Date().toISOString()

    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, created_at, updated_at)
         VALUES ('system:forged-player', 'Forged Player',
                 'forged-player@example.com', ?, ?)`
      )
        .bind(now, now)
        .run()
    ).rejects.toThrow('user kind does not match reserved namespace')
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, created_at, updated_at, user_kind)
         VALUES ('ordinary-forged-system', 'Forged System',
                 'forged-system@example.com', ?, ?, 'SYSTEM')`
      )
        .bind(now, now)
        .run()
    ).rejects.toThrow('user kind does not match reserved namespace')
    await expect(
      env.AUTH_DB.prepare(`UPDATE users SET user_kind = 'PLAYER' WHERE id = ?`)
        .bind(operation.targetUserId)
        .run()
    ).rejects.toThrow('user kind is immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_account_settings SET leaderboard_eligible = 1
         WHERE user_id = ?`
      )
        .bind(operation.targetUserId)
        .run()
    ).rejects.toThrow('system accounts are not leaderboard eligible')
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO player_invites
           (invitee_user_id, inviter_user_id, created_at)
         VALUES (?, ?, ?)`
      )
        .bind(actor, operation.targetUserId, now)
        .run()
    ).rejects.toThrow('system accounts cannot participate in invitations')
  })

  it('keeps start and list RPCs behind their separate staff boundaries', async () => {
    const version = await approvedPool()
    const key = crypto.randomUUID()
    const request = {
      poolVersion: version,
      reason: 'Exercise the RPC authorization boundary'
    }
    expect(
      (await rpcAs(actor, 'GMStartConquestDrill', request, key, false)).status
    ).toBe(401)

    const ordinary = `drill-ordinary-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Ordinary Drill Viewer', ?, ?, ?)`
    )
      .bind(ordinary, `${ordinary}@example.com`, now, now)
      .run()
    expect(
      (await rpcAs(ordinary, 'GMStartConquestDrill', request, key)).status
    ).toBe(403)
    expect((await rpcAs(ordinary, 'GMListConquestDrills')).status).toBe(403)

    const started = await rpcAs(actor, 'GMStartConquestDrill', request, key)
    expect(started.status).toBe(200)
    expect(await started.json()).toMatchObject({
      operation: {
        operationKey: key,
        poolVersion: version,
        actorUserId: actor,
        status: 'RUNNING',
        completedMatchCount: 0
      }
    })

    const listed = await rpcAs(actor, 'GMListConquestDrills', {
      poolVersion: version
    })
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({
      operations: [{ operationKey: key, status: 'RUNNING' }]
    })
  })

  it('fails terminally when provisioning cannot satisfy the guarded start', async () => {
    const version = await approvedPool()
    const key = crypto.randomUUID()
    const now = new Date().toISOString()
    const targetUserId = `system:conquest-readiness-drill:${key}`
    const opponentUserId = `system:conquest-readiness-opponent:${key}:1`
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, user_kind, created_at, updated_at)
         VALUES (?, 'Blocked Readiness Target', ?, 'SYSTEM', ?, ?)`
      ).bind(targetUserId, `blocked-target-${key}@example.com`, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, user_kind, created_at, updated_at)
         VALUES (?, 'Blocked Readiness Opponent', ?, 'SYSTEM', ?, ?)`
      ).bind(opponentUserId, `blocked-opponent-${key}@example.com`, now, now)
    ])
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version,
          player1_principal, player2_principal, player1_user_id,
          player2_user_id, match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'readiness-test',
               '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222', ?, ?, '{}',
               'failed', ?, ?)`
    )
      .bind(
        conquestDrillProposalId(key, 1),
        `blocked-readiness-replay-${key}`,
        targetUserId,
        opponentUserId,
        now,
        now
      )
      .run()

    const repository = new ConquestDrillRepository(env.AUTH_DB)
    await expect(
      repository.start(
        actor,
        { poolVersion: version, reason: 'Exercise start failure handling' },
        key
      )
    ).rejects.toThrow('complete Conquest drill provisioning required')
    expect((await repository.list(version))[0]).toMatchObject({
      operationKey: key,
      status: 'FAILED',
      completedMatchCount: 0,
      failureReason: 'PROVISIONING_INVALID'
    })

    const replacementKey = crypto.randomUUID()
    expect(
      await repository.start(
        actor,
        { poolVersion: version, reason: 'Retry with an independent receipt' },
        replacementKey
      )
    ).toMatchObject({
      operationKey: replacementKey,
      status: 'RUNNING'
    })
  })

  it('dispatches only the next sequential match and fails closed on dispatch error', async () => {
    const version = await approvedPool()
    const key = crypto.randomUUID()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    await repository.start(
      actor,
      { poolVersion: version, reason: 'Run sequential match safety test' },
      key
    )
    const calls: Array<[string, number]> = []
    expect(
      await repository.run(
        async (operationKey, matchNumber) => {
          calls.push([operationKey, matchNumber])
        },
        new Date(),
        key
      )
    ).toEqual({
      dispatched: 1,
      advanced: 0,
      completed: 0,
      failed: 0,
      waiting: 0
    })
    expect(calls).toEqual([[key, 1]])
    expect(conquestDrillProposalId(key, 1)).toBe(
      `readiness-drill-match-${key}-1`
    )

    expect(
      await repository.run(
        async () => {
          throw new Error('untrusted upstream detail')
        },
        new Date(),
        key
      )
    ).toEqual({
      dispatched: 0,
      advanced: 0,
      completed: 0,
      failed: 1,
      waiting: 0
    })
    expect((await repository.list(version))[0]).toMatchObject({
      status: 'FAILED',
      completedMatchCount: 0,
      failureReason: 'MATCH_DISPATCH_FAILED'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, completed_match_count, failure_reason
         FROM staff_conquest_drill_audit WHERE operation_key = ?
         ORDER BY id`
      )
        .bind(key)
        .all()
    ).toMatchObject({
      results: [
        { status: 'PREPARING', completed_match_count: 0 },
        { status: 'RUNNING', completed_match_count: 0 },
        {
          status: 'FAILED',
          completed_match_count: 0,
          failure_reason: 'MATCH_DISPATCH_FAILED'
        }
      ]
    })
  })

  it('rejects unprivileged starts, short windows, enabled modes, and forged completion', async () => {
    const version = await approvedPool()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const unauthorized = `ordinary-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Ordinary Player', ?, ?, ?)`
    )
      .bind(unauthorized, `${unauthorized}@example.com`, now, now)
      .run()
    await expect(
      repository.start(
        unauthorized,
        { poolVersion: version, reason: 'Unauthorized drill' },
        crypto.randomUUID()
      )
    ).rejects.toThrow('authorized dormant Conquest drill required')

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE game_mode_status SET enabled = 1, updated_at = ?
       WHERE game_mode = 'CONQUEST_CONSTRUCTED'`
      )
        .bind(now)
        .run()
    ).rejects.toThrow('verified approved Conquest reward pool required')

    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE version = ?`
    )
      .bind(version)
      .run()
    const shortVersion = `short-drill-pool-${crypto.randomUUID()}`
    await env.AUTH_DB.batch(
      approvedConquestPoolStatements(env.AUTH_DB, {
        version: shortVersion,
        createdAt: new Date(Date.now() - 60 * 60 * 1_000).toISOString(),
        startsAt: new Date(Date.now() - 30 * 60 * 1_000).toISOString(),
        endsAt: new Date(Date.now() + 39 * 60 * 60 * 1_000).toISOString(),
        silver: [6],
        gold: [136]
      })
    )
    await expect(
      repository.start(
        actor,
        { poolVersion: shortVersion, reason: 'Window lacks safety margin' },
        crypto.randomUUID()
      )
    ).rejects.toThrow('authorized dormant Conquest drill required')

    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE version = ?`
    )
      .bind(shortVersion)
      .run()
    const restoredVersion = await approvedPool()

    const key = crypto.randomUUID()
    await repository.start(
      actor,
      { poolVersion: restoredVersion, reason: 'Forgery rejection drill' },
      key
    )
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_conquest_drill_operations
         SET status = 'COMPLETED', completed_match_count = 3,
             updated_at = ?, completed_at = ?
         WHERE operation_key = ?`
      )
        .bind(now, now, key)
        .run()
    ).rejects.toThrow('invalid Conquest drill operation transition')
  })

  it('advances three authoritative wins sequentially and waits for real delayed delivery', async () => {
    const base = Date.now() - 25 * 60 * 60 * 1_000
    const version = await approvedPool(base)
    const key = crypto.randomUUID()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion: version, reason: 'Full sequential lifecycle test' },
      key,
      new Date(base)
    )
    for (const matchNumber of [1, 2, 3]) {
      const endedAt = new Date(base + matchNumber * 60_000).toISOString()
      await recordCompletedMatch(operation, matchNumber, endedAt)
      if (matchNumber === 3) {
        const target = await env.AUTH_DB.prepare(
          `SELECT id FROM player_conquests WHERE user_id = ?`
        )
          .bind(operation.targetUserId)
          .first<{ id: number }>()
        await settlePendingConquest(env.AUTH_DB, target!.id, endedAt, () => 0)
      }
      const summary = await repository.run(
        async () => {
          throw new Error('a completed match must not dispatch another match')
        },
        new Date(Date.parse(endedAt) + 500),
        key
      )
      expect(summary).toMatchObject({ advanced: 1, failed: 0 })
      const current = (await repository.list(version))[0]
      expect(current.completedMatchCount).toBe(matchNumber)
      expect(current.status).toBe(
        matchNumber === 3 ? 'WAITING_DELIVERY' : 'RUNNING'
      )
    }

    const deliveredAt = new Date(base + 25 * 60 * 60 * 1_000)
    const delivery = await env.AUTH_DB.prepare(
      'SELECT conquest_id FROM player_conquest_gold_deliveries'
    ).first<{ conquest_id: number }>()
    expect(
      await applyConquestGoldDeliveryQueueMessage(
        env.AUTH_DB,
        {
          kind: 'CONQUEST_GOLD',
          version: 1,
          conquestId: delivery!.conquest_id
        },
        deliveredAt
      )
    ).toBe('applied')
    expect(
      await repository.run(
        async () => {
          throw new Error('delivery completion never dispatches')
        },
        deliveredAt,
        key
      )
    ).toMatchObject({ completed: 1, failed: 0 })
    expect((await repository.list(version))[0]).toMatchObject({
      status: 'COMPLETED',
      completedMatchCount: 3,
      completedAt: deliveredAt.toISOString()
    })
    const receipts = await env.AUTH_DB.prepare(
      `SELECT settlement.conquest_id, settlement.settlement_key,
              delivery.delivery_key
       FROM player_conquest_settlements settlement
       JOIN player_conquest_gold_deliveries delivery
         ON delivery.conquest_id = settlement.conquest_id
       WHERE settlement.user_id = ?`
    )
      .bind(operation.targetUserId)
      .first<{
        conquest_id: number
        settlement_key: string
        delivery_key: string
      }>()
    await env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO staff_conquest_readiness_permissions
         (user_id, permission, granted_by_user_id, reason, created_at)
       VALUES (?, 'VERIFY', NULL, 'independence test', ?)`
    )
      .bind(actor, deliveredAt.toISOString())
      .run()
    await expect(
      new ConquestReadinessOperationsRepository(env.AUTH_DB).verify(
        actor,
        {
          poolVersion: version,
          conquestId: receipts!.conquest_id,
          settlementKey: receipts!.settlement_key,
          deliveryKey: receipts!.delivery_key,
          drillReference: 'runner-must-not-self-verify'
        },
        crypto.randomUUID()
      )
    ).rejects.toThrow('verified Conquest readiness operation required')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_verified_drill_receipts
            WHERE pool_version = ? AND user_id = ?) evidence,
           (SELECT COUNT(*) FROM conquest_queue_readiness
            WHERE pool_version = ?) readiness,
           (SELECT COUNT(*) FROM staff_conquest_drill_audit
            WHERE operation_key = ?) audit_rows`
      )
        .bind(version, operation.targetUserId, version, key)
        .first()
    ).toEqual({ evidence: 1, readiness: 0, audit_rows: 6 })
  })

  it('makes an unexpected target loss terminal without retrying it', async () => {
    const base = Date.now()
    const version = await approvedPool(base)
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion: version, reason: 'Loss fail-closed test' },
      crypto.randomUUID(),
      new Date(base)
    )
    await recordCompletedMatch(
      operation,
      1,
      new Date(base + 60_000).toISOString(),
      false
    )
    expect(
      await repository.run(
        async () => {
          throw new Error('an ended loss must not dispatch')
        },
        new Date(base + 61_000),
        operation.operationKey
      )
    ).toMatchObject({ failed: 1, dispatched: 0, advanced: 0 })
    expect((await repository.list(version))[0]).toMatchObject({
      status: 'FAILED',
      completedMatchCount: 0,
      failureReason: 'MATCH_OUTCOME_INVALID'
    })
  })
})
