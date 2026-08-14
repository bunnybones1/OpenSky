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
      conquestGateErrors({
        vars: { ENABLED_GAME_MODES: `PRACTICE_BOT,${mode}` }
      })[0],
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
    poolOperationsMigration: [
      'CREATE TABLE staff_conquest_reward_pool_permissions',
      "permission IN ('PROPOSE', 'ACTIVATE', 'RETIRE')",
      'CREATE TABLE staff_conquest_reward_pool_operations',
      'CREATE UNIQUE INDEX staff_conquest_reward_pool_operations_once_idx',
      'CREATE TRIGGER staff_conquest_reward_pool_operation_apply_guard',
      'CREATE TABLE staff_conquest_reward_pool_audit',
      'staff Conquest reward pool audit rows are immutable'
    ].join('\n'),
    poolOperations: [
      "ConquestRewardPoolOperation = 'PROPOSE' | 'ACTIVATE' | 'RETIRE'",
      'createdByUserId === actorUserId',
      'cardManifest does not match proposal',
      'overlappingActivePool(',
      'Conquest pool window overlaps active pool',
      "'x-cloud-weasel-operation-key'",
      'operation_key, operation, pool_version, actor_user_id'
    ].join('\n'),
    poolWindowSafety: [
      'conquest_reward_pool_window_migration_guard',
      'first_pool.starts_at <= second_pool.ends_at',
      'first_pool.ends_at >= second_pool.starts_at',
      'CREATE TRIGGER conquest_reward_pool_activation_window_guard',
      'CREATE TRIGGER conquest_reward_pool_lifecycle_window_guard',
      'DROP INDEX conquest_reward_pools_one_active_idx',
      'Conquest reward pool windows cannot overlap'
    ].join('\n'),
    readinessOperationsMigration: [
      'CREATE TABLE staff_conquest_readiness_permissions',
      "permission = 'VERIFY'",
      'CREATE TABLE staff_conquest_readiness_operations',
      'DROP VIEW conquest_verified_queue_pools',
      "operation.status = 'APPLIED'",
      'CREATE TRIGGER conquest_queue_readiness_operation_guard',
      'reviewed Conquest readiness operation required',
      'CREATE TRIGGER staff_conquest_readiness_operation_apply_guard',
      'CREATE TABLE staff_conquest_readiness_audit',
      'staff Conquest readiness audit rows are immutable'
    ].join('\n'),
    readinessOperations: [
      'FROM conquest_verified_drill_receipts drill',
      'LEFT JOIN conquest_approved_active_reward_pools approved',
      'LEFT JOIN staff_conquest_readiness_operations applied',
      "applied.status = 'APPLIED'",
      'CASE WHEN applied.operation_key IS NULL',
      'Conquest readiness receipt confirmation does not match',
      'active verified Conquest drill evidence required',
      'INSERT INTO conquest_queue_readiness',
      "'x-cloud-weasel-operation-key'"
    ].join('\n'),
    v2ScheduleActivation: [
      'CREATE TABLE conquest_v2_reward_schedule_activations',
      'activated_by_user_id <> created_by_user_id',
      'settings.version = NEW.settings_version',
      'settings.mutation_id = NEW.settings_mutation_id',
      'Conquest V2 reward policy activation is invalid'
    ].join('\n'),
    v2ScheduleOperationsMigration: [
      'CREATE TABLE staff_conquest_v2_reward_schedule_permissions',
      "permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')",
      'CREATE TABLE staff_conquest_v2_reward_schedule_operations',
      'CREATE UNIQUE INDEX staff_conquest_v2_reward_schedule_operations_once_idx',
      'CREATE TRIGGER staff_conquest_v2_reward_schedule_operation_apply_guard',
      'activation.activated_at = NEW.created_at',
      'activation.activated_at <= schedule.starts_at',
      'CREATE TABLE staff_conquest_v2_reward_schedule_audit',
      'staff Conquest V2 reward schedule audit rows are immutable'
    ].join('\n'),
    v2ScheduleOperations: [
      "ConquestV2RewardScheduleOperation =\n  | 'PROPOSE'\n  | 'ACTIVATE'\n  | 'DISABLE'",
      'version !== replacesVersion + 1',
      'CONQUEST_V2_REWARD_POLICY_HASH',
      'createdByUserId === actorUserId',
      'settings confirmation does not match',
      'settings changed after proposal',
      'Silver quantity confirmation is unsafe',
      'startsAt must be in the future',
      "'x-cloud-weasel-operation-key'"
    ].join('\n'),
    staff: [
      'requireConquestRewardPoolWrite(',
      'staff_conquest_reward_pool_permissions',
      'requireConquestReadinessWrite(',
      'staff_conquest_readiness_permissions',
      'requireConquestV2RewardScheduleWrite(',
      'staff_conquest_v2_reward_schedule_permissions'
    ].join('\n'),
    settlement: [
      'FROM conquest_approved_active_reward_pools',
      'SELECT 1 FROM conquest_approved_active_reward_pools',
      'ORDER BY starts_at DESC, version DESC'
    ].join('\n'),
    api: 'FROM conquest_approved_active_reward_pools',
    gateway: [
      "case 'GMListConquestReadiness'",
      "case 'GMVerifyConquestReadiness'",
      "case 'GMListConquestV2RewardSchedules'",
      "case 'GMProposeConquestV2RewardSchedule'",
      "case 'GMActivateConquestV2RewardSchedule'",
      "case 'GMDisableConquestV2RewardSchedule'"
    ].join('\n'),
    readiness: 'JOIN conquest_approved_active_reward_pools approved'
  }
  assert.deepEqual(conquestGateErrors({}, evidence), [])
  for (const source of [
    'matchService',
    'migration',
    'poolActivation',
    'poolOperationsMigration',
    'poolOperations',
    'poolWindowSafety',
    'readinessOperationsMigration',
    'readinessOperations',
    'v2ScheduleActivation',
    'v2ScheduleOperationsMigration',
    'v2ScheduleOperations',
    'staff',
    'settlement',
    'api',
    'gateway',
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
    conquestPoolCatalogErrors(
      migration,
      JSON.stringify({ cards: [{ id: 1 }] })
    )[0],
    /differ/
  )
  assert.match(conquestPoolCatalogErrors('', catalog)[0], /missing/)
})
