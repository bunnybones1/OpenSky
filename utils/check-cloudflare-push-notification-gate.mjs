import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const REVIEWED_PUSH_QUEUE = 'cloud-weasel-player-push-delivery'
export const REVIEWED_PUSH_DLQ = 'cloud-weasel-player-push-delivery-dlq'

const requireTokens = (errors, source, label, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(`${label} is missing: ${token}`)
  }
}

export const pushNotificationEffectErrors = evidence => {
  const errors = []
  requireTokens(errors, evidence.runtime, 'push Queue runtime', [
    REVIEWED_PUSH_QUEUE,
    "kind: 'PLAYER_PUSH_NOTIFICATION'",
    'version: 1',
    'notificationId: number',
    'Object.keys(body).length === 3',
    'dispatchDuePushNotifications',
    'dispatchRewardPushNotification',
    'sendBatch(',
    "contentType: 'json'",
    'last_enqueued_at',
    'REDRIVE_AFTER_MS',
    'player_notification_push_failures',
    'message.retry()',
    "SET status = 'SENT'",
    'await database.batch([',
    'include_aliases: { external_id: [notification.user_id] }',
    'contents: { en: CONTENT[notification.notification_type] }',
    'idempotency_key: notification.idempotency_key'
  ])
  for (const forbidden of [
    'MAX_ATTEMPTS',
    'MAX_PER_RUN',
    "status = 'DEAD'",
    'attempts <',
    'attempts + 1'
  ]) {
    if (evidence.runtime.includes(forbidden)) {
      errors.push('push runtime restored copied runner authority')
    }
  }

  requireTokens(errors, evidence.migration, 'push Queue migration', [
    'CREATE TABLE push_notification_0124_migration_guard',
    'RENAME TO player_notification_push_deliveries_legacy',
    "CASE WHEN status = 'SENT' THEN 'SENT' ELSE 'PENDING' END",
    "status IN ('PENDING', 'SENT')",
    'CREATE TABLE player_notification_push_failures',
    'player_notification_push_delivery_insert_guard',
    'player_notification_push_delivery_update_guard',
    'player_notification_push_failures_insert_guard',
    'player_notification_push_failures_no_update',
    'player_notification_push_failures_no_delete',
    "OLD.status = 'SENT'",
    'NEW.last_enqueued_at >= OLD.last_enqueued_at'
  ])
  for (const forbidden of [
    "status IN ('PENDING', 'SENT', 'DEAD')",
    'attempts INTEGER',
    'attempts BETWEEN',
    'last_error TEXT'
  ]) {
    if (evidence.migration.includes(forbidden)) {
      errors.push('push migration retains attempt-shaped business state')
    }
  }

  requireTokens(errors, evidence.scheduler, 'main Worker push routing', [
    'dispatchDuePushNotifications(env.AUTH_DB, env)',
    'if (batch.queue === PUSH_NOTIFICATION_QUEUE_NAME)',
    'handlePushNotificationQueue(',
    'env.AUTH_DB'
  ])
  if (
    evidence.scheduler.includes('runPushNotifications(') ||
    evidence.scheduler.includes('deliverPushNotificationQueueMessage(')
  ) {
    errors.push('main Worker cron still calls the push provider directly')
  }

  for (const [label, source, failureText] of [
    [
      'leaderboard',
      evidence.leaderboard,
      'leaderboard push publication failed'
    ],
    ['Conquest V2', evidence.conquestV2, 'Conquest V2 push publication failed']
  ]) {
    const publish = source.indexOf('await dispatchRewardPushNotification(')
    const failure = source.indexOf(failureText, publish)
    const acknowledgement = source.indexOf('message.ack()', failure)
    if (publish < 0 || failure < publish || acknowledgement < failure) {
      errors.push(`${label} reward does not isolate push publication failure`)
    }
  }

  const producers = evidence.config.queues?.producers ?? []
  const consumers = evidence.config.queues?.consumers ?? []
  if (
    producers.filter(
      value =>
        value.binding === 'PUSH_NOTIFICATION_QUEUE' &&
        value.queue === REVIEWED_PUSH_QUEUE
    ).length !== 1 ||
    consumers.filter(
      value =>
        value.queue === REVIEWED_PUSH_QUEUE &&
        value.dead_letter_queue === REVIEWED_PUSH_DLQ
    ).length !== 1
  ) {
    errors.push(
      'reviewed push Queue producer/consumer/DLQ topology is incomplete'
    )
  }

  requireTokens(errors, evidence.test, 'push Queue effect tests', [
    "it('is mutation-free when disabled and fails closed on partial config'",
    "it('publishes only a narrow D1 responsibility and records provider success'",
    "it('recovers an ambiguous provider response with the same idempotency key'",
    "it('keeps six provider failures pending and later applies the same responsibility'",
    'for (let attempt = 1; attempt <= 6; attempt += 1)',
    "toBe('PENDING')",
    'player_notification_push_failures',
    "it('isolates a poison notification from another delivery in the same batch'",
    "it('redrives stale D1 truth but does not republish a fresh transport observation'",
    "it('acknowledges tampered, unsupported, expired, and disabled responsibilities without provider access'"
  ])
  requireTokens(errors, evidence.productionRunner, 'production preflight', [
    'REVIEWED_PUSH_NOTIFICATION_QUEUE',
    'REVIEWED_PUSH_NOTIFICATION_DEAD_LETTER_QUEUE',
    'push_notification_queue_contract_guards_present'
  ])
  return errors
}

const evidenceFromDisk = async root => {
  const [
    runtime,
    migration,
    scheduler,
    leaderboard,
    conquestV2,
    config,
    test,
    productionRunner
  ] = await Promise.all([
    readFile(path.join(root, 'cloudflare/src/push-notifications.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0124_push_notification_queue_delivery.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-orchestration.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/conquest-v2-reward-orchestration.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
    readFile(
      path.join(root, 'cloudflare/test/push-notifications.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'utils/run-cloudflare-production.mjs'), 'utf8')
  ])
  return {
    runtime,
    migration,
    scheduler,
    leaderboard,
    conquestV2,
    config,
    test,
    productionRunner
  }
}

const main = async () => {
  const root = path.resolve(new URL('..', import.meta.url).pathname)
  const errors = pushNotificationEffectErrors(await evidenceFromDisk(root))
  if (errors.length) throw new Error(errors.join('\n'))
  process.stdout.write('Cloudflare external push delivery effect gate passed\n')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
