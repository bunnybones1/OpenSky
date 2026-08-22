import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestGoldEffectErrors } from './check-cloudflare-conquest-gold-gate.mjs'

const evidence = async () => {
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
    readFile('lib/shared/src/conquest-gold-delivery.ts', 'utf8'),
    readFile('game-server-cloudflare/src/conquest-gold-delivery.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('cloudflare/src/conquest-delivery.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0123_conquest_gold_queue_delivery.sql',
      'utf8'
    ),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('game-server-cloudflare/wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('cloudflare/test/conquest-delivery.test.ts', 'utf8'),
    readFile(
      'game-server-cloudflare/test-cloudflare/conquest-settlement.test.ts',
      'utf8'
    ),
    readFile('utils/run-cloudflare-production.mjs', 'utf8')
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

test('accepts the delayed Gold effect boundary', async () => {
  assert.deepEqual(conquestGoldEffectErrors(await evidence()), [])
})

test('rejects authority, timing, atomicity, recovery, and topology mutations', async () => {
  const current = await evidence()
  const mutations = [
    {
      ...current,
      protocol: current.protocol.replace(
        'conquestId,kind,version',
        'cardId,conquestId,kind,version'
      )
    },
    {
      ...current,
      gameMatch: current.gameMatch.replace(
        'this.state.waitUntil(',
        'await Promise.resolve('
      )
    },
    {
      ...current,
      runtime: current.runtime.replace(
        'if (deliverAt > now.getTime())',
        'if (deliverAt < now.getTime())'
      )
    },
    {
      ...current,
      runtime:
        current.runtime + "\\nconst MAX_ATTEMPTS = 5\\nstatus = 'FAILED'\\n"
    },
    {
      ...current,
      runtime: current.runtime.replace(
        'await database.batch(statements)',
        'await Promise.all(statements.map(statement => statement.run()))'
      )
    },
    {
      ...current,
      migration: current.migration.replace(
        'AND delivery.delivered_at >= delivery.deliver_at',
        'AND delivery.attempt_count BETWEEN 1 AND 5'
      )
    },
    {
      ...current,
      scheduler: current.scheduler.replace(
        'dispatchDueConquestGoldDeliveries(env)',
        'applyConquestGoldDeliveryQueueMessage(env.AUTH_DB)'
      )
    },
    {
      ...current,
      scheduler: current.scheduler.replace(
        'if (batch.queue === CONQUEST_GOLD_DELIVERY_QUEUE_NAME)',
        'if (batch.queue === LEADERBOARD_REWARD_QUEUE_NAME)'
      )
    },
    {
      ...current,
      mainConfig: {
        ...current.mainConfig,
        queues: {
          ...current.mainConfig.queues,
          consumers: current.mainConfig.queues.consumers.filter(
            consumer => consumer.queue !== 'cloud-weasel-conquest-gold-delivery'
          )
        }
      }
    },
    {
      ...current,
      gameConfig: {
        ...current.gameConfig,
        queues: { producers: [] }
      }
    },
    {
      ...current,
      deliveryTest: current.deliveryTest.replace(
        'through six failures and recovers on attempt seven',
        'dead-letters after five tries'
      )
    },
    {
      ...current,
      productionRunner: current.productionRunner.replaceAll(
        'conquest_gold_queue_contract_guards_present',
        'conquest_gold_queue_guards_removed'
      )
    }
  ]
  for (const mutated of mutations) {
    assert.ok(conquestGoldEffectErrors(mutated).length > 0)
  }
})
