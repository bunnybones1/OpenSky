import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { accountDeletionGateErrors } from './check-cloudflare-account-deletion-gate.mjs'

const liveEvidence = async () => {
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
    readFile('cloudflare/src/account-deletion.ts', 'utf8'),
    readFile('cloudflare/src/account-deletion-orchestration.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0127_account_deletion_workflow_orchestration.sql',
      'utf8'
    ),
    readFile('cloudflare/src/identity-api.ts', 'utf8'),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('cloudflare/test/account-deletion-orchestration.test.ts', 'utf8'),
    readFile('utils/run-cloudflare-production.mjs', 'utf8')
  ])
  return {
    core,
    orchestration,
    migration,
    identity,
    scheduler,
    config,
    workflowTest,
    productionRunner
  }
}

test('accepts the Workflow/R2/D1 account deletion effect boundary', async () => {
  assert.deepEqual(accountDeletionGateErrors(await liveEvidence()), [])
})

test('fails closed when an evidence source or reviewed topology disappears', async () => {
  const current = await liveEvidence()
  for (const source of [
    'core',
    'orchestration',
    'migration',
    'identity',
    'scheduler',
    'workflowTest',
    'productionRunner'
  ]) {
    assert.ok(
      accountDeletionGateErrors({ ...current, [source]: '' }).length > 0,
      `${source} removal must fail the gate`
    )
  }
  assert.ok(
    accountDeletionGateErrors({
      ...current,
      config: { workflows: [], r2_buckets: [] }
    }).length > 0
  )
})

test('rejects direct cron finalization and copied retry authority', async () => {
  const current = await liveEvidence()
  for (const mutation of [
    {
      ...current,
      scheduler: `${current.scheduler}\nnew AccountDeletionRepository(env.AUTH_DB).finalizeDue()\n`
    },
    {
      ...current,
      orchestration: `${current.orchestration}\nconst FINALIZATION_BATCH_SIZE = 50\n`
    },
    {
      ...current,
      migration: `${current.migration}\nattempt_count INTEGER\n`
    }
  ]) {
    assert.ok(accountDeletionGateErrors(mutation).length > 0)
  }
})

const migrationFixture = ({ corruptCompleted = false } = {}) => `
PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY);
CREATE TABLE player_account_settings (
  user_id TEXT PRIMARY KEY,
  account_status TEXT NOT NULL
);
CREATE TABLE account_deletion_requests (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  reauthenticated_provider TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  execute_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE auth_identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL
);
CREATE TABLE wallet_link_challenges (user_id TEXT NOT NULL);
CREATE TABLE wallet_connections (user_id TEXT NOT NULL);
CREATE TABLE user_storage (owner TEXT NOT NULL);
CREATE TABLE client_feedback_rate_limits (user_id TEXT NOT NULL);

INSERT INTO users VALUES ('pending-user'), ('completed-user'), ('future-user');
INSERT INTO player_account_settings VALUES
  ('pending-user', 'TO_DELETE'),
  ('completed-user', 'DELETED'),
  ('future-user', 'TO_DELETE');
INSERT INTO account_deletion_requests VALUES
  ('pending-user', 'PENDING', 'google',
   '2026-01-01T00:00:00.000Z', '2026-01-30T23:00:00.000Z', NULL),
  ('completed-user', 'COMPLETED', 'google',
   '2026-01-02T00:00:00.000Z', '2026-01-31T23:00:00.000Z',
   '2026-01-31T23:00:01.000Z');
INSERT INTO auth_identities VALUES
  ('google', 'pending-subject', 'pending-user')
  ${corruptCompleted ? ", ('google', 'completed-subject', 'completed-user')" : ''};
`

test('preserves valid pending/completed receipts and auto-bridges future requests', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0127_account_deletion_workflow_orchestration.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input:
      `${migrationFixture()}\n${migration}\n` +
      `INSERT INTO account_deletion_requests VALUES
         ('future-user', 'PENDING', 'google',
          '2026-01-03T00:00:00.000Z', '2026-02-01T23:00:00.000Z', NULL);
` +
      `.mode list
.separator |
SELECT user_id, workflow_instance_id,
              COALESCE(r2_cleanup_verified_at, ''),
              COALESCE(completed_at, '')
FROM account_deletion_orchestrations ORDER BY user_id;`
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stdout.trim(),
    [
      'completed-user|account-deletion-completed-user|2026-01-31T23:00:01.000Z|2026-01-31T23:00:01.000Z',
      'future-user|account-deletion-future-user||',
      'pending-user|account-deletion-pending-user||'
    ].join('\n')
  )
})

test('fails closed instead of adopting a contradictory completed deletion', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0127_account_deletion_workflow_orchestration.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input: `${migrationFixture({ corruptCompleted: true })}\n${migration}`
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /CHECK constraint failed/)
})

test('D1 refuses completion before R2 cleanup evidence exists', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0127_account_deletion_workflow_orchestration.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input:
      `${migrationFixture()}\n${migration}\n` +
      `UPDATE account_deletion_requests
       SET status = 'COMPLETED', completed_at = '2026-01-30T23:00:01.000Z'
       WHERE user_id = 'pending-user';`
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /R2 cleanup is not verified/)
})
