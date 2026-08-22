import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REVIEWED_ACCOUNT_DELETION_WORKFLOW =
  'cloud-weasel-account-deletion'

export const accountDeletionGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`account deletion ${label} is missing: ${token}`)
      }
    }
  }

  requireTokens(evidence.core, 'D1/R2 effect boundary', [
    'accountDeletionResponsibility',
    'account-deletion-${userId}',
    'deleteAccountPrivateFeedback',
    'finalizeAcceptedAccountDeletion',
    'providerSubjectHash',
    'identity_provider_tombstones',
    'DELETE FROM wallet_link_challenges',
    'DELETE FROM wallet_connections',
    'DELETE FROM auth_identities',
    'DELETE FROM user_storage',
    'DELETE FROM client_feedback_rate_limits',
    "account_status = 'DELETED'",
    'r2_cleanup_verified_at',
    'account deletion completion was not atomic'
  ])
  requireTokens(evidence.orchestration, 'Workflow runtime', [
    'WorkflowEntrypoint',
    'scheduleAccountDeletion',
    'dispatchPendingAccountDeletions',
    'runAccountDeletionWorkflow',
    'ACCOUNT_DELETION_WORKFLOW',
    'CLIENT_FEEDBACK',
    'step.sleepUntil(',
    'delete private account feedback',
    'complete account deletion in D1',
    'instance.restart()',
    "'pending_recovery'",
    "'WORKFLOW_DISPATCH'",
    "'R2_DELETE'",
    "'D1_FINALIZE'"
  ])
  for (const forbidden of [
    'FINALIZATION_BATCH_SIZE',
    'AccountDeletionMaxRetries',
    'AccountDeletionRetryDelay',
    'attempts >= 5',
    "status = 'DEAD'",
    '.finalizeDue()'
  ]) {
    if (
      evidence.core?.includes(forbidden) ||
      evidence.orchestration?.includes(forbidden) ||
      evidence.scheduler?.includes(forbidden)
    ) {
      errors.push('account deletion runtime restored copied runner authority')
    }
  }

  requireTokens(evidence.migration, 'Workflow migration', [
    'CREATE TABLE account_deletion_0127_migration_guard',
    'CREATE TABLE account_deletion_orchestrations',
    "workflow_instance_id = 'account-deletion-' || user_id",
    'CREATE TRIGGER account_deletion_request_orchestration_insert',
    'CREATE TRIGGER account_deletion_orchestration_insert_guard',
    'CREATE TRIGGER account_deletion_orchestration_update_guard',
    'CREATE TRIGGER account_deletion_request_workflow_completion_guard',
    'account deletion R2 cleanup is not verified',
    'CREATE TRIGGER account_deletion_orchestration_completion_guard',
    'account deletion cleanup is incomplete',
    'CREATE TABLE account_deletion_orchestration_failures',
    "phase IN ('WORKFLOW_DISPATCH', 'R2_DELETE', 'D1_FINALIZE')",
    'account deletion orchestrations are immutable',
    'account deletion failures are immutable'
  ])
  for (const forbidden of [
    'attempt_count',
    "status IN ('PENDING', 'COMPLETED', 'DEAD')",
    'retry_limit'
  ]) {
    if (evidence.migration?.includes(forbidden)) {
      errors.push('account deletion migration retains terminal retry authority')
    }
  }

  requireTokens(evidence.identity, 'Google step-up acceptance', [
    'sameOrigin(request)',
    "prompt: 'select_account'",
    "max_age: '0'",
    'linkedSubject !== profile.subject',
    'scheduleAccountDeletion(env, userId)'
  ])
  requireTokens(evidence.scheduler, 'main Worker routing', [
    'dispatchPendingAccountDeletions(env)',
    'AccountDeletionWorkflow'
  ])
  if (evidence.scheduler?.includes('AccountDeletionRepository')) {
    errors.push('main Worker cron directly applies account deletion')
  }

  if (evidence.config !== undefined) {
    const workflows = evidence.config.workflows ?? []
    const buckets = evidence.config.r2_buckets ?? []
    if (
      workflows.filter(
        value =>
          value.name === REVIEWED_ACCOUNT_DELETION_WORKFLOW &&
          value.binding === 'ACCOUNT_DELETION_WORKFLOW' &&
          value.class_name === 'AccountDeletionWorkflow'
      ).length !== 1 ||
      buckets.filter(
        value =>
          value.binding === 'CLIENT_FEEDBACK' &&
          value.bucket_name === 'cloud-weasel-client-feedback'
      ).length !== 1
    ) {
      errors.push('reviewed account deletion Workflow/R2 topology is incomplete')
    }
  }

  requireTokens(evidence.workflowTest, 'Workflow effect tests', [
    "it('fails closed before acceptance when either required binding is absent'",
    "it('keeps a committed creation gap recoverable under one deterministic instance'",
    "it('restarts a terminal Workflow while its D1 privacy receipt is incomplete'",
    "it('sleeps to the exact source deadline, purges R2 first, and completes D1 once'",
    "it('rejects a tampered Workflow instance before private data changes'",
    "it('keeps D1 pending when R2 cleanup fails and records no abandonment state'",
    "it('recovers the privacy-safe R2-empty/D1-pending half-state'"
  ])
  requireTokens(evidence.productionRunner, 'production preflight', [
    'REVIEWED_ACCOUNT_DELETION_WORKFLOW',
    'account_deletion_workflow_tables_present',
    'account_deletion_workflow_guards_present',
    'account_deletion_workflow_contract_guards_present'
  ])
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    core,
    orchestration,
    migration,
    identity,
    scheduler,
    config,
    workflowTest,
    productionRunner
  ] = await Promise.all([
    readFile(path.join(root, 'cloudflare/src/account-deletion.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/account-deletion-orchestration.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0127_account_deletion_workflow_orchestration.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/identity-api.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
    readFile(
      path.join(root, 'cloudflare/test/account-deletion-orchestration.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'utils/run-cloudflare-production.mjs'), 'utf8')
  ])
  const errors = accountDeletionGateErrors({
    core,
    orchestration,
    migration,
    identity,
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
    'Account deletion preserves Google step-up, exact deadline, R2-first privacy cleanup, atomic D1 anonymization, and durable recovery\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
