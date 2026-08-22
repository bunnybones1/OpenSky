import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  operationKey?: string,
  signedIn = true
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (operationKey) {
    headers.set('x-cloud-weasel-operation-key', operationKey)
  }
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

const grantPoolPermission = async (
  userId: string,
  permission: 'PROPOSE' | 'ACTIVATE' | 'RETIRE'
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_conquest_reward_pool_permissions
       (user_id, permission, granted_by_user_id, reason, created_at)
     VALUES (?, ?, NULL, 'test bootstrap', ?)`
  )
    .bind(userId, permission, new Date().toISOString())
    .run()
}

const futureWindow = () => {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const endsAt = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
  return { startsAt, endsAt }
}

describe('Conquest reward pool operations', () => {
  it('separates proposal, independent activation, and retirement authorities', async () => {
    const proposer = await actor('pool-proposer')
    const approver = await actor('pool-approver')
    const retireActor = await actor('pool-retirer')
    const ordinaryPlayer = await actor('pool-player')
    const poolVersion = `pool-${crypto.randomUUID()}`
    const proposalKey = crypto.randomUUID()
    const proposal = {
      version: poolVersion,
      ...futureWindow(),
      silverCardIds: [2, 1],
      goldCardIds: [1000],
      reason: 'Source-equivalent reviewed candidate pool',
      reviewReference: `review:${poolVersion}`
    }

    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestRewardPool',
          proposal,
          proposalKey,
          false
        )
      ).status
    ).toBe(401)
    expect(
      (
        await rpcAs(
          ordinaryPlayer,
          'GMProposeConquestRewardPool',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(403)
    await grantAdmin(proposer)
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestRewardPool',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(403)
    await grantPoolPermission(proposer, 'PROPOSE')

    const [firstProposal, retriedProposal] = await Promise.all([
      rpcAs(proposer, 'GMProposeConquestRewardPool', proposal, proposalKey),
      rpcAs(proposer, 'GMProposeConquestRewardPool', proposal, proposalKey)
    ])
    expect(firstProposal.status).toBe(200)
    expect(retriedProposal.status).toBe(200)
    const proposed = (await firstProposal.json()) as {
      pool: { cardManifest: string[]; status: string }
    }
    expect(proposed.pool).toMatchObject({
      version: poolVersion,
      status: 'DRAFT',
      silverCardIds: [1, 2],
      goldCardIds: [1000],
      cardManifest: [
        'SW_SILVER_CARDS:1',
        'SW_SILVER_CARDS:2',
        'SW_GOLD_CARDS:1000'
      ],
      proposal: {
        status: 'DRAFT',
        createdByUserId: proposer,
        reviewReference: proposal.reviewReference
      }
    })
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestRewardPool',
          { ...proposal, reason: 'Different retry payload' },
          proposalKey
        )
      ).status
    ).toBe(409)

    await grantPoolPermission(proposer, 'ACTIVATE')
    expect(
      (
        await rpcAs(
          proposer,
          'GMActivateConquestRewardPool',
          {
            version: poolVersion,
            cardManifest: proposed.pool.cardManifest,
            reason: 'Self approval must fail'
          },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)

    await grantAdmin(approver)
    await grantPoolPermission(approver, 'ACTIVATE')
    expect(
      (
        await rpcAs(
          approver,
          'GMActivateConquestRewardPool',
          {
            version: poolVersion,
            cardManifest: [...proposed.pool.cardManifest].reverse(),
            reason: 'Wrong manifest must fail'
          },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    const activationKey = crypto.randomUUID()
    const activationRequest = {
      version: poolVersion,
      cardManifest: proposed.pool.cardManifest,
      reason: 'Independently checked exact manifest'
    }
    const activated = await rpcAs(
      approver,
      'GMActivateConquestRewardPool',
      activationRequest,
      activationKey
    )
    expect(activated.status).toBe(200)
    expect(await activated.json()).toMatchObject({
      pool: {
        status: 'ACTIVE',
        proposal: {
          status: 'ACTIVE',
          createdByUserId: proposer,
          activatedByUserId: approver,
          activationReason: activationRequest.reason
        }
      }
    })
    expect(
      (
        await rpcAs(
          approver,
          'GMActivateConquestRewardPool',
          activationRequest,
          activationKey
        )
      ).status
    ).toBe(200)

    const listed = await rpcAs(approver, 'GMListConquestRewardPools', {
      version: poolVersion
    })
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({
      pools: [{ version: poolVersion, status: 'ACTIVE' }]
    })
    expect(
      (
        await rpcAs(ordinaryPlayer, 'GMListConquestRewardPools', {
          version: poolVersion
        })
      ).status
    ).toBe(403)

    await grantAdmin(retireActor)
    await grantPoolPermission(retireActor, 'RETIRE')
    const retireKey = crypto.randomUUID()
    expect(
      await (
        await rpcAs(
          retireActor,
          'GMRetireConquestRewardPool',
          { version: poolVersion, reason: 'End reviewed test window' },
          retireKey
        )
      ).json()
    ).toMatchObject({ pool: { version: poolVersion, status: 'RETIRED' } })

    const operations = await env.AUTH_DB.prepare(
      `SELECT operation, status, actor_user_id
       FROM staff_conquest_reward_pool_operations
       WHERE pool_version = ? ORDER BY created_at ASC`
    )
      .bind(poolVersion)
      .all()
    expect(operations.results).toEqual([
      { operation: 'PROPOSE', status: 'APPLIED', actor_user_id: proposer },
      { operation: 'ACTIVATE', status: 'APPLIED', actor_user_id: approver },
      { operation: 'RETIRE', status: 'APPLIED', actor_user_id: retireActor }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT operation, actor_user_id
         FROM staff_conquest_reward_pool_audit
         WHERE pool_version = ? ORDER BY id ASC`
      )
        .bind(poolVersion)
        .all()
    ).toMatchObject({
      results: [
        { operation: 'PROPOSE', actor_user_id: proposer },
        { operation: 'ACTIVATE', actor_user_id: approver },
        { operation: 'RETIRE', actor_user_id: retireActor }
      ]
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_conquest_reward_pool_operations SET status = 'PREPARING'
         WHERE operation_key = ?`
      )
        .bind(retireKey)
        .run()
    ).rejects.toThrow('Conquest reward pool operations are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_conquest_reward_pool_audit WHERE operation_key = ?`
      )
        .bind(retireKey)
        .run()
    ).rejects.toThrow('staff Conquest reward pool audit rows are immutable')

    const modes = await env.AUTH_DB.prepare(
      `SELECT game_mode, enabled FROM game_mode_status
       WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')`
    ).all<{ game_mode: string; enabled: number }>()
    expect(modes.results).toEqual([
      { game_mode: 'CONQUEST_CONSTRUCTED', enabled: 0 },
      { game_mode: 'CONQUEST_DISCOVERY', enabled: 0 }
    ])
  })

  it('rolls back an invalid proposal without partial pool or receipts', async () => {
    const proposer = await actor('invalid-pool-proposer')
    await grantAdmin(proposer)
    await grantPoolPermission(proposer, 'PROPOSE')
    const poolVersion = `invalid-pool-${crypto.randomUUID()}`
    const response = await rpcAs(
      proposer,
      'GMProposeConquestRewardPool',
      {
        version: poolVersion,
        ...futureWindow(),
        silverCardIds: [1, 1],
        goldCardIds: [1000],
        reason: 'Duplicates must fail',
        reviewReference: 'test:duplicates'
      },
      crypto.randomUUID()
    )
    expect(response.status).toBe(400)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_reward_pools WHERE version = ?) pools,
           (SELECT COUNT(*) FROM staff_conquest_reward_pool_operations
            WHERE pool_version = ?) operations,
           (SELECT COUNT(*) FROM staff_conquest_reward_pool_audit
            WHERE pool_version = ?) audits`
      )
        .bind(poolVersion, poolVersion, poolVersion)
        .first()
    ).toEqual({ pools: 0, operations: 0, audits: 0 })
  })

  it('serializes independent activation races into one applied decision', async () => {
    const proposer = await actor('race-pool-proposer')
    const firstApprover = await actor('race-pool-approver-one')
    const secondApprover = await actor('race-pool-approver-two')
    await grantAdmin(proposer)
    await grantPoolPermission(proposer, 'PROPOSE')
    for (const approver of [firstApprover, secondApprover]) {
      await grantAdmin(approver)
      await grantPoolPermission(approver, 'ACTIVATE')
    }
    const poolVersion = `race-pool-${crypto.randomUUID()}`
    const proposal = await rpcAs(
      proposer,
      'GMProposeConquestRewardPool',
      {
        version: poolVersion,
        ...futureWindow(),
        silverCardIds: [1, 2],
        goldCardIds: [1000],
        reason: 'Race test proposal',
        reviewReference: `review:${poolVersion}`
      },
      crypto.randomUUID()
    )
    const body = (await proposal.json()) as {
      pool: { cardManifest: string[] }
    }
    const responses = await Promise.all([
      rpcAs(
        firstApprover,
        'GMActivateConquestRewardPool',
        {
          version: poolVersion,
          cardManifest: body.pool.cardManifest,
          reason: 'First independent review'
        },
        crypto.randomUUID()
      ),
      rpcAs(
        secondApprover,
        'GMActivateConquestRewardPool',
        {
          version: poolVersion,
          cardManifest: body.pool.cardManifest,
          reason: 'Second independent review'
        },
        crypto.randomUUID()
      )
    ])
    expect(responses.map(response => response.status).sort()).toEqual([200, 409])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM staff_conquest_reward_pool_operations
            WHERE pool_version = ? AND operation = 'ACTIVATE'
              AND status = 'APPLIED') operations,
           (SELECT COUNT(*) FROM staff_conquest_reward_pool_audit
            WHERE pool_version = ? AND operation = 'ACTIVATE') audits,
           (SELECT COUNT(*) FROM conquest_approved_active_reward_pools
            WHERE version = ?) approved`
      )
        .bind(poolVersion, poolVersion, poolVersion)
        .first()
    ).toEqual({ operations: 1, audits: 1, approved: 1 })
  })

  it('rejects an overlapping reviewed window without an activation receipt', async () => {
    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ).run()
    const proposer = await actor('window-pool-proposer')
    const approver = await actor('window-pool-approver')
    await grantAdmin(proposer)
    await grantPoolPermission(proposer, 'PROPOSE')
    await grantAdmin(approver)
    await grantPoolPermission(approver, 'ACTIVATE')
    const window = futureWindow()

    const proposePool = async (poolVersion: string) => {
      const response = await rpcAs(
        proposer,
        'GMProposeConquestRewardPool',
        {
          version: poolVersion,
          ...window,
          silverCardIds: [1, 2],
          goldCardIds: [1000],
          reason: 'Reviewed pool-window test',
          reviewReference: `review:${poolVersion}`
        },
        crypto.randomUUID()
      )
      expect(response.status).toBe(200)
      return (await response.json()) as {
        pool: { cardManifest: string[] }
      }
    }

    const firstVersion = `window-first-${crypto.randomUUID()}`
    const first = await proposePool(firstVersion)
    expect(
      (
        await rpcAs(
          approver,
          'GMActivateConquestRewardPool',
          {
            version: firstVersion,
            cardManifest: first.pool.cardManifest,
            reason: 'First independent window review'
          },
          crypto.randomUUID()
        )
      ).status
    ).toBe(200)

    const overlapVersion = `window-overlap-${crypto.randomUUID()}`
    const overlap = await proposePool(overlapVersion)
    const rejected = await rpcAs(
      approver,
      'GMActivateConquestRewardPool',
      {
        version: overlapVersion,
        cardManifest: overlap.pool.cardManifest,
        reason: 'Overlapping independent window review'
      },
      crypto.randomUUID()
    )
    expect(rejected.status).toBe(409)
    expect(await rejected.json()).toMatchObject({
      msg: expect.stringContaining(
        `Conquest pool window overlaps active pool ${firstVersion}`
      )
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT pool.status, activation.status AS activation_status,
                (SELECT COUNT(*)
                 FROM staff_conquest_reward_pool_operations operation
                 WHERE operation.pool_version = pool.version
                   AND operation.operation = 'ACTIVATE') AS operations,
                (SELECT COUNT(*)
                 FROM staff_conquest_reward_pool_audit audit
                 WHERE audit.pool_version = pool.version
                   AND audit.operation = 'ACTIVATE') AS audits
         FROM conquest_reward_pools pool
         JOIN conquest_reward_pool_activations activation
           ON activation.pool_version = pool.version
         WHERE pool.version = ?`
      )
        .bind(overlapVersion)
        .first()
    ).toEqual({
      status: 'DRAFT',
      activation_status: 'DRAFT',
      operations: 0,
      audits: 0
    })
  })
})
