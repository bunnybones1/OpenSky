import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REVIEWED_REFERRAL_STICKER_WORKFLOW =
  'cloud-weasel-referral-sticker-rewards'
export const REVIEWED_REFERRAL_STICKER_QUEUE =
  'cloud-weasel-referral-sticker-reward-delivery'
export const REVIEWED_REFERRAL_STICKER_DLQ =
  'cloud-weasel-referral-sticker-reward-delivery-dlq'

export const referralStickerGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`referral sticker ${label} is missing: ${token}`)
      }
    }
  }
  requireTokens(evidence.activationMigration, 'activation schema', [
    'referral_sticker_active_schedule_entries',
    'activated_by_user_id <> created_by_user_id',
    'referral sticker schedule activation is invalid',
    'active referral sticker schedule receipt required'
  ])
  requireTokens(evidence.operationsMigration, 'operations schema', [
    'CREATE TABLE staff_referral_sticker_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE')",
    'CREATE TABLE staff_referral_sticker_schedule_operations',
    'CREATE UNIQUE INDEX staff_referral_sticker_schedule_operations_once_idx',
    'CREATE TRIGGER staff_referral_sticker_schedule_operation_apply_guard',
    "schedule.status = 'ACTIVE'",
    'schedule.created_by_user_id <> NEW.actor_user_id',
    'CREATE TABLE staff_referral_sticker_schedule_audit',
    'staff referral sticker schedule audit rows are immutable'
  ])
  requireTokens(evidence.operations, 'operations adapter', [
    "ReferralStickerScheduleOperation = 'PROPOSE' | 'ACTIVATE'",
    'scheduleVersion !== replacesVersion + 1',
    'proposal must target current season',
    'activation must target current season',
    'before.createdByUserId === actorUserId',
    'JSON.stringify(before.entries) !== JSON.stringify(entries)',
    'INSERT INTO content_stickers',
    "'x-cloud-weasel-operation-key'"
  ])
  requireTokens(evidence.content, 'public visibility', [
    'FROM referral_sticker_active_schedule_entries WHERE season = ?'
  ])
  requireTokens(evidence.staff, 'staff authority', [
    'requireReferralStickerScheduleWrite(',
    'staff_referral_sticker_schedule_permissions'
  ])
  requireTokens(evidence.api, 'RPC surface', [
    "case 'GMListReferralStickerSchedules'",
    "case 'GMProposeReferralStickerSchedule'",
    "case 'GMActivateReferralStickerSchedule'"
  ])
  requireTokens(evidence.runtime, 'Workflow runtime', [
    'WorkflowEntrypoint',
    REVIEWED_REFERRAL_STICKER_QUEUE,
    'SOURCE_SWEEP_INTERVAL_MS = 60 * 60 * 1000',
    'QUEUE_PUBLISH_PAGE_SIZE = 100',
    "kind: 'PREPARE'",
    "kind: 'DELIVER'",
    'Object.keys(record).sort().join',
    'acceptDueReferralStickerRewardSweep',
    'snapshotAcceptedReferralStickerRewardSweep',
    'publishPendingReferralStickerPreparations',
    'publishDueReferralStickerDeliveries',
    'runReferralStickerRewardWorkflow',
    'dispatchDueReferralStickerRewards',
    'ReferralStickerRewardWorkflow',
    'instance.restart()',
    'step.sleepUntil(',
    'sendBatch(',
    'carryReferralPointsIntoSeason',
    'prepareReferralStickerRewardForUser',
    'deliverReferralStickerRewardBatch',
    'referral_sticker_reward_queue_failures',
    'message.retry()'
  ])
  for (const forbidden of [
    'MAX_PREPARATIONS_PER_RUN',
    'MAX_DELIVERIES_PER_RUN',
    'attempts >= 5',
    'attempts < 5',
    "status = 'DEAD'",
    'runReferralStickerRewards(env.AUTH_DB)'
  ]) {
    if (evidence.runtime?.includes(forbidden)) {
      errors.push('referral sticker runtime restored copied runner authority')
    }
  }

  requireTokens(evidence.workflowMigration, 'Workflow migration', [
    'CREATE TABLE referral_sticker_0126_migration_guard',
    "status IN ('PREPARING', 'DELIVERING')",
    'CREATE TABLE referral_sticker_reward_sweeps',
    "origin IN ('SCHEDULE', 'MIGRATION')",
    'CREATE TABLE referral_sticker_reward_sweep_players',
    "status IN ('PENDING', 'APPLIED')",
    "outcome IN ('NO_AWARD', 'BATCH')",
    'CREATE TABLE referral_sticker_reward_sweep_deliveries',
    'CREATE TABLE referral_sticker_reward_queue_failures',
    'UNIQUE (message_id, delivery_attempt)',
    "'referral-sticker-recovery-' || batch_row.id",
    'referral_sticker_reward_sweeps_insert_guard',
    'referral_sticker_reward_sweeps_snapshot_guard',
    'referral_sticker_reward_sweeps_completion_guard',
    'referral_sticker_reward_sweep_players_update_guard',
    'referral_sticker_reward_sweep_deliveries_update_guard',
    'referral_sticker_reward_queue_failures_insert_guard',
    'referral sticker reward sweeps are immutable',
    'referral sticker Queue failures are immutable'
  ])
  for (const forbidden of [
    "status IN ('PENDING', 'APPLIED', 'DEAD')",
    'attempts BETWEEN 1 AND 5',
    "status = 'DEAD'"
  ]) {
    if (evidence.workflowMigration?.includes(forbidden)) {
      errors.push('referral sticker migration retains terminal retry authority')
    }
  }

  requireTokens(evidence.scheduler, 'main Worker routing', [
    'dispatchDueReferralStickerRewards(env)',
    'if (batch.queue === REFERRAL_STICKER_REWARD_QUEUE_NAME)',
    'handleReferralStickerRewardQueue(',
    'ReferralStickerRewardWorkflow'
  ])
  if (evidence.scheduler?.includes('runReferralStickerRewards(env.AUTH_DB)')) {
    errors.push('main Worker cron directly applies referral sticker rewards')
  }

  if (evidence.config !== undefined) {
    const workflows = evidence.config.workflows ?? []
    const producers = evidence.config.queues?.producers ?? []
    const consumers = evidence.config.queues?.consumers ?? []
    if (
      workflows.filter(
        value =>
          value.name === REVIEWED_REFERRAL_STICKER_WORKFLOW &&
          value.binding === 'REFERRAL_STICKER_REWARD_WORKFLOW' &&
          value.class_name === 'ReferralStickerRewardWorkflow'
      ).length !== 1 ||
      producers.filter(
        value =>
          value.binding === 'REFERRAL_STICKER_REWARD_QUEUE' &&
          value.queue === REVIEWED_REFERRAL_STICKER_QUEUE
      ).length !== 1 ||
      consumers.filter(
        value =>
          value.queue === REVIEWED_REFERRAL_STICKER_QUEUE &&
          value.dead_letter_queue === REVIEWED_REFERRAL_STICKER_DLQ
      ).length !== 1
    ) {
      errors.push(
        'reviewed referral sticker Workflow/Queue/DLQ topology is incomplete'
      )
    }
  }

  requireTokens(evidence.workflowTest, 'Workflow effect tests', [
    "it('accepts at source cadence and fails closed before binding-less acceptance'",
    "it('publishes every player through platform-sized pages, not source caps'",
    "it('publishes atomic offchain inventory only after the 23-hour boundary'",
    "it('prepares a later tier while the earlier sweep is sleeping'",
    "it('acks poison and duplicates while retaining valid failures beyond source retries'",
    'attempts: 101',
    "it('runs the Workflow through durable preparation, sleep, delivery, and completion'",
    "it('restarts terminal Workflows whose D1 sweep is incomplete'"
  ])
  requireTokens(evidence.productionRunner, 'production preflight', [
    'REVIEWED_REFERRAL_STICKER_WORKFLOW',
    'REVIEWED_REFERRAL_STICKER_QUEUE',
    'REVIEWED_REFERRAL_STICKER_DEAD_LETTER_QUEUE',
    'referral_sticker_workflow_tables_present',
    'referral_sticker_workflow_contract_guards_present'
  ])
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    activationMigration,
    operationsMigration,
    operations,
    content,
    staff,
    api,
    runtime,
    workflowMigration,
    scheduler,
    config,
    workflowTest,
    productionRunner
  ] = await Promise.all([
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0087_referral_sticker_schedule_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0098_referral_sticker_schedule_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/referral-sticker-schedule-operations.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/content.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare/src/referral-sticker-reward-orchestration.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0126_referral_sticker_reward_workflow_handoffs.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
    readFile(
      path.join(
        root,
        'cloudflare/test/referral-sticker-reward-orchestration.test.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'utils/run-cloudflare-production.mjs'), 'utf8')
  ])
  const errors = referralStickerGateErrors({
    activationMigration,
    operationsMigration,
    operations,
    content,
    staff,
    api,
    runtime,
    workflowMigration,
    scheduler,
    config,
    workflowTest,
    productionRunner
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Referral sticker operations preserve exact manifests, independent approval, active-only visibility, and dormant defaults\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
