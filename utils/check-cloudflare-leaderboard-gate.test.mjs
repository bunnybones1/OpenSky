import assert from 'node:assert/strict'
import test from 'node:test'

import { leaderboardGateErrors } from './check-cloudflare-leaderboard-gate.mjs'

const validEvidence = () => ({
  policy: [
    'LEADERBOARD_REWARD_POLICY_VERSION',
    'LEADERBOARD_REWARD_POLICY_HASH',
    'cloud-weasel-offchain-leaderboard-v1',
    'calculatedLeaderboardRewardPolicyHash'
  ].join('\n'),
  activationMigration: [
    'leaderboard_reward_schedule_activations',
    'activated_by_user_id <> created_by_user_id',
    'leaderboard reward policy activation is invalid',
    'active leaderboard reward policy receipt required'
  ].join('\n'),
  operationsMigration: [
    'CREATE TABLE staff_leaderboard_reward_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')",
    'CREATE TABLE staff_leaderboard_reward_schedule_operations',
    'CREATE UNIQUE INDEX staff_leaderboard_reward_schedule_operations_once_idx',
    'CREATE TRIGGER staff_leaderboard_reward_schedule_operation_apply_guard',
    'activation.activated_at = NEW.created_at',
    'activation.activated_at <= schedule.starts_at',
    'CREATE TABLE staff_leaderboard_reward_schedule_audit',
    'staff leaderboard reward schedule audit rows are immutable'
  ].join('\n'),
  operations: [
    "LeaderboardRewardScheduleOperation =\n  | 'PROPOSE'\n  | 'ACTIVATE'\n  | 'DISABLE'",
    'version !== replacesVersion + 1',
    'LEADERBOARD_REWARD_POLICY_HASH',
    'createdByUserId === actorUserId',
    'startsAt must be in the future',
    'leaderboard schedule activation is too late',
    'firstRunAt must be in the future',
    "'x-cloud-weasel-operation-key'"
  ].join('\n'),
  staff: [
    'requireLeaderboardRewardScheduleWrite(',
    'staff_leaderboard_reward_schedule_permissions'
  ].join('\n'),
  api: [
    "case 'GMListLeaderboardRewardSchedules'",
    "case 'GMProposeLeaderboardRewardSchedule'",
    "case 'GMActivateLeaderboardRewardSchedule'",
    "case 'GMDisableLeaderboardRewardSchedule'"
  ].join('\n')
})

test('accepts the reviewed leaderboard operations boundary', () => {
  assert.deepEqual(leaderboardGateErrors(validEvidence()), [])
})

test('fails closed when any leaderboard evidence source disappears', () => {
  const evidence = validEvidence()
  for (const source of Object.keys(evidence)) {
    assert.ok(
      leaderboardGateErrors({ ...evidence, [source]: '' }).length > 0,
      `${source} removal must fail the gate`
    )
  }
})

test('fails closed when monotonic version or independent approval disappears', () => {
  const evidence = validEvidence()
  assert.ok(
    leaderboardGateErrors({
      ...evidence,
      operations: evidence.operations.replace(
        'version !== replacesVersion + 1',
        ''
      )
    }).some(error => error.includes('replacesVersion'))
  )
  assert.ok(
    leaderboardGateErrors({
      ...evidence,
      operationsMigration: evidence.operationsMigration.replace(
        'activation.activated_at = NEW.created_at',
        ''
      )
    }).some(error => error.includes('activated_at'))
  )
})
