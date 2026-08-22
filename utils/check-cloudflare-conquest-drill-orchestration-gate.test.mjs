import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestDrillOrchestrationGateErrors } from './check-cloudflare-conquest-drill-orchestration-gate.mjs'

const liveEvidence = async () => {
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
    readFile('cloudflare/src/conquest-drill.ts', 'utf8'),
    readFile('cloudflare/src/conquest-drill-orchestration.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0128_conquest_readiness_drill_workflows.sql',
      'utf8'
    ),
    readFile('cloudflare/src/api.ts', 'utf8'),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('cloudflare/test/conquest-drill-orchestration.test.ts', 'utf8'),
    readFile('cloudflare/test/conquest-drill-operations.test.ts', 'utf8'),
    readFile('utils/run-cloudflare-production.mjs', 'utf8')
  ])
  return {
    core,
    orchestration,
    migration,
    api,
    scheduler,
    config,
    workflowTest,
    operationTest,
    productionRunner
  }
}

test('accepts the Workflow/D1 Conquest drill effect boundary', async () => {
  assert.deepEqual(
    conquestDrillOrchestrationGateErrors(await liveEvidence()),
    []
  )
})

test('fails closed when required evidence or topology disappears', async () => {
  const current = await liveEvidence()
  for (const source of [
    'core',
    'orchestration',
    'migration',
    'api',
    'scheduler',
    'workflowTest',
    'operationTest',
    'productionRunner'
  ]) {
    assert.ok(
      conquestDrillOrchestrationGateErrors({
        ...current,
        [source]: ''
      }).length > 0,
      `${source} removal must fail the gate`
    )
  }
  assert.ok(
    conquestDrillOrchestrationGateErrors({
      ...current,
      config: { workflows: [] }
    }).length > 0
  )
})

test('rejects direct scanning, terminal dispatch failure, and attempt authority', async () => {
  const current = await liveEvidence()
  for (const mutation of [
    {
      ...current,
      scheduler: `${current.scheduler}\nrunConquestReadinessDrills(env)\n`
    },
    {
      ...current,
      core: `${current.core}\nthis.fail(row, 'MATCH_DISPATCH_FAILED', at)\n`
    },
    {
      ...current,
      core: `${current.core}\nORDER BY updated_at LIMIT 10\n`
    },
    {
      ...current,
      migration: `${current.migration}\nattempt_count INTEGER\n`
    }
  ]) {
    assert.ok(conquestDrillOrchestrationGateErrors(mutation).length > 0)
  }
})

const migrationFixture = ({ invalidTimestamp = false } = {}) => `
PRAGMA foreign_keys = ON;
CREATE TABLE staff_conquest_drill_operations (
  operation_key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
INSERT INTO staff_conquest_drill_operations VALUES
  ('11111111-1111-4111-8111-111111111111', 'RUNNING',
   '${invalidTimestamp ? 'invalid' : '2026-01-01T00:00:00.000Z'}', NULL),
  ('22222222-2222-4222-8222-222222222222', 'WAITING_DELIVERY',
   '2026-01-01T01:00:00.000Z', NULL),
  ('33333333-3333-4333-8333-333333333333', 'COMPLETED',
   '2026-01-01T02:00:00.000Z', '2026-01-01T02:00:00.000Z'),
  ('44444444-4444-4444-8444-444444444444', 'PREPARING',
   '2026-01-01T03:00:00.000Z', NULL);
`

test('adopts valid active operations and auto-bridges future starts', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0128_conquest_readiness_drill_workflows.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input:
      `${migrationFixture()}\n${migration}\n` +
      `UPDATE staff_conquest_drill_operations
       SET status = 'RUNNING', updated_at = '2026-01-01T03:01:00.000Z'
       WHERE operation_key = '44444444-4444-4444-8444-444444444444';
       UPDATE staff_conquest_drill_operations
       SET status = 'FAILED', completed_at = '2026-01-01T04:00:00.000Z'
       WHERE operation_key = '11111111-1111-4111-8111-111111111111';\n` +
      `.mode list\n.separator |\n` +
      `SELECT operation_key, workflow_instance_id, accepted_at,
              COALESCE(completed_at, '')
       FROM staff_conquest_drill_orchestrations ORDER BY operation_key;`
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stdout.trim(),
    [
      '11111111-1111-4111-8111-111111111111|conquest-readiness-drill-11111111-1111-4111-8111-111111111111|2026-01-01T00:00:00.000Z|2026-01-01T04:00:00.000Z',
      '22222222-2222-4222-8222-222222222222|conquest-readiness-drill-22222222-2222-4222-8222-222222222222|2026-01-01T01:00:00.000Z|',
      '44444444-4444-4444-8444-444444444444|conquest-readiness-drill-44444444-4444-4444-8444-444444444444|2026-01-01T03:01:00.000Z|'
    ].join('\n')
  )
})

test('fails migration rather than adopting invalid active evidence', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0128_conquest_readiness_drill_workflows.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input: `${migrationFixture({ invalidTimestamp: true })}\n${migration}`
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /CHECK constraint failed/)
})

test('keeps orchestration and failure evidence immutable', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0128_conquest_readiness_drill_workflows.sql',
    'utf8'
  )
  const base = `${migrationFixture()}\n${migration}\n`
  const receiptMutation = spawnSync(
    'sqlite3',
    ['-batch', '-bail', ':memory:'],
    {
      encoding: 'utf8',
      input:
        base +
        `UPDATE staff_conquest_drill_orchestrations
         SET workflow_instance_id = 'lookalike'
         WHERE operation_key = '11111111-1111-4111-8111-111111111111';`
    }
  )
  assert.notEqual(receiptMutation.status, 0)
  assert.match(
    receiptMutation.stderr,
    /valid terminal Conquest drill Workflow receipt/
  )

  const failureMutation = spawnSync(
    'sqlite3',
    ['-batch', '-bail', ':memory:'],
    {
      encoding: 'utf8',
      input:
        base +
        `INSERT INTO staff_conquest_drill_orchestration_failures
           (operation_key, workflow_instance_id, phase, failure_code,
            observed_at)
         VALUES (
           '11111111-1111-4111-8111-111111111111',
           'conquest-readiness-drill-11111111-1111-4111-8111-111111111111',
           'WORKFLOW_PROGRESS', 'TEST_FAILURE',
           '2026-01-01T00:01:00.000Z'
         );
         UPDATE staff_conquest_drill_orchestration_failures
         SET failure_code = 'REWRITTEN';`
    }
  )
  assert.notEqual(failureMutation.status, 0)
  assert.match(failureMutation.stderr, /Workflow failures are immutable/)
})
