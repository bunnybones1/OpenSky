import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const REVIEWED_SKYPASS_WORKFLOW = 'cloud-weasel-skypass-season-close'
export const REVIEWED_SKYPASS_QUEUE = 'cloud-weasel-skypass-auto-claim-delivery'
export const REVIEWED_SKYPASS_DLQ =
  'cloud-weasel-skypass-auto-claim-delivery-dlq'

const requireTokens = (errors, source, label, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(`${label} is missing: ${token}`)
  }
}

export const skypassSeasonCloseEffectErrors = evidence => {
  const errors = []
  requireTokens(errors, evidence.runtime, 'SkyPass season-close runtime', [
    'WorkflowEntrypoint',
    REVIEWED_SKYPASS_QUEUE,
    'SOURCE_CLOSE_DELAY_MS = 10_000',
    'QUEUE_PUBLISH_PAGE_SIZE = 100',
    "kind: 'SKYPASS_AUTO_CLAIM'",
    'Object.keys(record).sort().join',
    '`skypass-close-${policy.season}`',
    'acceptDueSkypassSeasonClose',
    'dispatchDueSkypassAutoClaims',
    'snapshotAcceptedSkypassSeasonClose',
    'publishPendingSkypassAutoClaims',
    'runSkypassSeasonCloseWorkflow',
    'SkypassSeasonCloseWorkflow',
    'instance.restart()',
    'sendBatch(',
    'skypass_auto_claim_deliveries',
    'skypass_reward_active_policies',
    'noUnpublishedMatchExperienceSQL',
    'claimSkypassRewards(body.userId, rewardIds',
    'await database.batch([',
    'player_skypass_auto_claims',
    'player_skypass_auto_claim_failures',
    'message.retry()',
    'id: 0',
    'Autoclaimed Rewards'
  ])
  for (const forbidden of [
    'PLAYER_BATCH_SIZE',
    'REWARD_BATCH_SIZE',
    'rewardIds.slice(',
    'attempts >= 5',
    'attempts < 5',
    "status = 'DEAD'",
    'runDueSkypassAutoClaims'
  ]) {
    if (evidence.runtime.includes(forbidden)) {
      errors.push('SkyPass runtime restored copied runner authority')
    }
  }

  requireTokens(errors, evidence.migration, 'SkyPass migration', [
    'CREATE TABLE skypass_0125_migration_guard',
    'RENAME TO player_skypass_auto_claim_failures_0064',
    'ADD COLUMN autoclaimed',
    'SET completed_at = NULL',
    'CREATE TABLE skypass_season_close_orchestrations',
    "workflow_instance_id = 'skypass-close-' || season",
    'policy_content_sha256',
    'fulfillment_policy_hash',
    'CREATE TABLE skypass_auto_claim_deliveries',
    "status IN ('PENDING', 'APPLIED')",
    'CREATE TABLE player_skypass_auto_claim_failures',
    'UNIQUE (message_id, delivery_attempt)',
    'player_skypass_auto_claims_insert_guard',
    'player_skypass_auto_claim_notification_insert_guard',
    'skypass_season_close_orchestration_insert_guard',
    'skypass_season_close_orchestration_update_guard',
    'skypass_auto_claim_delivery_insert_guard',
    'skypass_auto_claim_delivery_update_guard',
    'player_skypass_auto_claim_failures_no_update',
    'player_skypass_auto_claim_failures_no_delete',
    'player_skypass_season_stats_autoclaimed_guard',
    'skypass_policy_after_close_guard',
    'multiplayer_match_experience_players'
  ])
  for (const forbidden of [
    "status IN ('PENDING', 'APPLIED', 'DEAD')",
    'attempts BETWEEN 1 AND 5',
    "status = 'DEAD'"
  ]) {
    if (evidence.migration.includes(forbidden)) {
      errors.push('SkyPass migration retains terminal retry authority')
    }
  }

  requireTokens(errors, evidence.scheduler, 'main Worker SkyPass routing', [
    'dispatchDueSkypassAutoClaims(env)',
    'if (batch.queue === SKYPASS_AUTO_CLAIM_QUEUE_NAME)',
    'handleSkypassAutoClaimQueue(',
    'SkypassSeasonCloseWorkflow'
  ])
  if (
    evidence.scheduler.includes('runDueSkypassAutoClaims(') ||
    evidence.scheduler.includes('claimSkypassRewards(')
  ) {
    errors.push('main Worker cron directly applies SkyPass rewards')
  }

  const workflows = evidence.config.workflows ?? []
  const producers = evidence.config.queues?.producers ?? []
  const consumers = evidence.config.queues?.consumers ?? []
  if (
    workflows.filter(
      value =>
        value.name === REVIEWED_SKYPASS_WORKFLOW &&
        value.binding === 'SKYPASS_SEASON_CLOSE_WORKFLOW' &&
        value.class_name === 'SkypassSeasonCloseWorkflow'
    ).length !== 1 ||
    producers.filter(
      value =>
        value.binding === 'SKYPASS_AUTO_CLAIM_QUEUE' &&
        value.queue === REVIEWED_SKYPASS_QUEUE
    ).length !== 1 ||
    consumers.filter(
      value =>
        value.queue === REVIEWED_SKYPASS_QUEUE &&
        value.dead_letter_queue === REVIEWED_SKYPASS_DLQ
    ).length !== 1
  ) {
    errors.push('reviewed SkyPass Workflow/Queue/DLQ topology is incomplete')
  }

  requireTokens(errors, evidence.test, 'SkyPass effect tests', [
    "it('fails closed on missing topology and accepts the exact source boundary and policy'",
    "it('delivers free and entitled premium rewards off chain exactly once'",
    "it('claims more than five rewards in one player transaction and rolls back a late fault'",
    "it('marks a manually exhausted player without manufacturing a notification'",
    "it('does not snapshot absent or zero-progress rows and waits for staged match XP'",
    "it('isolates poison players, preserves six failures, and recovers on attempt seven'",
    'for (let attempt = 2; attempt <= 6; attempt++)',
    "toEqual({ status: 'PENDING' })",
    "it('acknowledges malformed and unknown messages without mutation'",
    "it('keeps concurrent delivery idempotent'",
    "it('runs the Workflow to durable D1 completion and restarts a terminal orphan'",
    "it('restarts a terminal Workflow while D1 remains incomplete'"
  ])

  requireTokens(errors, evidence.productionRunner, 'production preflight', [
    'REVIEWED_SKYPASS_WORKFLOW',
    'REVIEWED_SKYPASS_QUEUE',
    'REVIEWED_SKYPASS_DEAD_LETTER_QUEUE',
    'skypass_workflow_tables_present',
    'skypass_workflow_contract_guards_present'
  ])
  return errors
}

const evidenceFromDisk = async root => {
  const [runtime, migration, scheduler, config, test, productionRunner] =
    await Promise.all([
      readFile(path.join(root, 'cloudflare/src/skypass-auto-claim.ts'), 'utf8'),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0125_skypass_season_close_workflow_handoffs.sql'
        ),
        'utf8'
      ),
      readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
      readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
      readFile(
        path.join(root, 'cloudflare/test/skypass-auto-claim.test.ts'),
        'utf8'
      ),
      readFile(path.join(root, 'utils/run-cloudflare-production.mjs'), 'utf8')
    ])
  return { runtime, migration, scheduler, config, test, productionRunner }
}

const main = async () => {
  const root = path.resolve(new URL('..', import.meta.url).pathname)
  const errors = skypassSeasonCloseEffectErrors(await evidenceFromDisk(root))
  if (errors.length) throw new Error(errors.join('\n'))
  process.stdout.write('Cloudflare SkyPass season-close effect gate passed\n')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
