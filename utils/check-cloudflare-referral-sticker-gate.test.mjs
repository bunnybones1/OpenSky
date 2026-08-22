import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { referralStickerGateErrors } from './check-cloudflare-referral-sticker-gate.mjs'

const validEvidence = () => ({
  activationMigration: [
    'referral_sticker_active_schedule_entries',
    'activated_by_user_id <> created_by_user_id',
    'referral sticker schedule activation is invalid',
    'active referral sticker schedule receipt required'
  ].join('\n'),
  operationsMigration: [
    'CREATE TABLE staff_referral_sticker_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE')",
    'CREATE TABLE staff_referral_sticker_schedule_operations',
    'CREATE UNIQUE INDEX staff_referral_sticker_schedule_operations_once_idx',
    'CREATE TRIGGER staff_referral_sticker_schedule_operation_apply_guard',
    "schedule.status = 'ACTIVE'",
    'schedule.created_by_user_id <> NEW.actor_user_id',
    'CREATE TABLE staff_referral_sticker_schedule_audit',
    'staff referral sticker schedule audit rows are immutable'
  ].join('\n'),
  operations: [
    "ReferralStickerScheduleOperation = 'PROPOSE' | 'ACTIVATE'",
    'scheduleVersion !== replacesVersion + 1',
    'proposal must target current season',
    'activation must target current season',
    'before.createdByUserId === actorUserId',
    'JSON.stringify(before.entries) !== JSON.stringify(entries)',
    'INSERT INTO content_stickers',
    "'x-cloud-weasel-operation-key'"
  ].join('\n'),
  content: 'FROM referral_sticker_active_schedule_entries WHERE season = ?',
  staff: [
    'requireReferralStickerScheduleWrite(',
    'staff_referral_sticker_schedule_permissions'
  ].join('\n'),
  api: [
    "case 'GMListReferralStickerSchedules'",
    "case 'GMProposeReferralStickerSchedule'",
    "case 'GMActivateReferralStickerSchedule'"
  ].join('\n')
})

test('accepts the reviewed referral sticker operations boundary', () => {
  assert.deepEqual(referralStickerGateErrors(validEvidence()), [])
})

test('fails closed when any referral sticker evidence source disappears', () => {
  const evidence = validEvidence()
  for (const source of Object.keys(evidence)) {
    assert.ok(
      referralStickerGateErrors({ ...evidence, [source]: '' }).length > 0,
      `${source} removal must fail the gate`
    )
  }
})

test('fails closed when active-only visibility or independent approval disappears', () => {
  const evidence = validEvidence()
  assert.ok(
    referralStickerGateErrors({ ...evidence, content: '' }).some(error =>
      error.includes('active_schedule_entries')
    )
  )
  assert.ok(
    referralStickerGateErrors({
      ...evidence,
      operationsMigration: evidence.operationsMigration.replace(
        'schedule.created_by_user_id <> NEW.actor_user_id',
        ''
      )
    }).some(error => error.includes('created_by_user_id'))
  )
})

const workflowEvidence = async () => {
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
      'cloudflare/migrations/0087_referral_sticker_schedule_activation.sql',
      'utf8'
    ),
    readFile(
      'cloudflare/migrations/0098_referral_sticker_schedule_operations.sql',
      'utf8'
    ),
    readFile('cloudflare/src/referral-sticker-schedule-operations.ts', 'utf8'),
    readFile('cloudflare/src/content.ts', 'utf8'),
    readFile('cloudflare/src/staff.ts', 'utf8'),
    readFile('cloudflare/src/api.ts', 'utf8'),
    readFile('cloudflare/src/referral-sticker-reward-orchestration.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0126_referral_sticker_reward_workflow_handoffs.sql',
      'utf8'
    ),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile(
      'cloudflare/test/referral-sticker-reward-orchestration.test.ts',
      'utf8'
    ),
    readFile('utils/run-cloudflare-production.mjs', 'utf8')
  ])
  return {
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
  }
}

test('accepts the Workflow/Queue/D1 referral sticker effect boundary', async () => {
  assert.deepEqual(referralStickerGateErrors(await workflowEvidence()), [])
})

test('rejects direct cron, copied caps, terminal retries, and topology drift', async () => {
  const current = await workflowEvidence()
  for (const mutation of [
    { ...current, runtime: '' },
    { ...current, workflowMigration: '' },
    { ...current, scheduler: '' },
    { ...current, workflowTest: '' },
    { ...current, productionRunner: '' },
    { ...current, config: { workflows: [], queues: {} } },
    {
      ...current,
      runtime: `${current.runtime}\nconst MAX_PREPARATIONS_PER_RUN = 20\n`
    },
    {
      ...current,
      workflowMigration: `${current.workflowMigration}\nstatus = 'DEAD'\n`
    },
    {
      ...current,
      scheduler: current.scheduler.replace(
        'dispatchDueReferralStickerRewards(env)',
        'runReferralStickerRewards(env.AUTH_DB)'
      )
    }
  ]) {
    assert.ok(referralStickerGateErrors(mutation).length > 0)
  }
})

const migrationFixture = ({ corrupt = false } = {}) => `
PRAGMA foreign_keys = ON;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  user_kind TEXT NOT NULL
);
CREATE TABLE player_account_settings (
  user_id TEXT PRIMARY KEY,
  account_status TEXT NOT NULL
);
CREATE TABLE player_items (
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  token_id INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_type, token_id)
);
CREATE TABLE referral_sticker_schedule_versions (
  version INTEGER PRIMARY KEY,
  season INTEGER NOT NULL,
  status TEXT NOT NULL,
  activated_at TEXT NOT NULL
);
CREATE TABLE referral_sticker_schedule_entries (
  schedule_version INTEGER NOT NULL,
  token_id INTEGER NOT NULL,
  required_points INTEGER NOT NULL,
  PRIMARY KEY (schedule_version, token_id)
);
CREATE TABLE referral_sticker_reward_batches (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  total_cost INTEGER NOT NULL,
  previous_cost INTEGER NOT NULL,
  points_deducted INTEGER NOT NULL,
  claim_token TEXT NOT NULL,
  status TEXT NOT NULL,
  deliver_at TEXT NOT NULL,
  delivery_token TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
CREATE TABLE referral_sticker_reward_awards (
  batch_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  token_id INTEGER NOT NULL,
  required_points INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE referral_sticker_reward_inventory_grants (
  batch_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  token_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  before_balance INTEGER NOT NULL,
  after_balance INTEGER NOT NULL
);
CREATE TABLE referral_sticker_reward_batch_schedule_receipts (
  batch_id INTEGER PRIMARY KEY,
  schedule_version INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO users VALUES ('pending-user', 'PLAYER'), ('delivered-user', 'PLAYER');
INSERT INTO player_account_settings VALUES
  ('pending-user', 'ACTIVE'), ('delivered-user', 'ACTIVE');
INSERT INTO player_items VALUES
  ('pending-user', 'SW_STICKER_POINTS', 0, 0),
  ('delivered-user', 'SW_STICKER_POINTS', 0, 0),
  ('delivered-user', 'SW_STICKERS', 101, 100);
INSERT INTO referral_sticker_schedule_versions VALUES
  (10, 10, 'ACTIVE', '2026-01-01T00:00:00.000Z');
INSERT INTO referral_sticker_schedule_entries VALUES (10, 101, 10);
INSERT INTO referral_sticker_reward_batches VALUES
  (1, 'pending-user', 10, 10, 0, 10,
   '11111111-1111-4111-8111-111111111111',
   '${corrupt ? 'DELIVERING' : 'PENDING'}',
   '2026-01-01T23:00:00.000Z', ${corrupt ? "'bad-token'" : 'NULL'},
   '2026-01-01T00:00:00.000Z', NULL),
  (2, 'delivered-user', 10, 10, 0, 10,
   '22222222-2222-4222-8222-222222222222', 'DELIVERED',
   '2026-01-01T23:00:00.000Z', 'delivery-token',
   '2026-01-01T00:00:00.000Z', '2026-01-01T23:00:01.000Z');
INSERT INTO referral_sticker_reward_awards VALUES
  (1, 'pending-user', 10, 101, 10, 100, '2026-01-01T00:00:00.000Z'),
  (2, 'delivered-user', 10, 101, 10, 100, '2026-01-01T00:00:00.000Z');
INSERT INTO referral_sticker_reward_inventory_grants VALUES
  (2, 'SW_STICKERS', 101, 100, 0, 100);
INSERT INTO referral_sticker_reward_batch_schedule_receipts VALUES
  (1, 10, '2026-01-01T00:00:00.000Z'),
  (2, 10, '2026-01-01T00:00:00.000Z');
`

test('adopts valid pending receipts and preserves completed inventory evidence', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0126_referral_sticker_reward_workflow_handoffs.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input:
      `${migrationFixture()}\n${migration}\n.mode list\n.separator |\n` +
      `SELECT workflow_instance_id, origin, expected_player_count,
              COALESCE(completed_at, '')
       FROM referral_sticker_reward_sweeps ORDER BY id;
       SELECT user_id, status, outcome, batch_id
       FROM referral_sticker_reward_sweep_players ORDER BY batch_id;
       SELECT batch_id, status, COALESCE(completed_at, '')
       FROM referral_sticker_reward_sweep_deliveries ORDER BY batch_id;
       SELECT COUNT(*) FROM referral_sticker_reward_batches;
       SELECT COUNT(*) FROM referral_sticker_reward_inventory_grants;`
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stdout.trim(),
    [
      'referral-sticker-recovery-1|MIGRATION|1|',
      'referral-sticker-recovery-2|MIGRATION|1|2026-01-01T23:00:01.000Z',
      'pending-user|APPLIED|BATCH|1',
      'delivered-user|APPLIED|BATCH|2',
      '1|PENDING|',
      '2|APPLIED|2026-01-01T23:00:01.000Z',
      '2',
      '1'
    ].join('\n')
  )
})

test('fails closed instead of adopting an in-flight partial batch', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0126_referral_sticker_reward_workflow_handoffs.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input: `${migrationFixture({ corrupt: true })}\n${migration}`
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /CHECK constraint failed/)
})
