import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { ConquestV2EconomyRepository } from '../src/conquest-v2-economy'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import {
  CONQUEST_V2_REWARD_POLICY_HASH,
  CONQUEST_V2_REWARD_POLICY_VERSION,
  conquestV2SilverCardCount
} from '../src/conquest-v2-reward-policy'
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

const grantSchedulePermission = async (
  userId: string,
  permission: 'PROPOSE' | 'ACTIVATE' | 'DISABLE'
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_conquest_v2_reward_schedule_permissions
       (user_id, permission, granted_by_user_id, reason, created_at)
     VALUES (?, ?, NULL, 'test bootstrap', ?)`
  )
    .bind(userId, permission, new Date().toISOString())
    .run()
}

const latestVersion = async () =>
  (await env.AUTH_DB.prepare(
    `SELECT COALESCE(MAX(version), 0) version
       FROM conquest_v2_reward_schedule_versions`
  ).first<{ version: number }>())!.version

const reviewInputs = async (admin: string) => {
  const response = await rpcAs(admin, 'GMListConquestV2RewardSchedules')
  expect(response.status).toBe(200)
  return (
    await response.json<{
      reviewInputs: {
        policyVersion: number
        policyHash: string
        settingsVersion: number
        settingsMutationId: string
        weightPerSilverCard: number
        silverCounts: number[]
        safeToPropose: boolean
        cardSets: Array<{ name: string; validFromSeason: number }>
      }
    }>()
  ).reviewInputs
}

const proposalFor = async (admin: string, replacesVersion: number) => {
  const inputs = await reviewInputs(admin)
  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const first = new Date(Date.now() + 25 * 60 * 60 * 1000)
  first.setUTCSeconds(0, 0)
  return {
    version: replacesVersion + 1,
    replacesVersion,
    startsAt,
    firstRunAt: first.toISOString(),
    firstSeason: 1,
    firstWeek: 1,
    deliveryDelaySeconds: 3600,
    rewardCardSets: ['CORE_SET'],
    policyVersion: inputs.policyVersion,
    policyHash: inputs.policyHash,
    settingsVersion: inputs.settingsVersion,
    settingsMutationId: inputs.settingsMutationId,
    weightPerSilverCard: inputs.weightPerSilverCard,
    silverCounts: inputs.silverCounts,
    reason: 'Explicit reviewed weekly Conquest V2 cadence',
    reviewReference: `review:conquest-v2:${crypto.randomUUID()}`
  }
}

describe('Conquest V2 reward schedule operations', () => {
  it('fails closed on source-default zero rewards and stale settings', async () => {
    const proposer = await actor('unsafe-conquest-v2-proposer')
    await grantAdmin(proposer)
    await grantSchedulePermission(proposer, 'PROPOSE')
    await new ConquestV2EconomyRepository(env.AUTH_DB).setConfig(proposer, {
      weightPerSilverCard: 0
    })
    const replacesVersion = await latestVersion()
    const unsafe = await proposalFor(proposer, replacesVersion)
    expect((await reviewInputs(proposer)).safeToPropose).toBe(false)
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestV2RewardSchedule',
          unsafe,
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)

    await new ConquestV2EconomyRepository(env.AUTH_DB).setConfig(proposer, {
      weightPerSilverCard: 1
    })
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestV2RewardSchedule',
          unsafe,
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_v2_reward_schedule_versions
            WHERE version = ?) schedules,
           (SELECT COUNT(*)
            FROM staff_conquest_v2_reward_schedule_operations
            WHERE schedule_version = ?) operations,
           (SELECT COUNT(*) FROM staff_conquest_v2_reward_schedule_audit
            WHERE schedule_version = ?) audits`
      )
        .bind(unsafe.version, unsafe.version, unsafe.version)
        .first()
    ).toEqual({ schedules: 0, operations: 0, audits: 0 })
  })

  it('separates proposal, independent activation, and disable authorities', async () => {
    const proposer = await actor('conquest-v2-proposer')
    const approver = await actor('conquest-v2-approver')
    const disabler = await actor('conquest-v2-disabler')
    const ordinaryPlayer = await actor('conquest-v2-player')
    await grantAdmin(proposer)
    await grantSchedulePermission(proposer, 'PROPOSE')
    await new ConquestV2EconomyRepository(env.AUTH_DB).setConfig(proposer, {
      weightPerSilverCard: 1
    })
    const proposal = await proposalFor(proposer, await latestVersion())
    const proposalKey = crypto.randomUUID()

    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestV2RewardSchedule',
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
          'GMProposeConquestV2RewardSchedule',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(403)
    const proposedResponse = await rpcAs(
      proposer,
      'GMProposeConquestV2RewardSchedule',
      proposal,
      proposalKey
    )
    expect(proposedResponse.status).toBe(200)
    const proposed = await proposedResponse.json<{
      schedule: {
        proposal: { reviewReference: string; createdByUserId: string }
      }
    }>()
    expect(proposed).toMatchObject({
      schedule: {
        proposal: { status: 'DRAFT', createdByUserId: proposer }
      }
    })
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeConquestV2RewardSchedule',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(200)

    const activation = {
      version: proposal.version,
      policyVersion: proposal.policyVersion,
      policyHash: proposal.policyHash,
      settingsVersion: proposal.settingsVersion,
      settingsMutationId: proposal.settingsMutationId,
      weightPerSilverCard: proposal.weightPerSilverCard,
      silverCounts: proposal.silverCounts,
      reviewReference: proposed.schedule.proposal.reviewReference,
      reason: 'Independently verified cadence, config revision, and quantities'
    }
    expect(
      (
        await rpcAs(
          proposer,
          'GMActivateConquestV2RewardSchedule',
          activation,
          crypto.randomUUID()
        )
      ).status
    ).toBe(403)
    await grantSchedulePermission(proposer, 'ACTIVATE')
    expect(
      (
        await rpcAs(
          proposer,
          'GMActivateConquestV2RewardSchedule',
          activation,
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    await grantAdmin(approver)
    await grantSchedulePermission(approver, 'ACTIVATE')
    const activationKey = crypto.randomUUID()
    const activated = await rpcAs(
      approver,
      'GMActivateConquestV2RewardSchedule',
      activation,
      activationKey
    )
    expect(activated.status).toBe(200)
    expect(await activated.json()).toMatchObject({
      schedule: {
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
        await rpcAs(ordinaryPlayer, 'GMListConquestV2RewardSchedules', {
          version: proposal.version
        })
      ).status
    ).toBe(403)

    await grantAdmin(disabler)
    await grantSchedulePermission(disabler, 'DISABLE')
    const disableKey = crypto.randomUUID()
    const disableRequest = {
      version: proposal.version + 1,
      replacesVersion: proposal.version,
      reason: 'Immediate reviewed Conquest V2 disable'
    }
    expect(
      await (
        await rpcAs(
          disabler,
          'GMDisableConquestV2RewardSchedule',
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
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_v2_reward_cycles
            WHERE schedule_version IN (?, ?)) cycles,
           (SELECT COUNT(*) FROM player_conquest_v2_reward_awards) awards,
           (SELECT COUNT(*)
            FROM player_conquest_v2_reward_inventory_grants) grants`
      )
        .bind(proposal.version, disableRequest.version)
        .first()
    ).toEqual({ cycles: 0, awards: 0, grants: 0 })
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM staff_conquest_v2_reward_schedule_audit
         WHERE operation_key = ?`
      )
        .bind(disableKey)
        .run()
    ).rejects.toThrow(
      'staff Conquest V2 reward schedule audit rows are immutable'
    )
  })

  it('rejects approval after the reviewed economy revision changes', async () => {
    const proposer = await actor('stale-conquest-v2-proposer')
    const approver = await actor('stale-conquest-v2-approver')
    await grantAdmin(proposer)
    await grantSchedulePermission(proposer, 'PROPOSE')
    await grantAdmin(approver)
    await grantSchedulePermission(approver, 'ACTIVATE')
    const economy = new ConquestV2EconomyRepository(env.AUTH_DB)
    await economy.setConfig(proposer, { weightPerSilverCard: 1 })
    const proposal = await proposalFor(proposer, await latestVersion())
    const response = await rpcAs(
      proposer,
      'GMProposeConquestV2RewardSchedule',
      proposal,
      crypto.randomUUID()
    )
    expect(response.status).toBe(200)
    await economy.setConfig(proposer, { weightPerSilverCard: 2 })
    expect(
      (
        await rpcAs(
          approver,
          'GMActivateConquestV2RewardSchedule',
          {
            version: proposal.version,
            policyVersion: proposal.policyVersion,
            policyHash: proposal.policyHash,
            settingsVersion: proposal.settingsVersion,
            settingsMutationId: proposal.settingsMutationId,
            weightPerSilverCard: proposal.weightPerSilverCard,
            silverCounts: proposal.silverCounts,
            reviewReference: proposal.reviewReference,
            reason: 'This approval must not survive an economy revision'
          },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM conquest_v2_reward_schedule_activations
         WHERE schedule_version = ?`
      )
        .bind(proposal.version)
        .first()
    ).toEqual({ status: 'DRAFT' })
  })

  it('serializes competing proposal, activation, and disable decisions', async () => {
    const proposerOne = await actor('race-conquest-v2-proposer-one')
    const proposerTwo = await actor('race-conquest-v2-proposer-two')
    const approverOne = await actor('race-conquest-v2-approver-one')
    const approverTwo = await actor('race-conquest-v2-approver-two')
    const disablerOne = await actor('race-conquest-v2-disabler-one')
    const disablerTwo = await actor('race-conquest-v2-disabler-two')
    for (const userId of [proposerOne, proposerTwo]) {
      await grantAdmin(userId)
      await grantSchedulePermission(userId, 'PROPOSE')
    }
    for (const userId of [approverOne, approverTwo]) {
      await grantAdmin(userId)
      await grantSchedulePermission(userId, 'ACTIVATE')
    }
    for (const userId of [disablerOne, disablerTwo]) {
      await grantAdmin(userId)
      await grantSchedulePermission(userId, 'DISABLE')
    }
    await new ConquestV2EconomyRepository(env.AUTH_DB).setConfig(proposerOne, {
      weightPerSilverCard: 1
    })
    const proposal = await proposalFor(proposerOne, await latestVersion())
    const proposalResponses = await Promise.all([
      rpcAs(
        proposerOne,
        'GMProposeConquestV2RewardSchedule',
        proposal,
        crypto.randomUUID()
      ),
      rpcAs(
        proposerTwo,
        'GMProposeConquestV2RewardSchedule',
        proposal,
        crypto.randomUUID()
      )
    ])
    expect(proposalResponses.map(response => response.status).sort()).toEqual([
      200, 409
    ])
    const proposed = await proposalResponses
      .find(response => response.status === 200)!
      .json<{
        schedule: { proposal: { reviewReference: string } }
      }>()
    const activation = {
      version: proposal.version,
      policyVersion: proposal.policyVersion,
      policyHash: proposal.policyHash,
      settingsVersion: proposal.settingsVersion,
      settingsMutationId: proposal.settingsMutationId,
      weightPerSilverCard: proposal.weightPerSilverCard,
      silverCounts: proposal.silverCounts,
      reviewReference: proposed.schedule.proposal.reviewReference,
      reason: 'Race-tested independent approval'
    }
    const activationResponses = await Promise.all([
      rpcAs(
        approverOne,
        'GMActivateConquestV2RewardSchedule',
        activation,
        crypto.randomUUID()
      ),
      rpcAs(
        approverTwo,
        'GMActivateConquestV2RewardSchedule',
        activation,
        crypto.randomUUID()
      )
    ])
    expect(activationResponses.map(response => response.status).sort()).toEqual(
      [200, 409]
    )

    const disable = {
      version: proposal.version + 1,
      replacesVersion: proposal.version,
      reason: 'Race-tested immediate disable'
    }
    const disableResponses = await Promise.all([
      rpcAs(
        disablerOne,
        'GMDisableConquestV2RewardSchedule',
        disable,
        crypto.randomUUID()
      ),
      rpcAs(
        disablerTwo,
        'GMDisableConquestV2RewardSchedule',
        disable,
        crypto.randomUUID()
      )
    ])
    expect(disableResponses.map(response => response.status).sort()).toEqual([
      200, 409
    ])
    expect(
      (await env.AUTH_DB.prepare(
        `SELECT COUNT(*) count
           FROM staff_conquest_v2_reward_schedule_operations
           WHERE schedule_version IN (?, ?)`
      )
        .bind(proposal.version, disable.version)
        .first<{ count: number }>())!.count
    ).toBe(3)
  })

  it('exposes the exact source-derived review vector', async () => {
    const admin = await actor('conquest-v2-reviewer')
    await grantAdmin(admin)
    await new ConquestV2EconomyRepository(env.AUTH_DB).setConfig(admin, {
      weightPerSilverCard: 1
    })
    const inputs = await reviewInputs(admin)
    expect(inputs).toMatchObject({
      policyVersion: CONQUEST_V2_REWARD_POLICY_VERSION,
      policyHash: CONQUEST_V2_REWARD_POLICY_HASH,
      weightPerSilverCard: 1,
      safeToPropose: true
    })
    expect(inputs.silverCounts).toEqual(
      Array.from({ length: 11 }, (_, level) =>
        conquestV2SilverCardCount(1, level)
      )
    )
    expect(inputs.cardSets.map(cardSet => cardSet.name)).toContain('CORE_SET')
  })
})
