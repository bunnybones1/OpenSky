import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
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
  permission: 'PROPOSE' | 'ACTIVATE'
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_referral_sticker_schedule_permissions
       (user_id, permission, granted_by_user_id, reason, created_at)
     VALUES (?, ?, NULL, 'test bootstrap', ?)`
  )
    .bind(userId, permission, new Date().toISOString())
    .run()
}

describe('referral sticker schedule operations', () => {
  it('imports a reviewed manifest but exposes and rewards it only after independent activation', async () => {
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*)
            FROM staff_referral_sticker_schedule_permissions) permissions,
           (SELECT COUNT(*)
            FROM staff_referral_sticker_schedule_operations) operations,
           (SELECT COUNT(*)
            FROM staff_referral_sticker_schedule_audit) audits`
      ).first()
    ).toEqual({ permissions: 0, operations: 0, audits: 0 })

    const proposer = await actor('sticker-proposer')
    const firstApprover = await actor('sticker-approver-a')
    const secondApprover = await actor('sticker-approver-b')
    const ordinaryPlayer = await actor('sticker-player')
    for (const admin of [proposer, firstApprover, secondApprover]) {
      await grantAdmin(admin)
    }
    await grantSchedulePermission(proposer, 'PROPOSE')
    await grantSchedulePermission(proposer, 'ACTIVATE')
    await grantSchedulePermission(firstApprover, 'ACTIVATE')
    await grantSchedulePermission(secondApprover, 'ACTIVATE')

    const season = seasonFromDate()
    const entries = [
      { tokenId: 9_800_002, requiredPoints: 40 },
      { tokenId: 9_800_001, requiredPoints: 10 }
    ]
    const canonicalEntries = [entries[1], entries[0]]
    const proposal = {
      version: 1,
      replacesVersion: 0,
      season,
      entries,
      reason: 'Reviewed current-season referral sticker thresholds',
      reviewReference: `review:referral-stickers:${crypto.randomUUID()}`
    }
    const proposalKey = crypto.randomUUID()

    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeReferralStickerSchedule',
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
          'GMProposeReferralStickerSchedule',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(403)
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeReferralStickerSchedule',
          { ...proposal, season: season + 1 },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)

    const proposedResponse = await rpcAs(
      proposer,
      'GMProposeReferralStickerSchedule',
      proposal,
      proposalKey
    )
    expect(proposedResponse.status).toBe(200)
    expect(await proposedResponse.json()).toMatchObject({
      schedule: {
        version: 1,
        season,
        status: 'DRAFT',
        entries: canonicalEntries,
        createdByUserId: proposer,
        reviewReference: proposal.reviewReference
      }
    })
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeReferralStickerSchedule',
          proposal,
          proposalKey
        )
      ).status
    ).toBe(200)
    expect(
      (
        await rpcAs(
          proposer,
          'GMProposeReferralStickerSchedule',
          { ...proposal, reason: 'operation key reuse must fail' },
          proposalKey
        )
      ).status
    ).toBe(409)

    expect(
      await env.AUTH_DB.prepare(
        `SELECT token_id, required_points, season FROM content_stickers
         WHERE token_id IN (?, ?) ORDER BY required_points, token_id`
      )
        .bind(canonicalEntries[0].tokenId, canonicalEntries[1].tokenId)
        .all()
    ).toMatchObject({
      results: canonicalEntries.map(entry => ({
        token_id: entry.tokenId,
        required_points: entry.requiredPoints,
        season
      }))
    })
    expect(
      await (await rpcAs(ordinaryPlayer, 'GetStickers', {})).json()
    ).toEqual({ stickers: [] })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM referral_sticker_reward_batches) batches,
           (SELECT COUNT(*) FROM referral_sticker_reward_awards) awards,
           (SELECT COUNT(*)
            FROM referral_sticker_reward_inventory_grants) grants`
      ).first()
    ).toEqual({ batches: 0, awards: 0, grants: 0 })

    const activation = {
      version: 1,
      season,
      entries,
      reviewReference: proposal.reviewReference,
      reason: 'Independent manifest approval'
    }
    expect(
      (
        await rpcAs(
          proposer,
          'GMActivateReferralStickerSchedule',
          activation,
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(
          firstApprover,
          'GMActivateReferralStickerSchedule',
          {
            ...activation,
            entries: [
              { tokenId: canonicalEntries[0].tokenId, requiredPoints: 11 }
            ]
          },
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)

    await env.AUTH_DB.prepare(
      `UPDATE content_stickers SET required_points = 11
       WHERE season = ? AND token_id = ?`
    )
      .bind(season, canonicalEntries[0].tokenId)
      .run()
    expect(
      (
        await rpcAs(
          firstApprover,
          'GMActivateReferralStickerSchedule',
          activation,
          crypto.randomUUID()
        )
      ).status
    ).toBe(400)
    await env.AUTH_DB.prepare(
      `UPDATE content_stickers SET required_points = 10
       WHERE season = ? AND token_id = ?`
    )
      .bind(season, canonicalEntries[0].tokenId)
      .run()

    const decisions = await Promise.all([
      rpcAs(
        firstApprover,
        'GMActivateReferralStickerSchedule',
        activation,
        crypto.randomUUID()
      ),
      rpcAs(
        secondApprover,
        'GMActivateReferralStickerSchedule',
        activation,
        crypto.randomUUID()
      )
    ])
    expect(decisions.map(response => response.status).sort()).toEqual([
      200, 409
    ])

    expect(
      await (await rpcAs(ordinaryPlayer, 'GetStickers', {})).json()
    ).toMatchObject({
      stickers: canonicalEntries.map(entry => ({
        tokenId: entry.tokenId,
        requiredPoints: entry.requiredPoints,
        season
      }))
    })
    expect(
      (await rpcAs(ordinaryPlayer, 'GMListReferralStickerSchedules')).status
    ).toBe(403)
    const listResponse = await rpcAs(
      firstApprover,
      'GMListReferralStickerSchedules'
    )
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      currentSeason: season,
      schedules: [
        { version: 1, season, status: 'ACTIVE', entries: canonicalEntries }
      ]
    })

    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*)
            FROM staff_referral_sticker_schedule_operations
            WHERE status = 'APPLIED') operations,
           (SELECT COUNT(*)
            FROM staff_referral_sticker_schedule_audit) audits,
           (SELECT COUNT(*) FROM referral_sticker_reward_batches) batches,
           (SELECT COUNT(*) FROM referral_sticker_reward_awards) awards,
           (SELECT COUNT(*)
            FROM referral_sticker_reward_inventory_grants) grants`
      ).first()
    ).toEqual({ operations: 2, audits: 2, batches: 0, awards: 0, grants: 0 })
    await expect(
      env.AUTH_DB.prepare(
        'DELETE FROM staff_referral_sticker_schedule_audit'
      ).run()
    ).rejects.toThrow('audit rows are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_referral_sticker_schedule_operations
         SET request_json = '{}'`
      ).run()
    ).rejects.toThrow('operations are immutable')
  })
})
