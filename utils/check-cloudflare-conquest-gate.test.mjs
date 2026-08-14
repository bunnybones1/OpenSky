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
      'modes.delete(mode as GameMode)',
      'currentMatchmakerGameModes',
      "'/internal/matchmaker/game-modes'",
      'participantModeEnabled',
      'conquestRepository.isDrainable(identity.userId, mode)'
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
      'row.ends_at >= now',
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
      'FROM conquest_approved_reward_pools',
      'conquest.reward_pool_version',
      'Conquest run has no pinned reward pool',
      'Date.parse(pool.ends_at) < admittedAt',
      'AND reward_pool_version = ?'
    ].join('\n'),
    settlementPinning: [
      'ADD COLUMN reward_pool_version TEXT',
      'CREATE VIEW conquest_approved_reward_pools',
      "pool.status IN ('ACTIVE', 'RETIRED')",
      'CREATE TRIGGER player_conquests_reward_pool_pin_no_update',
      'conquest.reward_pool_version = NEW.pool_version',
      "strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)",
      'Conquest reward pool pin is immutable'
    ].join('\n'),
    drainMigration: [
      'CREATE VIEW conquest_approved_queue_pools',
      'FROM conquest_approved_reward_pools pool',
      'JOIN conquest_verified_drill_receipts drill',
      'JOIN staff_conquest_readiness_operations operation',
      "operation.status = 'APPLIED'",
      'ready.verified_at >= pool.starts_at'
    ].join('\n'),
    drainRepository: [
      'isDrainable(userId: string, mode: GameMode)',
      'drainingModes()',
      'JOIN conquest_approved_queue_pools pool',
      'mode.game_mode = conquest.mode AND mode.enabled = 1',
      "conquest.status = 'IN_PROGRESS'",
      "strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)",
      'pool.starts_at <= conquest.created_at',
      'pool.ends_at >= conquest.created_at'
    ].join('\n'),
    matchmaker: "'https://cloud-weasel-match/internal/matchmaker/game-modes'",
    api: [
      'FROM conquest_approved_active_reward_pools',
      'FROM game_mode_status',
      "game_mode = 'CONQUEST_CONSTRUCTED' AND enabled = 1",
      'FROM conquest_verified_queue_pools verified',
      'verified.starts_at <= ? AND verified.ends_at >= ?',
      'reward_pool_version',
      'verified.pool_version'
    ].join('\n'),
    playerConquest: [
      'useGameModesStatus()',
      'gameModesStatus?.conquestConstructed === true',
      'ALLOW_TICKET_SALES && isConquestAvailable',
      'isConquestAvailable={isConquestAvailable}'
    ].join('\n'),
    playerConquestButton: [
      'isConquestAvailable: boolean',
      '!isConquestAvailable ||',
      '!isConquestAvailable || isConquestLocked'
    ].join('\n'),
    gameModesQuery: [
      'APIClient.opensky.getGameModesStatus()',
      'GAME_MODES_STATUS',
      'staleTime: 10000',
      'refetchInterval: 10000'
    ].join('\n'),
    gateway: [
      "case 'GMListConquestReadiness'",
      "case 'GMVerifyConquestReadiness'",
      "case 'GMListConquestV2RewardSchedules'",
      "case 'GMProposeConquestV2RewardSchedule'",
      "case 'GMActivateConquestV2RewardSchedule'",
      "case 'GMDisableConquestV2RewardSchedule'"
    ].join('\n'),
    readiness: 'JOIN conquest_approved_active_reward_pools approved',
    sourceRewardPool: [
      '"start_at": db.Lte(now)',
      '"end_at":   db.Gte(now)'
    ].join('\n'),
    boundaryMigration: [
      'DROP TRIGGER game_mode_status_conquest_pool_insert_guard',
      'DROP TRIGGER conquest_queue_readiness_insert_guard',
      'DROP TRIGGER staff_conquest_readiness_operation_insert_guard',
      'DROP TRIGGER player_conquest_settlements_insert_guard',
      'CREATE VIEW conquest_verified_queue_pools',
      'CREATE VIEW conquest_approved_queue_pools',
      'ready.verified_at <= pool.ends_at',
      'pool.ends_at >= NEW.verified_at',
      'pool.ends_at >= NEW.created_at',
      "verified.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
      'pool.ends_at >= conquest.created_at'
    ].join('\n')
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
    'settlementPinning',
    'drainMigration',
    'drainRepository',
    'matchmaker',
    'api',
    'playerConquest',
    'playerConquestButton',
    'gameModesQuery',
    'gateway',
    'readiness',
    'sourceRewardPool',
    'boundaryMigration'
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
