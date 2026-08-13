import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestGateErrors } from './check-cloudflare-conquest-gate.mjs'

test('production keeps both Conquest queues behind the settlement gate', async () => {
  const config = JSON.parse(
    await readFile('match-service-cloudflare/wrangler.jsonc', 'utf8')
  )
  assert.deepEqual(conquestGateErrors(config), [])
})

test('fails closed if either Conquest mode is configured', () => {
  for (const mode of ['CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY']) {
    assert.match(
      conquestGateErrors({ vars: { ENABLED_GAME_MODES: `PRACTICE_BOT,${mode}` } })[0],
      new RegExp(mode)
    )
  }
})

test('fails closed if dynamic admission or off-chain drill evidence disappears', () => {
  const evidence = {
    matchService: [
      'isConquestQueueReady(env.AUTH_DB, at)',
      'CONQUEST_GAME_MODES',
      'modes.delete(mode as GameMode)'
    ].join('\n'),
    migration: [
      'CREATE VIEW conquest_verified_drill_receipts',
      "conquest.entry_key LIKE 'readiness-drill:%'",
      "settlement.application_status = 'APPLIED'",
      "delivery.application_status = 'APPLIED'",
      "event.event_type = 'DELAYED_REWARD_MINTED'",
      'unixepoch(delivery.deliver_at) = unixepoch(settlement.settled_at) + 86400',
      'verified off-chain Conquest drill receipts required',
      'CREATE TRIGGER conquest_queue_readiness_no_update',
      'CREATE TRIGGER conquest_queue_readiness_no_delete'
    ].join('\n')
  }
  assert.deepEqual(conquestGateErrors({}, evidence), [])
  for (const source of ['matchService', 'migration']) {
    assert.ok(
      conquestGateErrors({}, { ...evidence, [source]: '' }).length > 0,
      `${source} removal must fail the release gate`
    )
  }
})
