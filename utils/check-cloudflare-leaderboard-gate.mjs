import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const leaderboardGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`leaderboard ${label} is missing: ${token}`)
      }
    }
  }
  requireTokens(evidence.policy, 'policy', [
    'LEADERBOARD_REWARD_POLICY_VERSION',
    'LEADERBOARD_REWARD_POLICY_HASH',
    'cloud-weasel-offchain-leaderboard-v1',
    'calculatedLeaderboardRewardPolicyHash'
  ])
  requireTokens(evidence.activationMigration, 'activation schema', [
    'leaderboard_reward_schedule_activations',
    'activated_by_user_id <> created_by_user_id',
    'leaderboard reward policy activation is invalid',
    'active leaderboard reward policy receipt required'
  ])
  requireTokens(evidence.operationsMigration, 'operations schema', [
    'CREATE TABLE staff_leaderboard_reward_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')",
    'CREATE TABLE staff_leaderboard_reward_schedule_operations',
    'CREATE UNIQUE INDEX staff_leaderboard_reward_schedule_operations_once_idx',
    'CREATE TRIGGER staff_leaderboard_reward_schedule_operation_apply_guard',
    'activation.activated_at = NEW.created_at',
    'activation.activated_at <= schedule.starts_at',
    'CREATE TABLE staff_leaderboard_reward_schedule_audit',
    'staff leaderboard reward schedule audit rows are immutable'
  ])
  requireTokens(evidence.operations, 'operations adapter', [
    "LeaderboardRewardScheduleOperation =\n  | 'PROPOSE'\n  | 'ACTIVATE'\n  | 'DISABLE'",
    'version !== replacesVersion + 1',
    'LEADERBOARD_REWARD_POLICY_HASH',
    'createdByUserId === actorUserId',
    'startsAt must be in the future',
    'leaderboard schedule activation is too late',
    'firstRunAt must be in the future',
    "'x-cloud-weasel-operation-key'"
  ])
  requireTokens(evidence.staff, 'staff authority', [
    'requireLeaderboardRewardScheduleWrite(',
    'staff_leaderboard_reward_schedule_permissions'
  ])
  requireTokens(evidence.api, 'RPC surface', [
    "case 'GMListLeaderboardRewardSchedules'",
    "case 'GMProposeLeaderboardRewardSchedule'",
    "case 'GMActivateLeaderboardRewardSchedule'",
    "case 'GMDisableLeaderboardRewardSchedule'"
  ])
  requireTokens(evidence.handoffMigration, 'Workflow handoff schema', [
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
  ])
  requireTokens(evidence.orchestration, 'Workflow and Queue runtime', [
    'class LeaderboardRewardWorkflow extends WorkflowEntrypoint',
    'dispatchDueLeaderboardRewards',
    'acceptDueLeaderboardRewardCycle',
    'publishUnappliedLeaderboardRewards',
    'applyLeaderboardRewardQueueMessage',
    'handleLeaderboardRewardQueue',
    'completeLeaderboardRewardCycle',
    "kind: 'LEADERBOARD_REWARD'",
    'message.retry()'
  ])
  requireTokens(evidence.rewardWorker, 'reward business runtime', [
    'snapshotLeaderboardRewardCycle',
    'deliverLeaderboardRewardPlayer',
    'leaderboardRewardDeliveryComplete',
    'completeLeaderboardRewardCycle'
  ])
  requireTokens(evidence.worker, 'scheduled and Queue routing', [
    'dispatchDueLeaderboardRewards(env)',
    'LEADERBOARD_REWARD_QUEUE_NAME',
    'handleLeaderboardRewardQueue(',
    'LeaderboardRewardWorkflow'
  ])
  requireTokens(evidence.tests, 'effect tests', [
    'recovers a D1-to-Workflow creation gap after a later schedule disable',
    'runs one Workflow through Queue receipts and one guarded rank reset',
    'isolates Queue players and recovers attempt seven after six failures',
    'does not preserve the old fixed player batch as product behavior',
    'does not abandon an entitlement at the source attempt ceiling'
  ])
  if (evidence.worker?.includes('runDueLeaderboardRewards(env.AUTH_DB)')) {
    errors.push('leaderboard cron still performs player delivery directly')
  }
  for (const copiedMechanism of [
    'MAX_PLAYERS_PER_RUN',
    'MAX_ATTEMPTS',
    'attempt_count = attempt_count + 1'
  ]) {
    if (evidence.rewardWorker?.includes(copiedMechanism)) {
      errors.push(
        `leaderboard runtime still copies source execution mechanism: ${copiedMechanism}`
      )
    }
  }
  if (evidence.config !== undefined) {
    const workflows = evidence.config?.workflows ?? []
    const producers = evidence.config?.queues?.producers ?? []
    const consumers = evidence.config?.queues?.consumers ?? []
    const workflow = workflows.find(
      value => value.binding === 'LEADERBOARD_REWARD_WORKFLOW'
    )
    const producer = producers.find(
      value => value.binding === 'LEADERBOARD_REWARD_QUEUE'
    )
    const consumer = consumers.find(value => value.queue === producer?.queue)
    if (
      workflow?.class_name !== 'LeaderboardRewardWorkflow' ||
      !workflow.name ||
      !producer?.queue ||
      !consumer?.dead_letter_queue
    ) {
      errors.push(
        'leaderboard Workflow, Queue producer, consumer, and DLQ must fail closed together'
      )
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    policy,
    activationMigration,
    operationsMigration,
    operations,
    staff,
    api,
    handoffMigration,
    orchestration,
    rewardWorker,
    worker,
    tests,
    configText
  ] = await Promise.all([
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-policy.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0088_leaderboard_reward_policy_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0096_leaderboard_reward_schedule_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/src/leaderboard-reward-schedule-operations.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0122_leaderboard_reward_workflow_handoffs.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-orchestration.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-worker.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/test/leaderboard-reward-worker.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'wrangler.jsonc'), 'utf8')
  ])
  const errors = leaderboardGateErrors({
    policy,
    activationMigration,
    operationsMigration,
    operations,
    staff,
    api,
    handoffMigration,
    orchestration,
    rewardWorker,
    worker,
    tests,
    config: JSON.parse(configText)
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Leaderboard cadence and Workflow/Queue delivery preserve policy, independent approval, exact outcomes, and re-drivable failure\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
