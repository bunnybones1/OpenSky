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
  ].join('\n'),
  handoffMigration: [
    'CREATE TABLE leaderboard_reward_cycle_orchestrations',
    "workflow_instance_id = 'leaderboard-cycle-' || cycle_id",
    'CREATE TRIGGER leaderboard_reward_cycle_orchestration_insert_guard',
    'CREATE TRIGGER leaderboard_reward_cycle_orchestration_update_guard',
    "award.application_status = 'APPLIED'",
    'CREATE TABLE leaderboard_reward_delivery_failures',
    'CREATE TRIGGER leaderboard_reward_delivery_failures_insert_guard',
    "cycle.status = 'DELIVERING'",
    'orchestration.completed_at IS NULL',
    'leaderboard delivery failures are immutable'
  ].join('\n'),
  orchestration: [
    'class LeaderboardRewardWorkflow extends WorkflowEntrypoint',
    'dispatchDueLeaderboardRewards',
    'acceptDueLeaderboardRewardCycle',
    'publishUnappliedLeaderboardRewards',
    'applyLeaderboardRewardQueueMessage',
    'handleLeaderboardRewardQueue',
    'completeLeaderboardRewardCycle',
    "kind: 'LEADERBOARD_REWARD'",
    'message.retry()'
  ].join('\n'),
  rewardWorker: [
    'snapshotLeaderboardRewardCycle',
    'deliverLeaderboardRewardPlayer',
    'leaderboardRewardDeliveryComplete',
    'completeLeaderboardRewardCycle'
  ].join('\n'),
  worker: [
    'dispatchDueLeaderboardRewards(env)',
    'LEADERBOARD_REWARD_QUEUE_NAME',
    'handleLeaderboardRewardQueue(',
    'LeaderboardRewardWorkflow'
  ].join('\n'),
  tests: [
    'recovers a D1-to-Workflow creation gap after a later schedule disable',
    'runs one Workflow through Queue receipts and one guarded rank reset',
    'isolates Queue players and recovers attempt seven after six failures',
    'does not preserve the old fixed player batch as product behavior',
    'does not abandon an entitlement at the source attempt ceiling'
  ].join('\n'),
  config: {
    workflows: [
      {
        name: 'cloud-weasel-leaderboard-rewards',
        binding: 'LEADERBOARD_REWARD_WORKFLOW',
        class_name: 'LeaderboardRewardWorkflow'
      }
    ],
    queues: {
      producers: [
        {
          queue: 'cloud-weasel-leaderboard-reward-delivery',
          binding: 'LEADERBOARD_REWARD_QUEUE'
        }
      ],
      consumers: [
        {
          queue: 'cloud-weasel-leaderboard-reward-delivery',
          dead_letter_queue: 'cloud-weasel-leaderboard-reward-delivery-dlq'
        }
      ]
    }
  }
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

test('rejects direct cron delivery and copied retry or player limits', () => {
  const evidence = validEvidence()
  assert.ok(
    leaderboardGateErrors({
      ...evidence,
      worker: `${evidence.worker}\nrunDueLeaderboardRewards(env.AUTH_DB)`
    }).some(error => error.includes('cron'))
  )
  for (const copied of [
    'MAX_PLAYERS_PER_RUN',
    'MAX_ATTEMPTS',
    'attempt_count = attempt_count + 1'
  ]) {
    assert.ok(
      leaderboardGateErrors({
        ...evidence,
        rewardWorker: `${evidence.rewardWorker}\n${copied}`
      }).some(error => error.includes(copied))
    )
  }
})

test('requires the Workflow, Queue, consumer, and DLQ together', () => {
  const evidence = validEvidence()
  for (const config of [
    { ...evidence.config, workflows: [] },
    {
      ...evidence.config,
      queues: { ...evidence.config.queues, producers: [] }
    },
    {
      ...evidence.config,
      queues: {
        ...evidence.config.queues,
        consumers: [
          {
            queue: 'cloud-weasel-leaderboard-reward-delivery'
          }
        ]
      }
    }
  ]) {
    assert.ok(
      leaderboardGateErrors({ ...evidence, config }).some(error =>
        error.includes('fail closed')
      )
    )
  }
})
