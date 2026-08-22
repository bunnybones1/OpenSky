import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const REVIEWED_CONQUEST_GOLD_QUEUE =
  'cloud-weasel-conquest-gold-delivery'
export const REVIEWED_CONQUEST_GOLD_DLQ =
  'cloud-weasel-conquest-gold-delivery-dlq'

const bracedBlock = (source, marker) => {
  const start = source.indexOf(marker)
  if (start < 0) return undefined
  const opening = source.indexOf('{', start)
  if (opening < 0) return undefined
  let depth = 0
  for (let cursor = opening; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1
    if (source[cursor] === '}') depth -= 1
    if (depth === 0) return source.slice(start, cursor + 1)
  }
  return undefined
}

const requireTokens = (errors, source, label, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(label + ' is missing: ' + token)
  }
}

export const conquestGoldEffectErrors = evidence => {
  const errors = []
  requireTokens(errors, evidence.protocol, 'Gold Queue protocol', [
    REVIEWED_CONQUEST_GOLD_QUEUE,
    "kind: 'CONQUEST_GOLD'",
    'version: 1',
    'conquestId: number',
    "Object.keys(record).sort().join(',') === 'conquestId,kind,version'"
  ])

  requireTokens(errors, evidence.gameProducer, 'Gold Queue producer', [
    'FROM player_conquest_gold_deliveries delivery',
    "delivery.status IN ('PENDING', 'DISABLED')",
    "delivery.application_status = 'READY'",
    'Math.ceil((deliveryTime - nowTime) / 1_000)',
    'MAX_QUEUE_DELAY_SECONDS',
    "contentType: 'json'",
    'Promise.allSettled(',
    "'Conquest Gold delayed Queue publication failed'"
  ])
  for (const forbidden of ['cardIds:', 'tokenIds:', 'userId:', 'attempts:']) {
    if (evidence.gameProducer.includes(forbidden)) {
      errors.push('Gold Queue producer gives transport business authority')
    }
  }

  const publicationIndex = evidence.gameMatch.indexOf(
    'await publishMatchCompletion('
  )
  const handoffIndex = evidence.gameMatch.indexOf(
    'this.state.waitUntil(\n        publishConquestGoldDeliveriesForMatch('
  )
  const terminalIndex = evidence.gameMatch.indexOf(
    'metadata.completionRecorded = true'
  )
  if (
    publicationIndex < 0 ||
    handoffIndex <= publicationIndex ||
    terminalIndex <= handoffIndex ||
    !evidence.gameMatch.includes(
      "'Conquest Gold delayed Queue publication failed'"
    )
  ) {
    errors.push(
      'terminal match publication does not retain a non-blocking delayed Gold handoff'
    )
  }

  requireTokens(errors, evidence.runtime, 'Gold Queue D1 runtime', [
    'isConquestGoldDeliveryQueueMessage(body)',
    "return 'missing'",
    "return 'duplicate'",
    "return 'disabled'",
    'if (deliverAt > now.getTime())',
    'message.retry({ delaySeconds: error.delaySeconds })',
    'validatedCardCounts(row)',
    "SET application_status = 'PREPARING', application_key = ?",
    'INSERT INTO player_conquest_gold_delivery_inventory_grants',
    'INSERT INTO player_items',
    "'DELAYED_REWARD_MINTED'",
    "application_status = 'APPLIED'",
    'await database.batch(statements)',
    'player_conquest_gold_delivery_failures',
    'message.retry()',
    'while (true)',
    'QUEUE_PUBLISH_PAGE_SIZE',
    'sendBatch('
  ])
  for (const forbidden of [
    'MAX_DELIVERIES_PER_RUN',
    'MAX_ATTEMPTS',
    'deliverDueConquestGold',
    'status = CASE WHEN attempt_count',
    "status = 'FAILED'",
    'attempt_count + 1 >=',
    'LIMIT 100'
  ]) {
    if (evidence.runtime.includes(forbidden)) {
      errors.push('Gold delivery runtime restored copied runner mechanics')
    }
  }

  requireTokens(errors, evidence.migration, 'Gold Queue migration', [
    'CREATE TABLE player_conquest_gold_delivery_failures',
    'player_conquest_gold_delivery_failures_insert_guard',
    'player_conquest_gold_delivery_failures_no_update',
    'player_conquest_gold_delivery_failures_no_delete',
    'DROP TRIGGER player_conquest_gold_deliveries_update_guard',
    "NEW.application_status = 'APPLIED'",
    'player_conquest_gold_delivery_inventory_grants',
    "event.event_type = 'DELAYED_REWARD_MINTED'",
    'DROP VIEW conquest_verified_drill_receipts',
    'unixepoch(delivery.deliver_at) = unixepoch(settlement.settled_at) + 86400',
    'CREATE TABLE conquest_gold_delivery_0123_migration_guard'
  ])
  for (const forbidden of [
    'delivery.attempt_count BETWEEN',
    "NEW.status IN ('PENDING', 'FAILED')",
    'NEW.attempt_count >= 5'
  ]) {
    if (evidence.migration.includes(forbidden)) {
      errors.push('Gold Queue migration retains attempt-shaped authority')
    }
  }

  const route = bracedBlock(
    evidence.scheduler,
    'if (batch.queue === CONQUEST_GOLD_DELIVERY_QUEUE_NAME)'
  )
  if (
    !evidence.scheduler.includes('dispatchDueConquestGoldDeliveries(env)') ||
    !route?.includes('handleConquestGoldDeliveryQueue(') ||
    !route.includes('env.AUTH_DB')
  ) {
    errors.push('main Worker does not route discovery and the named Gold Queue')
  }
  if (
    evidence.scheduler.includes('deliverDueConquestGold(') ||
    evidence.scheduler.includes('applyConquestGoldDeliveryQueueMessage(')
  ) {
    errors.push('main Worker cron still applies Gold inventory directly')
  }

  const mainProducer = evidence.mainConfig.queues?.producers?.filter(
    value =>
      value.binding === 'CONQUEST_GOLD_DELIVERY_QUEUE' &&
      value.queue === REVIEWED_CONQUEST_GOLD_QUEUE
  )
  const mainConsumer = evidence.mainConfig.queues?.consumers?.filter(
    value =>
      value.queue === REVIEWED_CONQUEST_GOLD_QUEUE &&
      value.dead_letter_queue === REVIEWED_CONQUEST_GOLD_DLQ
  )
  const gameProducer = evidence.gameConfig.queues?.producers?.filter(
    value =>
      value.binding === 'CONQUEST_GOLD_DELIVERY_QUEUE' &&
      value.queue === REVIEWED_CONQUEST_GOLD_QUEUE
  )
  if (
    mainProducer?.length !== 1 ||
    mainConsumer?.length !== 1 ||
    gameProducer?.length !== 1 ||
    (evidence.gameConfig.queues?.consumers?.length ?? 0) !== 0
  ) {
    errors.push('reviewed Gold producer/consumer/DLQ topology is incomplete')
  }

  requireTokens(errors, evidence.deliveryTest, 'Gold Queue effect tests', [
    "it('delivers only when due and makes retries idempotent'",
    'delaySeconds: 1',
    "it('rejects message authority and isolates one faulted player in a batch'",
    "it('keeps the entitlement visible through six failures and recovers on attempt seven'",
    'for (let attempt = 1; attempt <= 6; attempt++)',
    "'persistent-failure',\n      7",
    "status: 'PENDING',",
    'attempt_count: 0',
    'player_conquest_gold_delivery_failures',
    "it('re-drives every due D1 responsibility across transport pages without claiming it'",
    'published: 101',
    'expect(pages.map(page => page.length)).toEqual([100, 1])'
  ])
  requireTokens(errors, evidence.settlementTest, 'Gold producer tests', [
    "it('publishes only the D1 responsibility with the remaining exact delay'",
    'delaySeconds: 86_400',
    'Object.keys(sent[0].body).sort()',
    "'injected Queue outage'",
    "status: 'PENDING'",
    "application_status: 'READY'"
  ])

  requireTokens(errors, evidence.productionRunner, 'production preflight', [
    'REVIEWED_CONQUEST_GOLD_QUEUE',
    'REVIEWED_CONQUEST_GOLD_DEAD_LETTER_QUEUE',
    'conquest_gold_queue_contract_guards_present',
    'conquest_gold_readiness_effect_view_present',
    'requiresConquestGoldProducer: true'
  ])
  return errors
}

const evidenceFromDisk = async root => {
  const [
    protocol,
    gameProducer,
    gameMatch,
    runtime,
    migration,
    scheduler,
    mainConfig,
    gameConfig,
    deliveryTest,
    settlementTest,
    productionRunner
  ] = await Promise.all([
    readFile(
      path.join(root, 'lib/shared/src/conquest-gold-delivery.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/src/conquest-gold-delivery.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/src/game-match.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/conquest-delivery.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0123_conquest_gold_queue_delivery.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
    readFile(
      path.join(root, 'game-server-cloudflare/wrangler.jsonc'),
      'utf8'
    ).then(JSON.parse),
    readFile(
      path.join(root, 'cloudflare/test/conquest-delivery.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare/test-cloudflare/conquest-settlement.test.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'utils/run-cloudflare-production.mjs'), 'utf8')
  ])
  return {
    protocol,
    gameProducer,
    gameMatch,
    runtime,
    migration,
    scheduler,
    mainConfig,
    gameConfig,
    deliveryTest,
    settlementTest,
    productionRunner
  }
}

const main = async () => {
  const root = path.resolve(new URL('..', import.meta.url).pathname)
  const errors = conquestGoldEffectErrors(await evidenceFromDisk(root))
  if (errors.length) throw new Error(errors.join('\n'))
  process.stdout.write('Cloudflare delayed Conquest Gold effect gate passed\n')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
