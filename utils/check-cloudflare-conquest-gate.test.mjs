import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  conquestGateErrors,
  conquestPoolCatalogErrors
} from './check-cloudflare-conquest-gate.mjs'

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

test('fails closed if approval, settlement, admission, or drill evidence disappears', () => {
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
    ].join('\n'),
    poolActivation: [
      'CREATE TABLE conquest_reward_pool_activations',
      'CREATE TRIGGER conquest_reward_pools_draft_insert_guard',
      'CREATE TRIGGER conquest_reward_pool_activation_insert_guard',
      'CREATE TRIGGER conquest_reward_pool_activation_update_guard',
      'NEW.activated_by_user_id = OLD.created_by_user_id',
      'CREATE VIEW conquest_approved_active_reward_pools',
      'JOIN conquest_approved_active_reward_pools approved',
      'verified approved Conquest reward pool required'
    ].join('\n'),
    settlement: [
      'FROM conquest_approved_active_reward_pools',
      'SELECT 1 FROM conquest_approved_active_reward_pools'
    ].join('\n'),
    api: 'FROM conquest_approved_active_reward_pools',
    readiness: 'JOIN conquest_approved_active_reward_pools approved'
  }
  assert.deepEqual(conquestGateErrors({}, evidence), [])
  for (const source of [
    'matchService',
    'migration',
    'poolActivation',
    'settlement',
    'api',
    'readiness'
  ]) {
    assert.ok(
      conquestGateErrors({}, { ...evidence, [source]: '' }).length > 0,
      `${source} removal must fail the release gate`
    )
  }
})

test('binds the reviewed Conquest card ranges to the generated catalog', () => {
  const migration = `
    INSERT INTO conquest_reward_pool_valid_card_ranges
      (first_card_id, last_card_id)
    VALUES (1, 2), (5, 5);
  `
  const catalog = JSON.stringify({
    cards: [{ id: 1 }, { id: 2 }, { id: 5 }]
  })
  assert.deepEqual(conquestPoolCatalogErrors(migration, catalog), [])
  assert.match(
    conquestPoolCatalogErrors(migration, JSON.stringify({ cards: [{ id: 1 }] }))[0],
    /differ/
  )
  assert.match(conquestPoolCatalogErrors('', catalog)[0], /missing/)
})
