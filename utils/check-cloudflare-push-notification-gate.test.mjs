import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { pushNotificationEffectErrors } from './check-cloudflare-push-notification-gate.mjs'

const evidence = async () => {
  const [
    runtime,
    migration,
    scheduler,
    leaderboard,
    conquestV2,
    config,
    pushTest,
    productionRunner
  ] = await Promise.all([
    readFile('cloudflare/src/push-notifications.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0124_push_notification_queue_delivery.sql',
      'utf8'
    ),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('cloudflare/src/leaderboard-reward-orchestration.ts', 'utf8'),
    readFile('cloudflare/src/conquest-v2-reward-orchestration.ts', 'utf8'),
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('cloudflare/test/push-notifications.test.ts', 'utf8'),
    readFile('utils/run-cloudflare-production.mjs', 'utf8')
  ])
  return {
    runtime,
    migration,
    scheduler,
    leaderboard,
    conquestV2,
    config,
    test: pushTest,
    productionRunner
  }
}

test('accepts the Queue-backed external push effect boundary', async () => {
  assert.deepEqual(pushNotificationEffectErrors(await evidence()), [])
})

const legacyFixture = ({ mismatchedSent = false } = {}) => `
PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY);
CREATE TABLE player_notifications (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  push_enabled INTEGER NOT NULL,
  pushed_at TEXT,
  valid_from TEXT,
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE player_notification_push_deliveries (
  notification_id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pushed_at TEXT,
  FOREIGN KEY (notification_id) REFERENCES player_notifications(id)
    ON DELETE CASCADE
);
INSERT INTO users VALUES ('pending'), ('dead'), ('sent');
INSERT INTO player_notifications VALUES
  (1, 'pending', 'LEADERBOARD_REWARD', 1, NULL, NULL, NULL),
  (2, 'dead', 'CONQUEST_V2_REWARD', 1, NULL, NULL, NULL),
  (3, 'sent', 'LEADERBOARD_REWARD', 1,
   '${mismatchedSent ? '2026-08-12T12:01:00.000Z' : '2026-08-12T12:00:00.000Z'}',
   NULL, NULL);
INSERT INTO player_notification_push_deliveries VALUES
  (1, 'ONESIGNAL', '11111111-1111-4111-8111-111111111111', 'PENDING', 2,
   NULL, 'temporary', '2026-08-12T11:00:00.000Z',
   '2026-08-12T11:02:00.000Z', NULL),
  (2, 'ONESIGNAL', '22222222-2222-4222-8222-222222222222', 'DEAD', 5,
   NULL, 'old ceiling', '2026-08-12T11:00:00.000Z',
   '2026-08-12T11:05:00.000Z', NULL),
  (3, 'ONESIGNAL', '33333333-3333-4333-8333-333333333333', 'SENT', 1,
   'provider-3', 'ignored', '2026-08-12T11:00:00.000Z',
   '2026-08-12T12:00:00.000Z', '2026-08-12T12:00:00.000Z');
`

test('migrates sent, pending, and old dead receipts without losing provider identity', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0124_push_notification_queue_delivery.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input:
      `${legacyFixture()}\n${migration}\n.mode list\n.separator |\n` +
      `SELECT notification_id, status, idempotency_key,
              COALESCE(provider_message_id, ''), COALESCE(pushed_at, '')
       FROM player_notification_push_deliveries ORDER BY notification_id;
       SELECT COUNT(*) FROM pragma_table_info(
         'player_notification_push_deliveries'
       ) WHERE name IN ('attempts', 'last_error');`
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stdout.trim(),
    [
      '1|PENDING|11111111-1111-4111-8111-111111111111||',
      '2|PENDING|22222222-2222-4222-8222-222222222222||',
      '3|SENT|33333333-3333-4333-8333-333333333333|provider-3|2026-08-12T12:00:00.000Z',
      '0'
    ].join('\n')
  )
})

test('fails closed when a sent provider receipt disagrees with its notification', async () => {
  const migration = await readFile(
    'cloudflare/migrations/0124_push_notification_queue_delivery.sql',
    'utf8'
  )
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    encoding: 'utf8',
    input: `${legacyFixture({ mismatchedSent: true })}\n${migration}`
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /CHECK constraint failed/)
})

test('rejects authority, isolation, retry-ceiling, and topology mutations', async () => {
  const current = await evidence()
  const mutations = [
    {
      ...current,
      runtime: current.runtime.replace(
        'Object.keys(body).length === 3',
        'Object.keys(body).length >= 3'
      )
    },
    {
      ...current,
      runtime: `${current.runtime}\nconst MAX_ATTEMPTS = 5\nstatus = 'DEAD'\n`
    },
    {
      ...current,
      migration: current.migration.replace(
        "status IN ('PENDING', 'SENT')",
        "status IN ('PENDING', 'SENT', 'DEAD')"
      )
    },
    {
      ...current,
      scheduler: current.scheduler.replace(
        'dispatchDuePushNotifications(env.AUTH_DB, env)',
        'deliverPushNotificationQueueMessage(env.AUTH_DB, env)'
      )
    },
    {
      ...current,
      leaderboard: current.leaderboard.replace(
        "console.error('leaderboard push publication failed', error)",
        'throw error'
      )
    },
    {
      ...current,
      config: {
        ...current.config,
        queues: {
          ...current.config.queues,
          consumers: current.config.queues.consumers.filter(
            consumer => consumer.queue !== 'cloud-weasel-player-push-delivery'
          )
        }
      }
    },
    {
      ...current,
      test: current.test.replace(
        'keeps six provider failures pending and later applies the same responsibility',
        'dead-letters after five attempts'
      )
    },
    {
      ...current,
      productionRunner: current.productionRunner.replaceAll(
        'push_notification_queue_contract_guards_present',
        'removed_push_notification_contract_guards'
      )
    }
  ]
  for (const [index, mutated] of mutations.entries()) {
    assert.ok(
      pushNotificationEffectErrors(mutated).length > 0,
      `mutation ${index + 1} escaped the push gate`
    )
  }
})
