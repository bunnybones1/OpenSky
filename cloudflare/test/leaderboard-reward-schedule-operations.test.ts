import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import {
  LEADERBOARD_REWARD_POLICY_HASH,
  LEADERBOARD_REWARD_POLICY_VERSION
} from '../src/leaderboard-reward-policy'
import { nextLeaderboardRewardTime } from '../src/leaderboard-reward-worker'
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

const grantSchedulePermission = async (
  userId: string,
  permission: 'PROPOSE' | 'ACTIVATE' | 'DISABLE'
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_leaderboard_reward_schedule_permissions
       (user_id, permission, granted_by_user_id, reason, created_at)
     VALUES (?, ?, NULL, 'test bootstrap', ?)`
  )
    .bind(userId, permission, new Date().toISOString())
    .run()
}

const latestVersion = async () =>
  (
    await env.AUTH_DB.prepare(
      `SELECT COALESCE(MAX(version), 0) version
       FROM leaderboard_reward_schedule_versions`
    ).first<{ version: number }>()
  )!.version

const futureWindow = () => {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const first = new Date(Date.now() + 25 * 60 * 60 * 1000)
  first.setUTCSeconds(0, 0)
  return { startsAt, firstRunAt: first.toISOString() }
}

const proposalFor = (replacesVersion: number) => ({
  version: replacesVersion + 1,
  replacesVersion,
  ...futureWindow(),
  policyVersion: LEADERBOARD_REWARD_POLICY_VERSION,
  policyHash: LEADERBOARD_REWARD_POLICY_HASH,
  reason: 'Explicit reviewed UTC leaderboard cadence',
  reviewReference: `review:leaderboard:${crypto.randomUUID()}`
})

describe('leaderboard reward schedule operations', () => {
  it('separates proposal, independent activation, and disable authorities', async () => {
    const proposer = await actor('leaderboard-proposer')
    const approver = await actor('leaderboard-approver')
    const disableActor = await actor('leaderboard-disabler')
    const ordinaryPlayer = await actor('leaderboard-player')
    const replacesVersion = await latestVersion()
    const proposal = proposalFor(replacesVersion)
    const proposalKey = crypto.randomUUID()

    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeLeaderboardRewardSchedule',
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
          'GMProposeLeaderboardRewardSchedule',
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
          'GMProposeLeaderboardRewardSchedule',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(403)
    await grantSchedulePermission(proposer, 'PROPOSE')

    const [firstProposal, retriedProposal] = await Promise.all([
      rpcAs(
        proposer,
        'GMProposeLeaderboardRewardSchedule',
        proposal,
        proposalKey
      ),
      rpcAs(
        proposer,
        'GMProposeLeaderboardRewardSchedule',
        proposal,
        proposalKey
      )
    ])
    expect(firstProposal.status).toBe(200)
    expect(retriedProposal.status).toBe(200)
    const proposed = (await firstProposal.json()) as {
      schedule: {
        policyVersion: number
        policyHash: string
        proposal: { reviewReference: string }
      }
    }
    expect(proposed.schedule).toMatchObject({
      version: proposal.version,
      enabled: true,
      firstRunAt: proposal.firstRunAt,
      startsAt: proposal.startsAt,
      policyVersion: LEADERBOARD_REWARD_POLICY_VERSION,
      policyHash: LEADERBOARD_REWARD_POLICY_HASH,
      proposal: {
        status: 'DRAFT',
        createdByUserId: proposer,
        reviewReference: proposal.reviewReference
      }
    })
    expect(
      (
        await rpcAs('', 'GetNextRewardsTime', {}, undefined, false)
      ).status
    ).toBe(503)
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeLeaderboardRewardSchedule',
          { ...proposal, reason: 'different retry' },
          proposalKey
        )
      ).status
    ).toBe(409)

    await grantSchedulePermission(proposer, 'ACTIVATE')
    const activation = {
      version: proposal.version,
      policyVersion: proposed.schedule.policyVersion,
      policyHash: proposed.schedule.policyHash,
      reviewReference: proposed.schedule.proposal.reviewReference,
      reason: 'Independently verified exact cadence and policy digest'
    }
    expect(
      (
        await rpcAs(
          proposer,
          'GMActivateLeaderboardRewardSchedule',
          activation,
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    await grantAdmin(approver)
    await grantSchedulePermission(approver, 'ACTIVATE')
    expect(
      (
        await rpcAs(
          approver,
          'GMActivateLeaderboardRewardSchedule',
          { ...activation, policyHash: '0'.repeat(64) },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    const activationKey = crypto.randomUUID()
    const activated = await rpcAs(
      approver,
      'GMActivateLeaderboardRewardSchedule',
      activation,
      activationKey
    )
    expect(activated.status).toBe(200)
    expect(await activated.json()).toMatchObject({
      schedule: {
        enabled: true,
        proposal: {
          status: 'ACTIVE',
          createdByUserId: proposer,
          activatedByUserId: approver,
          activationReason: activation.reason
        }
      }
    })
    expect(
      (
        await rpcAs(
          approver,
          'GMActivateLeaderboardRewardSchedule',
          activation,
          activationKey
        )
      ).status
    ).toBe(200)
    expect(
      (
        await rpcAs('', 'GetNextRewardsTime', {}, undefined, false)
      ).status
    ).toBe(503)
    expect(
      await nextLeaderboardRewardTime(
        env.AUTH_DB,
        new Date(Date.parse(proposal.startsAt) + 1)
      )
    ).toEqual(new Date(proposal.firstRunAt))

    const listed = await rpcAs(
      approver,
      'GMListLeaderboardRewardSchedules',
      { version: proposal.version }
    )
    expect(listed.status).toBe(200)
    expect(await listed.json()).toMatchObject({
      schedules: [{ version: proposal.version, enabled: true }]
    })
    expect(
      (
        await rpcAs(
          ordinaryPlayer,
          'GMListLeaderboardRewardSchedules',
          { version: proposal.version }
        )
      ).status
    ).toBe(403)

    await grantAdmin(disableActor)
    await grantSchedulePermission(disableActor, 'DISABLE')
    const disableKey = crypto.randomUUID()
    const disableRequest = {
      version: proposal.version + 1,
      replacesVersion: proposal.version,
      reason: 'Immediate reviewed disable'
    }
    expect(
      await (
        await rpcAs(
          disableActor,
          'GMDisableLeaderboardRewardSchedule',
          disableRequest,
          disableKey
        )
      ).json()
    ).toMatchObject({
      schedule: {
        version: disableRequest.version,
        enabled: false,
        proposal: null
      }
    })
    expect(
      (
        await rpcAs('', 'GetNextRewardsTime', {}, undefined, false)
      ).status
    ).toBe(503)

    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT operation, status, actor_user_id
           FROM staff_leaderboard_reward_schedule_operations
           WHERE schedule_version IN (?, ?)
           ORDER BY schedule_version ASC,
                    CASE operation WHEN 'PROPOSE' THEN 0
                                   WHEN 'ACTIVATE' THEN 1 ELSE 2 END`
        )
          .bind(proposal.version, disableRequest.version)
          .all()
      ).results
    ).toEqual([
      { operation: 'PROPOSE', status: 'APPLIED', actor_user_id: proposer },
      { operation: 'ACTIVATE', status: 'APPLIED', actor_user_id: approver },
      { operation: 'DISABLE', status: 'APPLIED', actor_user_id: disableActor }
    ])
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) count FROM leaderboard_reward_cycles
           WHERE schedule_version IN (?, ?)`
        )
          .bind(proposal.version, disableRequest.version)
          .first<{ count: number }>()
      )!.count
    ).toBe(0)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_leaderboard_reward_schedule_audit
         WHERE operation_key = ?`
      )
        .bind(disableKey)
        .run()
    ).rejects.toThrow(
      'staff leaderboard reward schedule audit rows are immutable'
    )
  })

  it('rolls back invalid policy confirmation without partial state', async () => {
    const proposer = await actor('invalid-leaderboard-proposer')
    await grantAdmin(proposer)
    await grantSchedulePermission(proposer, 'PROPOSE')
    const replacesVersion = await latestVersion()
    const proposal = proposalFor(replacesVersion)
    const response = await rpcAs(
      proposer,
      'GMProposeLeaderboardRewardSchedule',
      { ...proposal, policyHash: 'f'.repeat(64) },
      crypto.randomUUID()
    )
    expect(response.status).toBe(400)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM leaderboard_reward_schedule_versions
            WHERE version = ?) schedules,
           (SELECT COUNT(*)
            FROM staff_leaderboard_reward_schedule_operations
            WHERE schedule_version = ?) operations,
           (SELECT COUNT(*) FROM staff_leaderboard_reward_schedule_audit
            WHERE schedule_version = ?) audits`
      )
        .bind(proposal.version, proposal.version, proposal.version)
        .first()
    ).toEqual({ schedules: 0, operations: 0, audits: 0 })
  })

  it('serializes competing proposal, activation, and disable decisions', async () => {
    const firstProposer = await actor('race-leaderboard-proposer-one')
    const secondProposer = await actor('race-leaderboard-proposer-two')
    const firstApprover = await actor('race-leaderboard-approver-one')
    const secondApprover = await actor('race-leaderboard-approver-two')
    const firstDisabler = await actor('race-leaderboard-disabler-one')
    const secondDisabler = await actor('race-leaderboard-disabler-two')
    for (const proposer of [firstProposer, secondProposer]) {
      await grantAdmin(proposer)
      await grantSchedulePermission(proposer, 'PROPOSE')
    }
    for (const approver of [firstApprover, secondApprover]) {
      await grantAdmin(approver)
      await grantSchedulePermission(approver, 'ACTIVATE')
    }
    for (const disabler of [firstDisabler, secondDisabler]) {
      await grantAdmin(disabler)
      await grantSchedulePermission(disabler, 'DISABLE')
    }

    const replacesVersion = await latestVersion()
    const sharedProposal = proposalFor(replacesVersion)
    const proposalResponses = await Promise.all([
      rpcAs(
        firstProposer,
        'GMProposeLeaderboardRewardSchedule',
        sharedProposal,
        crypto.randomUUID()
      ),
      rpcAs(
        secondProposer,
        'GMProposeLeaderboardRewardSchedule',
        sharedProposal,
        crypto.randomUUID()
      )
    ])
    expect(proposalResponses.map(response => response.status).sort()).toEqual([
      200,
      409
    ])
    const proposed = (await proposalResponses.find(
      response => response.status === 200
    )!.json()) as {
      schedule: {
        proposal: { createdByUserId: string; reviewReference: string }
      }
    }
    const activationRequest = {
      version: sharedProposal.version,
      policyVersion: LEADERBOARD_REWARD_POLICY_VERSION,
      policyHash: LEADERBOARD_REWARD_POLICY_HASH,
      reviewReference: proposed.schedule.proposal.reviewReference,
      reason: 'Race-tested independent approval'
    }
    const activationResponses = await Promise.all([
      rpcAs(
        firstApprover,
        'GMActivateLeaderboardRewardSchedule',
        activationRequest,
        crypto.randomUUID()
      ),
      rpcAs(
        secondApprover,
        'GMActivateLeaderboardRewardSchedule',
        activationRequest,
        crypto.randomUUID()
      )
    ])
    expect(
      activationResponses.map(response => response.status).sort()
    ).toEqual([200, 409])

    const disableRequest = {
      version: sharedProposal.version + 1,
      replacesVersion: sharedProposal.version,
      reason: 'Race-tested immediate disable'
    }
    const disableResponses = await Promise.all([
      rpcAs(
        firstDisabler,
        'GMDisableLeaderboardRewardSchedule',
        disableRequest,
        crypto.randomUUID()
      ),
      rpcAs(
        secondDisabler,
        'GMDisableLeaderboardRewardSchedule',
        disableRequest,
        crypto.randomUUID()
      )
    ])
    expect(disableResponses.map(response => response.status).sort()).toEqual([
      200,
      409
    ])

    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) count
           FROM staff_leaderboard_reward_schedule_operations
           WHERE schedule_version IN (?, ?)`
        )
          .bind(sharedProposal.version, disableRequest.version)
          .first<{ count: number }>()
      )!.count
    ).toBe(3)
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) count
           FROM staff_leaderboard_reward_schedule_audit
           WHERE schedule_version IN (?, ?)`
        )
          .bind(sharedProposal.version, disableRequest.version)
          .first<{ count: number }>()
      )!.count
    ).toBe(3)
  })
})
