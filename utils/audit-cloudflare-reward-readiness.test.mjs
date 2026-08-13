import assert from 'node:assert/strict'
import test from 'node:test'

import {
  REWARD_READINESS_QUERY,
  rewardReadiness,
  rewardReadinessRow
} from './audit-cloudflare-reward-readiness.mjs'

const productionShape = () => ({
  conquest_pools_total: 0,
  conquest_pools_approved: 0,
  conquest_verified_pools: 0,
  leaderboard_schedules_total: 0,
  leaderboard_schedules_enabled: 0,
  leaderboard_ready: 0,
  conquest_v2_schedules_total: 0,
  conquest_v2_schedules_enabled: 0,
  conquest_v2_ready: 0,
  referral_schedules_total: 0,
  referral_schedules_active: 0,
  skypass_policies_total: 1,
  skypass_policies_active: 1
})

test('uses one read-only scalar SELECT', () => {
  assert.match(REWARD_READINESS_QUERY, /^SELECT/)
  assert.doesNotMatch(
    REWARD_READINESS_QUERY,
    /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i
  )
  assert.match(REWARD_READINESS_QUERY, /conquest_verified_queue_pools[\s\S]*ends_at > strftime/)
  assert.match(REWARD_READINESS_QUERY, /conquest_approved_active_reward_pools/)
  assert.doesNotMatch(REWARD_READINESS_QUERY, /conquest_reward_pools WHERE status = 'ACTIVE'/)
  assert.match(REWARD_READINESS_QUERY, /ORDER BY version DESC LIMIT 1/)
  assert.match(REWARD_READINESS_QUERY, /activation\.policy_hash = '[0-9a-f]{64}'/)
  assert.match(REWARD_READINESS_QUERY, /2021-11-22T14:00:00\.000Z/)
  assert.match(REWARD_READINESS_QUERY, /skypass_reward_active_policies/)
})

test('classifies the observed production activation shape without treating schedulers as policy', () => {
  const report = rewardReadiness(productionShape())
  assert.deepEqual(report.errors, [])
  assert.deepEqual(
    Object.fromEntries(report.tracks.map(row => [row.track, row.status])),
    {
      'Account bootstrap and starter deck': 'core-live',
      'Match XP and level unlocks': 'core-live',
      'Quest XP and basic SkyPass progression': 'core-live',
      'SkyPass claim contents': 'active',
      'Original Conquest card settlement': 'dormant-policy',
      'Weekly leaderboard rewards': 'dormant-policy',
      'Conquest V2 weekly treasure': 'dormant-policy',
      'Referral sticker rewards': 'dormant-policy'
    }
  )
})

test('distinguishes configuration, activation, readiness, and fully active tracks', () => {
  const configured = productionShape()
  Object.assign(configured, {
    conquest_pools_total: 2,
    conquest_pools_approved: 1,
    leaderboard_schedules_total: 1,
    leaderboard_schedules_enabled: 1,
    conquest_v2_schedules_total: 1,
    conquest_v2_schedules_enabled: 1,
    referral_schedules_total: 1
  })
  let statuses = Object.fromEntries(
    rewardReadiness(configured).tracks.map(row => [row.track, row.status])
  )
  assert.equal(statuses['Original Conquest card settlement'], 'dormant-readiness')
  assert.equal(statuses['Weekly leaderboard rewards'], 'dormant-readiness')
  assert.equal(statuses['Conquest V2 weekly treasure'], 'dormant-readiness')
  assert.equal(statuses['Referral sticker rewards'], 'dormant-activation')

  Object.assign(configured, {
    conquest_verified_pools: 1,
    leaderboard_ready: 1,
    conquest_v2_ready: 1,
    referral_schedules_active: 1
  })
  statuses = Object.fromEntries(
    rewardReadiness(configured).tracks.map(row => [row.track, row.status])
  )
  for (const track of [
    'Original Conquest card settlement',
    'Weekly leaderboard rewards',
    'Conquest V2 weekly treasure',
    'Referral sticker rewards'
  ]) {
    assert.equal(statuses[track], 'active')
  }
})

test('rejects malformed and contradictory readiness state', () => {
  const malformed = productionShape()
  malformed.skypass_policies_active = 2
  malformed.conquest_verified_pools = -1
  malformed.leaderboard_ready = 0.5
  const errors = rewardReadiness(malformed).errors
  assert.ok(errors.some(error => error.includes('conquest_verified_pools')))
  assert.ok(errors.some(error => error.includes('leaderboard_ready')))
  assert.ok(errors.some(error => error.includes('skypass_policies_active')))
})

test('parses exactly one successful Wrangler result row', () => {
  const row = productionShape()
  assert.deepEqual(
    rewardReadinessRow(
      JSON.stringify([
        {
          results: [row],
          success: true,
          meta: { changed_db: false, changes: 0 }
        }
      ])
    ),
    row
  )
  assert.throws(
    () => rewardReadinessRow([{ results: [], success: true }]),
    /one successful row/
  )
  assert.throws(
    () =>
      rewardReadinessRow([
        {
          results: [row],
          success: true,
          meta: { changed_db: true, changes: 1 }
        }
      ]),
    /one successful row/
  )
})
