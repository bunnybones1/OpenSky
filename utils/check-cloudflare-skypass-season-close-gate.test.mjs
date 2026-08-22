import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { skypassSeasonCloseEffectErrors } from './check-cloudflare-skypass-season-close-gate.mjs'

const evidence = async () => {
  const [runtime, migration, scheduler, config, skypassTest, productionRunner] =
    await Promise.all([
      readFile('cloudflare/src/skypass-auto-claim.ts', 'utf8'),
      readFile(
        'cloudflare/migrations/0125_skypass_season_close_workflow_handoffs.sql',
        'utf8'
      ),
      readFile('cloudflare/src/index.ts', 'utf8'),
      readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
      readFile('cloudflare/test/skypass-auto-claim.test.ts', 'utf8'),
      readFile('utils/run-cloudflare-production.mjs', 'utf8')
    ])
  return {
    runtime,
    migration,
    scheduler,
    config,
    test: skypassTest,
    productionRunner
  }
}

test('accepts the Workflow/Queue/D1 SkyPass effect boundary', async () => {
  assert.deepEqual(skypassSeasonCloseEffectErrors(await evidence()), [])
})

const migrationFixture = ({ corruptReceipt = false } = {}) => `
PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY);
CREATE TABLE skypass_reward_policy_versions (
  season INTEGER NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  fulfillment_policy_hash TEXT NOT NULL,
  PRIMARY KEY (season, version)
);
CREATE TABLE skypass_reward_active_policies (
  season INTEGER PRIMARY KEY,
  version INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  fulfillment_policy_hash TEXT NOT NULL
);
CREATE TABLE skypass_season_close_cycles (
  season INTEGER PRIMARY KEY,
  closes_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TRIGGER skypass_season_close_cycles_transition_guard
BEFORE UPDATE ON skypass_season_close_cycles
BEGIN SELECT RAISE(ABORT, 'legacy close immutable'); END;
CREATE TABLE player_skypass_season_stats (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  initial_account_level INTEGER NOT NULL,
  achieved_account_level INTEGER NOT NULL,
  PRIMARY KEY (user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE player_skypass_claims (
  user_id TEXT NOT NULL,
  reward_id INTEGER NOT NULL,
  rewards TEXT NOT NULL,
  auto_claim_season INTEGER,
  application_status TEXT NOT NULL,
  PRIMARY KEY (user_id, reward_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE player_notifications (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  skypass_auto_claim_season INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE player_skypass_auto_claims (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  claimed_reward_count INTEGER NOT NULL,
  gained_rewards TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season) REFERENCES skypass_season_close_cycles(season)
);
CREATE TABLE player_skypass_auto_claim_failures (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  first_failed_at TEXT NOT NULL,
  last_failed_at TEXT NOT NULL,
  last_error TEXT NOT NULL,
  PRIMARY KEY (user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season) REFERENCES skypass_season_close_cycles(season)
);
CREATE TRIGGER player_skypass_auto_claim_failures_transition_guard
BEFORE UPDATE ON player_skypass_auto_claim_failures
BEGIN SELECT RAISE(ABORT, 'legacy failure transition'); END;
CREATE TRIGGER player_skypass_auto_claim_failures_no_delete
BEFORE DELETE ON player_skypass_auto_claim_failures
BEGIN SELECT RAISE(ABORT, 'legacy failure immutable'); END;
CREATE TABLE multiplayer_matches (
  proposal_id TEXT PRIMARY KEY,
  status TEXT NOT NULL
);
CREATE TABLE multiplayer_match_experience_players (
  proposal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL
);

INSERT INTO users VALUES ('preserved'), ('reopened');
INSERT INTO skypass_reward_policy_versions VALUES
  (10, 1, 'ACTIVE',
   'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
   'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb');
INSERT INTO skypass_reward_active_policies VALUES
  (10, 1,
   'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
   'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb');
INSERT INTO skypass_season_close_cycles VALUES
  (10, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.000Z',
   '2026-01-01T00:00:04.000Z');
INSERT INTO player_skypass_season_stats VALUES
  ('preserved', 10, 0, 1), ('reopened', 10, 0, 1);
INSERT INTO player_skypass_claims VALUES
  ('preserved', 101, '[{"type":"STICKER_POINTS","amount":5}]', 10,
   'APPLIED');
INSERT INTO player_skypass_auto_claims VALUES
  ('preserved', 10, ${corruptReceipt ? 2 : 1},
   '[{"type":"STICKER_POINTS","amount":5}]',
   '2026-01-01T00:00:03.000Z');
INSERT INTO player_notifications VALUES
  (9, 'preserved', 'ONE_TIME',
   '{"oneTime":{"id":10,"name":"Autoclaimed Rewards","data":{"legacy":true}}}',
   '2026-01-01T00:00:03.000Z', 10);
INSERT INTO player_skypass_auto_claim_failures VALUES
  ('reopened', 10, 5, '2026-01-01T00:00:02.000Z',
   '2026-01-01T00:00:03.000Z', 'old retry ceiling');
`

test('preserves completed 0064 effects and reopens capped failures', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0125_skypass_season_close_workflow_handoffs.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input:
      `${migrationFixture()}\n${migration}\n.mode list\n.separator |\n` +
      `SELECT season, COALESCE(completed_at, '')
       FROM skypass_season_close_cycles;
       SELECT season, workflow_instance_id, policy_version,
              policy_content_sha256, fulfillment_policy_hash,
              COALESCE(completed_at, '')
       FROM skypass_season_close_orchestrations;
       SELECT user_id, status, created_at, COALESCE(completed_at, '')
       FROM skypass_auto_claim_deliveries ORDER BY user_id;
       SELECT user_id, autoclaimed
       FROM player_skypass_season_stats ORDER BY user_id;
       SELECT user_id, claimed_reward_count, gained_rewards, completed_at
       FROM player_skypass_auto_claims;
       SELECT user_id, reward_id, rewards, auto_claim_season,
              application_status FROM player_skypass_claims;
       SELECT id, user_id, payload, created_at, skypass_auto_claim_season
       FROM player_notifications;
       SELECT user_id, season, message_id, delivery_attempt, error, failed_at
       FROM player_skypass_auto_claim_failures;
       SELECT COUNT(*) FROM pragma_table_info(
         'player_skypass_auto_claim_failures'
       ) WHERE name IN ('attempts', 'last_error');`
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stdout.trim(),
    [
      '10|',
      '10|skypass-close-10|1|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb|',
      'preserved|APPLIED|2026-01-01T00:00:01.000Z|2026-01-01T00:00:03.000Z',
      'reopened|PENDING|2026-01-01T00:00:01.000Z|',
      'preserved|1',
      'reopened|0',
      'preserved|1|[{"type":"STICKER_POINTS","amount":5}]|2026-01-01T00:00:03.000Z',
      'preserved|101|[{"type":"STICKER_POINTS","amount":5}]|10|APPLIED',
      '9|preserved|{"oneTime":{"id":10,"name":"Autoclaimed Rewards","data":{"legacy":true}}}|2026-01-01T00:00:03.000Z|10',
      'reopened|10|migration-0064-10-reopened|5|old retry ceiling|2026-01-01T00:00:03.000Z',
      '0'
    ].join('\n')
  )
})

test('fails closed rather than migrating a corrupt 0064 receipt', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0125_skypass_season_close_workflow_handoffs.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input: `${migrationFixture({ corruptReceipt: true })}\n${migration}`
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /CHECK constraint failed/)
})

test('rejects direct-cron, partial-claim, terminal-state, and topology mutations', async () => {
  const current = await evidence()
  const mutations = [
    {
      ...current,
      runtime: current.runtime.replace(
        'dispatchDueSkypassAutoClaims',
        'runDueSkypassAutoClaims'
      )
    },
    {
      ...current,
      runtime: current.runtime.replace(
        'claimSkypassRewards(body.userId, rewardIds',
        'claimSkypassRewards(body.userId, rewardIds.slice(0, 5)'
      )
    },
    {
      ...current,
      runtime: `${current.runtime}\nconst PLAYER_BATCH_SIZE = 10\nstatus = 'DEAD'\n`
    },
    {
      ...current,
      migration: current.migration.replace(
        "status IN ('PENDING', 'APPLIED')",
        "status IN ('PENDING', 'APPLIED', 'DEAD')"
      )
    },
    {
      ...current,
      migration: current.migration.replaceAll(
        'policy_content_sha256',
        'unpinned_policy_digest'
      )
    },
    {
      ...current,
      scheduler: current.scheduler.replace(
        'dispatchDueSkypassAutoClaims(env)',
        'runDueSkypassAutoClaims(env.AUTH_DB)'
      )
    },
    {
      ...current,
      config: {
        ...current.config,
        queues: {
          ...current.config.queues,
          consumers: current.config.queues.consumers.filter(
            consumer =>
              consumer.queue !== 'cloud-weasel-skypass-auto-claim-delivery'
          )
        }
      }
    },
    {
      ...current,
      test: current.test.replace(
        'claims more than five rewards in one player transaction and rolls back a late fault',
        'claims five rewards at a time'
      )
    },
    {
      ...current,
      productionRunner: current.productionRunner.replace(
        "'0125_skypass_season_close_workflow_handoffs.sql'",
        "'0124_push_notification_queue_delivery.sql'"
      )
    }
  ]
  for (const [index, mutated] of mutations.entries()) {
    assert.ok(
      skypassSeasonCloseEffectErrors(mutated).length > 0,
      `mutation ${index + 1} escaped the SkyPass gate`
    )
  }
})
