import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { settlePendingConquest } from '../../game-server-cloudflare/src/conquest-settlement'
import { handleApiRequest } from '../src/api'
import { deliverDueConquestGold } from '../src/conquest-delivery'
import { isConquestQueueReady } from '../src/conquest-readiness'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'
import { approvedConquestPoolStatements } from './helpers/conquest-pool'

const testEnv = env as unknown as Env

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  operationKey?: string,
  signedIn = true
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (operationKey) headers.set('x-cloud-weasel-operation-key', operationKey)
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

const actor = async (label: string) => {
  const userId = `${label}-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, label, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  return userId
}

const grantAdmin = async (userId: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(userId, new Date().toISOString())
    .run()
}

const grantVerify = async (userId: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_conquest_readiness_permissions
       (user_id, permission, granted_by_user_id, reason, created_at)
     VALUES (?, 'VERIFY', NULL, 'test bootstrap', ?)`
  )
    .bind(userId, new Date().toISOString())
    .run()
}

const provisionVerifiedDrill = async () => {
  const now = Date.now()
  const startsAt = new Date(now - 26 * 60 * 60 * 1_000).toISOString()
  const settledAt = new Date(now - 25 * 60 * 60 * 1_000).toISOString()
  const deliveredAt = new Date(now - 60 * 60 * 1_000).toISOString()
  const endsAt = new Date(now + 2 * 60 * 60 * 1_000).toISOString()
  const poolVersion = `readiness-pool-${crypto.randomUUID()}`
  const drillUserId = `system:conquest-readiness-drill:${crypto.randomUUID()}`
  const entryKey = `readiness-drill:${crypto.randomUUID()}`
  const createdAt = new Date(now - 27 * 60 * 60 * 1_000).toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Conquest Readiness Drill', ?, ?, ?)`
    ).bind(
      drillUserId,
      `${crypto.randomUUID()}@example.com`,
      createdAt,
      createdAt
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`
    ).bind(drillUserId, createdAt),
    ...approvedConquestPoolStatements(env.AUTH_DB, {
      version: poolVersion,
      startsAt,
      endsAt,
      createdAt,
      activatedAt: startsAt,
      silver: [6],
      gold: [136]
    }),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at)
       VALUES (?, ?, 'REWARDS_PENDING', 1, 'CONQUEST_CONSTRUCTED', 'ADA',
               'STR', '{"1":"WIN","2":"WIN","3":"WIN"}', ?, ?)`
    ).bind(entryKey, drillUserId, settledAt, settledAt)
  ])
  const conquest = await env.AUTH_DB.prepare(
    `SELECT id FROM player_conquests WHERE entry_key = ?`
  )
    .bind(entryKey)
    .first<{ id: number }>()
  await settlePendingConquest(env.AUTH_DB, conquest!.id, settledAt, () => 0)
  expect(
    await deliverDueConquestGold(env.AUTH_DB, new Date(deliveredAt))
  ).toEqual({ delivered: 1, failed: 0, remaining: 0 })
  const receipts = await env.AUTH_DB.prepare(
    `SELECT settlement.settlement_key, delivery.delivery_key
     FROM player_conquest_settlements settlement
     JOIN player_conquest_gold_deliveries delivery
       ON delivery.conquest_id = settlement.conquest_id
     WHERE settlement.conquest_id = ?`
  )
    .bind(conquest!.id)
    .first<{ settlement_key: string; delivery_key: string }>()
  return {
    poolVersion,
    conquestId: conquest!.id,
    settlementKey: receipts!.settlement_key,
    deliveryKey: receipts!.delivery_key,
    drillUserId
  }
}

describe('Conquest readiness operations', () => {
  it('wraps real drill receipts in a dormant, idempotent operator decision without enabling queues', async () => {
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*)
            FROM staff_conquest_readiness_permissions) permissions,
           (SELECT COUNT(*)
            FROM staff_conquest_readiness_operations) operations,
           (SELECT COUNT(*) FROM staff_conquest_readiness_audit) audits,
           (SELECT COUNT(*) FROM conquest_queue_readiness) readiness`
      ).first()
    ).toEqual({ permissions: 0, operations: 0, audits: 0, readiness: 0 })

    const evidence = await provisionVerifiedDrill()
    const firstVerifier = await actor('readiness-verifier-one')
    const secondVerifier = await actor('readiness-verifier-two')
    const ordinaryPlayer = await actor('readiness-player')
    for (const verifier of [firstVerifier, secondVerifier]) {
      await grantAdmin(verifier)
      await grantVerify(verifier)
    }

    const request = {
      ...evidence,
      drillReference: `review:conquest-drill:${crypto.randomUUID()}`
    }
    delete (request as Partial<typeof request>).drillUserId
    const operationKey = crypto.randomUUID()
    expect(
      (
        await rpcAs(
          firstVerifier,
          'GMVerifyConquestReadiness',
          request,
          operationKey,
          false
        )
      ).status
    ).toBe(401)
    expect(
      (
        await rpcAs(
          ordinaryPlayer,
          'GMVerifyConquestReadiness',
          request,
          operationKey
        )
      ).status
    ).toBe(403)
    expect(
      (await rpcAs(ordinaryPlayer, 'GMListConquestReadiness')).status
    ).toBe(403)

    const listed = await rpcAs(firstVerifier, 'GMListConquestReadiness', {
      poolVersion: evidence.poolVersion
    })
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({
      evidence: [
        {
          poolVersion: evidence.poolVersion,
          conquestId: evidence.conquestId,
          settlementKey: evidence.settlementKey,
          deliveryKey: evidence.deliveryKey,
          userId: evidence.drillUserId,
          eligibleNow: true,
          verification: null
        }
      ]
    })

    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO conquest_queue_readiness
           (pool_version, conquest_id, settlement_key, delivery_key,
            verified_by_user_id, drill_reference, verified_at)
         VALUES (?, ?, ?, ?, ?, 'bare-sql', ?)`
      )
        .bind(
          evidence.poolVersion,
          evidence.conquestId,
          evidence.settlementKey,
          evidence.deliveryKey,
          firstVerifier,
          new Date().toISOString()
        )
        .run()
    ).rejects.toThrow('reviewed Conquest readiness operation required')
    expect(
      (
        await rpcAs(
          firstVerifier,
          'GMVerifyConquestReadiness',
          { ...request, deliveryKey: crypto.randomUUID() },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)

    const beforeRewards = await env.AUTH_DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM player_items
          WHERE user_id = ?) inventory,
         (SELECT COUNT(*) FROM player_conquest_feed_events
          WHERE user_id = ?) feed`
    )
      .bind(evidence.drillUserId, evidence.drillUserId)
      .first()
    const verified = await rpcAs(
      firstVerifier,
      'GMVerifyConquestReadiness',
      request,
      operationKey
    )
    expect(verified.status).toBe(200)
    expect(await verified.json()).toMatchObject({
      evidence: {
        poolVersion: evidence.poolVersion,
        conquestId: evidence.conquestId,
        eligibleNow: true,
        verification: {
          verifiedByUserId: firstVerifier,
          drillReference: request.drillReference
        }
      }
    })
    expect(
      (
        await rpcAs(
          firstVerifier,
          'GMVerifyConquestReadiness',
          request,
          operationKey
        )
      ).status
    ).toBe(200)
    expect(
      (
        await rpcAs(
          firstVerifier,
          'GMVerifyConquestReadiness',
          { ...request, drillReference: 'different retry' },
          operationKey
        )
      ).status
    ).toBe(409)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_items
            WHERE user_id = ?) inventory,
           (SELECT COUNT(*) FROM player_conquest_feed_events
            WHERE user_id = ?) feed`
      )
        .bind(evidence.drillUserId, evidence.drillUserId)
        .first()
    ).toEqual(beforeRewards)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT game_mode, enabled FROM game_mode_status
         WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
         ORDER BY game_mode`
      ).all()
    ).toMatchObject({
      results: [
        { game_mode: 'CONQUEST_CONSTRUCTED', enabled: 0 },
        { game_mode: 'CONQUEST_DISCOVERY', enabled: 0 }
      ]
    })
    expect(
      (
        await rpcAs(
          secondVerifier,
          'GMVerifyConquestReadiness',
          request,
          crypto.randomUUID()
        )
      ).status
    ).toBe(409)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_queue_readiness
            WHERE pool_version = ?) readiness,
           (SELECT COUNT(*) FROM staff_conquest_readiness_operations
            WHERE pool_version = ? AND status = 'APPLIED') operations,
           (SELECT COUNT(*) FROM staff_conquest_readiness_audit
            WHERE pool_version = ?) audits`
      )
        .bind(evidence.poolVersion, evidence.poolVersion, evidence.poolVersion)
        .first()
    ).toEqual({ readiness: 1, operations: 1, audits: 1 })
    expect(await isConquestQueueReady(env.AUTH_DB)).toBe(true)
    await expect(
      env.AUTH_DB.prepare('DELETE FROM staff_conquest_readiness_audit').run()
    ).rejects.toThrow('audit rows are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_conquest_readiness_operations SET request_json = '{}'`
      ).run()
    ).rejects.toThrow('operations are immutable')
  })

  it('does not present an abandoned PREPARING readiness row as verified', async () => {
    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ).run()
    const evidence = await provisionVerifiedDrill()
    const verifier = await actor('readiness-preparing-verifier')
    await grantAdmin(verifier)
    await grantVerify(verifier)
    const operationKey = crypto.randomUUID()
    const drillReference = `review:preparing-drill:${crypto.randomUUID()}`
    const createdAt = new Date().toISOString()
    const requestJson = JSON.stringify({
      poolVersion: evidence.poolVersion,
      conquestId: evidence.conquestId,
      settlementKey: evidence.settlementKey,
      deliveryKey: evidence.deliveryKey,
      drillReference
    })
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO staff_conquest_readiness_operations
           (operation_key, operation, pool_version, conquest_id,
            actor_user_id, request_json, status, created_at, completed_at)
         VALUES (?, 'VERIFY', ?, ?, ?, ?, 'PREPARING', ?, NULL)`
      ).bind(
        operationKey,
        evidence.poolVersion,
        evidence.conquestId,
        verifier,
        requestJson,
        createdAt
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO conquest_queue_readiness
           (pool_version, conquest_id, settlement_key, delivery_key,
            verified_by_user_id, drill_reference, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        evidence.poolVersion,
        evidence.conquestId,
        evidence.settlementKey,
        evidence.deliveryKey,
        verifier,
        drillReference,
        createdAt
      )
    ])

    const listed = await rpcAs(verifier, 'GMListConquestReadiness', {
      poolVersion: evidence.poolVersion
    })
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({
      evidence: [
        {
          poolVersion: evidence.poolVersion,
          conquestId: evidence.conquestId,
          eligibleNow: true,
          verification: null
        }
      ]
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_queue_readiness
            WHERE pool_version = ?) readiness,
           (SELECT COUNT(*) FROM staff_conquest_readiness_operations
            WHERE pool_version = ? AND status = 'PREPARING') preparing,
           (SELECT COUNT(*) FROM conquest_verified_queue_pools
            WHERE pool_version = ?) admitted`
      )
        .bind(evidence.poolVersion, evidence.poolVersion, evidence.poolVersion)
        .first()
    ).toEqual({ readiness: 1, preparing: 1, admitted: 0 })
  })
})
