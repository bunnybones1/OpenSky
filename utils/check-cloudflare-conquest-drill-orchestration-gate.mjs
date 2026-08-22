import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REVIEWED_CONQUEST_READINESS_DRILL_WORKFLOW =
  'cloud-weasel-conquest-readiness-drill'

export const conquestDrillOrchestrationGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`Conquest drill ${label} is missing: ${token}`)
      }
    }
  }

  requireTokens(evidence.core, 'D1 business boundary', [
    'normalizeConquestDrillOperationKey',
    'conquestDrillProposalId',
    'nextObservationAt',
    '>= MATCH_TIMEOUT_MS',
    "'MATCH_LEDGER_FAILED'",
    "'MATCH_OUTCOME_INVALID'",
    "'DELIVERY_WINDOW_EXPIRED'",
    'conquest_verified_drill_receipts',
    'player_conquest_gold_deliveries',
    'authoritative Conquest drill match required'
  ])
  requireTokens(evidence.orchestration, 'Workflow runtime', [
    'WorkflowEntrypoint',
    'scheduleConquestReadinessDrill',
    'dispatchPendingConquestReadinessDrills',
    'runConquestReadinessDrillWorkflow',
    'CONQUEST_READINESS_DRILL_WORKFLOW',
    'conquest-readiness-drill-${',
    'instance.restart()',
    'step.sleepUntil(',
    'CONQUEST_DRILL_RECONCILE_INTERVAL_MS',
    "'WORKFLOW_DISPATCH'",
    "'WORKFLOW_VALIDATE'",
    "'WORKFLOW_PROGRESS'",
    '/internal/conquest-readiness/matches'
  ])
  requireTokens(evidence.api, 'staff acceptance', [
    "case 'GMStartConquestDrill'",
    'requireConquestDrillRun',
    'scheduleConquestReadinessDrill(',
    'CONQUEST_DRILL_OPERATION_HEADER'
  ])
  requireTokens(evidence.scheduler, 'main Worker recovery routing', [
    'dispatchPendingConquestReadinessDrills(env)',
    'ConquestReadinessDrillWorkflow'
  ])

  if (evidence.scheduler?.includes('runConquestReadinessDrills')) {
    errors.push('Conquest drill scheduler directly advances business state')
  }
  if (evidence.scheduler?.includes('new ConquestDrillRepository')) {
    errors.push('Conquest drill scheduler owns the D1 operation runner')
  }
  if (/\bLIMIT\s+10\b/.test(evidence.core ?? '')) {
    errors.push('Conquest drill runtime retains the copied scan batch')
  }
  if (
    evidence.core?.includes("this.fail(row, 'MATCH_DISPATCH_FAILED'") ||
    evidence.orchestration?.includes("'MATCH_DISPATCH_FAILED'")
  ) {
    errors.push(
      'Conquest drill infrastructure failure regained business authority'
    )
  }
  for (const forbidden of [
    'attempt_count',
    'retry_count',
    'max_retries',
    "status = 'DEAD'",
    'next_attempt_at'
  ]) {
    if (
      evidence.core?.includes(forbidden) ||
      evidence.orchestration?.includes(forbidden) ||
      evidence.migration?.includes(forbidden)
    ) {
      errors.push('Conquest drill restored copied attempt-runner authority')
    }
  }

  requireTokens(evidence.migration, 'Workflow migration', [
    'CREATE TABLE staff_conquest_drill_orchestrations',
    "'conquest-readiness-drill-' || operation_key",
    "WHERE status IN ('RUNNING', 'WAITING_DELIVERY')",
    'CREATE TABLE conquest_drill_0128_migration_guard',
    'CREATE TRIGGER staff_conquest_drill_orchestration_insert_guard',
    'CREATE TRIGGER staff_conquest_drill_operation_orchestrate',
    'CREATE TRIGGER staff_conquest_drill_orchestration_complete',
    'CREATE TRIGGER staff_conquest_drill_orchestration_update_guard',
    'CREATE TRIGGER staff_conquest_drill_orchestration_no_delete',
    'CREATE TABLE staff_conquest_drill_orchestration_failures',
    "phase IN ('WORKFLOW_DISPATCH', 'WORKFLOW_VALIDATE', 'WORKFLOW_PROGRESS')",
    'CREATE TRIGGER staff_conquest_drill_orchestration_failure_insert_guard',
    'Conquest drill Workflow receipts are immutable',
    'Conquest drill Workflow failures are immutable'
  ])

  if (evidence.config !== undefined) {
    const workflows = evidence.config.workflows ?? []
    if (
      workflows.filter(
        value =>
          value.name === REVIEWED_CONQUEST_READINESS_DRILL_WORKFLOW &&
          value.binding === 'CONQUEST_READINESS_DRILL_WORKFLOW' &&
          value.class_name === 'ConquestReadinessDrillWorkflow'
      ).length !== 1
    ) {
      errors.push('reviewed Conquest drill Workflow topology is incomplete')
    }
  }

  requireTokens(evidence.workflowTest, 'Workflow effect tests', [
    "it('fails before durable acceptance when the Workflow binding is missing'",
    "it('recovers a committed creation gap under one deterministic instance'",
    "it('restarts terminal Workflow state while D1 remains active'",
    "it('preserves the exact match deadline and terminal business receipt'",
    "it('rejects a tampered Workflow instance and drives a genuine timeout once'"
  ])
  requireTokens(evidence.operationTest, 'end-to-end operation tests', [
    "it('dispatches only the next sequential match and keeps infrastructure errors recoverable'",
    "it('advances three authoritative wins sequentially and waits for real delayed delivery'",
    'new Date(delivery!.deliver_at)',
    'runner-must-not-self-verify'
  ])
  requireTokens(evidence.productionRunner, 'production preflight', [
    'REVIEWED_CONQUEST_READINESS_DRILL_WORKFLOW',
    "'0128_conquest_readiness_drill_workflows.sql'",
    'conquest_drill_workflow_tables_present',
    'conquest_drill_workflow_guards_present',
    'conquest_drill_workflow_contract_guards_present'
  ])
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    core,
    orchestration,
    migration,
    api,
    scheduler,
    config,
    workflowTest,
    operationTest,
    productionRunner
  ] = await Promise.all([
    readFile(path.join(root, 'cloudflare/src/conquest-drill.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/conquest-drill-orchestration.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0128_conquest_readiness_drill_workflows.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
    readFile(
      path.join(root, 'cloudflare/test/conquest-drill-orchestration.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/test/conquest-drill-operations.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'utils/run-cloudflare-production.mjs'), 'utf8')
  ])
  const errors = conquestDrillOrchestrationGateErrors({
    core,
    orchestration,
    migration,
    api,
    scheduler,
    config,
    workflowTest,
    operationTest,
    productionRunner
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Conquest readiness preserves explicit authorization, sequential authoritative matches, exact deadlines, delayed offchain delivery, and deterministic Workflow recovery\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
