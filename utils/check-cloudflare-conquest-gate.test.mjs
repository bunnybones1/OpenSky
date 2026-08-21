import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  conquestFilledDeckAuthorityErrors,
  conquestGateErrors,
  conquestPoolCatalogErrors,
  conquestProjectionPublicationErrors,
  conquestSettlementAdmissionErrors,
  conquestSettlementSourceParityErrors,
  conquestV2CloudflareOrchestrationErrors,
  conquestV2DeliveryBatchErrors,
  conquestV2PointsPublicationErrors,
  conquestV2PointsSourceParityErrors,
  conquestV2TreasureSourceParityErrors,
  conquestV2ResumeSafetyErrors
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
    drillMigration: [
      'CREATE TABLE staff_conquest_drill_permissions',
      "permission = 'RUN'",
      'CREATE TABLE staff_conquest_drill_operations',
      'CREATE UNIQUE INDEX staff_conquest_drill_operations_active_pool_idx',
      "status <> 'FAILED'",
      'unixepoch(NEW.created_at) + 144000',
      "'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'",
      'CREATE TRIGGER staff_conquest_drill_operation_start_guard',
      'CREATE TRIGGER staff_conquest_drill_operation_match_guard',
      'CREATE TRIGGER staff_conquest_drill_operation_complete_guard',
      'CREATE TRIGGER staff_conquest_drill_operation_failure_guard',
      'CREATE TABLE staff_conquest_drill_audit',
      'Conquest drill audit rows are immutable',
      'operation.actor_user_id = NEW.actor_user_id'
    ].join('\n'),
    drillRepository: [
      'class ConquestDrillRepository',
      'system:conquest-readiness-drill:',
      'system:conquest-readiness-opponent:',
      'MATCH_TIMEOUT_MS',
      "status IN ('RUNNING', 'WAITING_DELIVERY')",
      'MATCH_OUTCOME_INVALID',
      'FROM conquest_verified_drill_receipts',
      'DELIVERY_WINDOW_EXPIRED',
      '/internal/conquest-readiness/matches'
    ].join('\n'),
    readinessMatch: [
      "'/internal/conquest-readiness/matches'",
      "row.status !== 'RUNNING'",
      'row.completed_match_count !== request.matchNumber - 1',
      'JOIN conquest_approved_active_reward_pools pool',
      "'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'",
      'repository.humanAccount(',
      'deriveGamePrincipal(userId)',
      'addressForBotPrivateKey(subkey)',
      'quests: []',
      'conquest-readiness-v1:',
      'repository.allocateIfMissing(allocation)',
      'repository.activate(proposalId, serverAddress)'
    ].join('\n'),
    gameMatch: [
      "request.proposalId.startsWith('readiness-drill-match-')",
      'match.player1.gameMode !== GameMode.CONQUEST_CONSTRUCTED',
      'match.player2.gameMode !== GameMode.CONQUEST_CONSTRUCTED',
      'bot-only matches are reserved for Conquest readiness',
      'export const botDifficultyForParticipant',
      'participants.every(',
      'player === 0 ? 1 : 0',
      'botDifficultyForParticipant('
    ].join('\n'),
    crossServiceReadiness: [
      'new ConquestDrillRepository(env.AUTH_DB)',
      'await repository.run(',
      'await matchService.fetch(',
      'GAME_SERVICE: {',
      'fetch: (request: Request) => SELF.fetch(request)',
      'runtimeEnv.GAME_MATCHES.getByName',
      'runDurableObjectAlarm(stub)',
      'botActionCounts',
      "status: 'active'",
      "statusType: 'GameOver'",
      "winner === undefined ? 'DRAW'",
      "expect(result).not.toHaveProperty('winner')",
      'JOIN multiplayer_match_conquest_progress progress',
      'multiplayer_match_conquest_point_players',
      'point_receipts: 1',
      'point_player_receipts: 2',
      'card_settlements: 0',
      'terminal match must not be dispatched twice',
      'advanced: 1',
      'failed: 1',
      'const dispatchReadinessMatch = async (',
      'expect(terminal.state.winner).toBe(0)',
      "status: 'WAITING_DELIVERY'",
      'completedMatchCount: 3',
      "settlement_status: 'APPLIED'",
      "silver_card_ids_json: '[6]'",
      "gold_card_ids_json: '[136]'",
      'point_receipts: 3',
      'point_player_receipts: 6',
      'pendingConquestCards(',
      'tokenIDs: [131_208]',
      'new Date(Date.parse(settlement!.deliver_at) - 1)',
      'applyConquestGoldDeliveryQueueMessage(',
      "kind: 'CONQUEST_GOLD'",
      'conquestId: settlement!.conquest_id',
      ").toBe('applied')",
      "event_type = 'DELAYED_REWARD_MINTED'",
      'gold_balance: 1',
      'verified_drill_receipts: 1',
      'completed: 1',
      'readiness: 0, enabled_modes: 0'
    ].join('\n'),
    scheduler: 'runConquestReadinessDrills(env)',
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
    v2RewardWorker: [
      'const resumableSchedule = async () => {',
      'JOIN conquest_v2_reward_cycles cycle',
      'JOIN conquest_v2_reward_cycle_policy_receipts receipt',
      "WHERE cycle.status <> 'COMPLETED'",
      '}',
      'const validatedSchedule = () => {}',
      'export const acceptDueConquestV2RewardCycle = async () => {',
      'const schedule =',
      '(await resumableSchedule(database, now)) ??',
      '(await activeSchedule(database, now))',
      '}'
    ].join('\n'),
    staff: [
      'requireConquestRewardPoolWrite(',
      'staff_conquest_reward_pool_permissions',
      'requireConquestReadinessWrite(',
      'staff_conquest_readiness_permissions',
      'requireConquestDrillRun(',
      'staff_conquest_drill_permissions',
      'requireConquestV2RewardScheduleWrite(',
      'staff_conquest_v2_reward_schedule_permissions'
    ].join('\n'),
    settlement: [
      'FROM conquest_approved_reward_pools',
      'conquest.reward_pool_version',
      'Conquest run has no pinned reward pool',
      'Date.parse(pool.ends_at) < admittedAt',
      'AND reward_pool_version = ?',
      'FROM player_account_settings settings',
      "THEN 'DISABLED' ELSE 'PENDING' END"
    ].join('\n'),
    goldModerationMigration: [
      "SET status = 'DISABLED'",
      'CREATE TRIGGER player_conquest_gold_initial_moderation_guard',
      'CREATE TRIGGER player_conquest_gold_claim_moderation_guard',
      'Conquest Gold delivery is blocked by account status',
      'delivery.status = CASE WHEN EXISTS',
      "'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'"
    ].join('\n'),
    goldDelivery: [
      "status IN ('PENDING', 'DISABLED')",
      'player_conquest_gold_deliveries.user_id',
      "'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'"
    ].join('\n'),
    sourceDelayedMinting: [
      'proto.AccountStatus_BANNED',
      'proto.AccountStatus_FLAGGED',
      'proto.TaskStatus_DISABLED',
      'db.In(proto.TaskStatus_PENDING, proto.TaskStatus_DISABLED)'
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
      "case 'GMListConquestDrills'",
      "case 'GMStartConquestDrill'",
      'requireConquestDrillRun(principal.userId)',
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
  for (const token of [
    "statusType: 'GameOver'",
    "winner === undefined ? 'DRAW'",
    "expect(result).not.toHaveProperty('winner')",
    'JOIN multiplayer_match_conquest_progress progress',
    'multiplayer_match_conquest_point_players',
    'point_receipts: 1',
    'point_player_receipts: 2',
    'card_settlements: 0',
    'terminal match must not be dispatched twice',
    'advanced: 1',
    'failed: 1',
    'const dispatchReadinessMatch = async (',
    'expect(terminal.state.winner).toBe(0)',
    "status: 'WAITING_DELIVERY'",
    'completedMatchCount: 3',
    "settlement_status: 'APPLIED'",
    "silver_card_ids_json: '[6]'",
    "gold_card_ids_json: '[136]'",
    'point_receipts: 3',
    'point_player_receipts: 6',
    'pendingConquestCards(',
    'tokenIDs: [131_208]',
    'new Date(Date.parse(settlement!.deliver_at) - 1)',
    'applyConquestGoldDeliveryQueueMessage(',
    "kind: 'CONQUEST_GOLD'",
    'conquestId: settlement!.conquest_id',
    ").toBe('applied')",
    "event_type = 'DELAYED_REWARD_MINTED'",
    'gold_balance: 1',
    'verified_drill_receipts: 1',
    'completed: 1'
  ]) {
    assert.ok(
      conquestGateErrors(
        {},
        {
          ...evidence,
          crossServiceReadiness: evidence.crossServiceReadiness.replace(
            token,
            ''
          )
        }
      ).length > 0,
      `${token} removal must fail the release gate`
    )
  }
  for (const token of [
    'export const botDifficultyForParticipant',
    'participants.every(',
    'player === 0 ? 1 : 0',
    'botDifficultyForParticipant('
  ]) {
    assert.ok(
      conquestGateErrors(
        {},
        {
          ...evidence,
          gameMatch: evidence.gameMatch.replace(token, '')
        }
      ).length > 0,
      `${token} removal must fail the release gate`
    )
  }
  for (const source of [
    'matchService',
    'migration',
    'poolActivation',
    'poolOperationsMigration',
    'poolOperations',
    'poolWindowSafety',
    'readinessOperationsMigration',
    'readinessOperations',
    'drillMigration',
    'drillRepository',
    'readinessMatch',
    'gameMatch',
    'crossServiceReadiness',
    'scheduler',
    'v2ScheduleActivation',
    'v2ScheduleOperationsMigration',
    'v2ScheduleOperations',
    'v2RewardWorker',
    'staff',
    'settlement',
    'goldModerationMigration',
    'goldDelivery',
    'sourceDelayedMinting',
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

test('keeps snapshotted Conquest V2 delivery ahead of later schedule changes', async () => {
  const worker = await readFile(
    'cloudflare/src/conquest-v2-reward-worker.ts',
    'utf8'
  )
  assert.deepEqual(conquestV2ResumeSafetyErrors(worker), [])

  assert.ok(
    conquestV2ResumeSafetyErrors(
      worker.replace(
        "WHERE cycle.status <> 'COMPLETED'",
        "WHERE schedule.enabled = 1 AND cycle.status <> 'COMPLETED'"
      )
    ).some(error => error.includes('current schedule switch'))
  )
  assert.ok(
    conquestV2ResumeSafetyErrors(
      worker.replace(
        `(await resumableSchedule(database, now)) ??
    (await activeSchedule(database, now))`,
        `(await activeSchedule(database, now)) ??
    (await resumableSchedule(database, now))`
      )
    ).some(error => error.includes('resume a pinned incomplete cycle'))
  )
})

test('requires Workflow, Queue, D1, and recovery evidence for Conquest V2', async () => {
  const [migration, orchestration, worker, scheduler, testSource, configText] =
    await Promise.all([
      readFile(
        'cloudflare/migrations/0121_conquest_v2_workflow_handoffs.sql',
        'utf8'
      ),
      readFile('cloudflare/src/conquest-v2-reward-orchestration.ts', 'utf8'),
      readFile('cloudflare/src/conquest-v2-reward-worker.ts', 'utf8'),
      readFile('cloudflare/src/index.ts', 'utf8'),
      readFile('cloudflare/test/conquest-v2-reward-worker.test.ts', 'utf8'),
      readFile('wrangler.jsonc', 'utf8')
    ])
  const evidence = {
    migration,
    orchestration,
    worker,
    scheduler,
    test: testSource,
    config: JSON.parse(configText)
  }
  assert.deepEqual(conquestV2CloudflareOrchestrationErrors(evidence), [])
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      orchestration: orchestration.replace('step.sleepUntil(', 'step.sleep(')
    }).some(error => error.includes('Workflow/Queue adapter'))
  )
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      migration: migration.replace(
        'conquest_v2_reward_delivery_failures_no_delete',
        'weakened_delivery_failures_guard'
      )
    }).some(error => error.includes('handoff migration'))
  )
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      scheduler: scheduler.replace(
        'dispatchDueConquestV2Rewards(env)',
        'runDueConquestV2Rewards(env.AUTH_DB)'
      )
    }).some(error => error.includes('cron'))
  )
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      scheduler: scheduler.replace(
        'if (batch.queue === CONQUEST_V2_REWARD_QUEUE_NAME)',
        'if (batch.queue === LEADERBOARD_REWARD_QUEUE_NAME)'
      )
    }).some(error => error.includes('named Queue'))
  )
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      scheduler: scheduler.replace(
        'export { ConquestV2RewardWorkflow, LeaderboardRewardWorkflow }',
        'export { LeaderboardRewardWorkflow }'
      )
    }).some(error => error.includes('entrypoint'))
  )
  const unsafeConfig = structuredClone(evidence.config)
  delete unsafeConfig.queues.consumers.find(
    consumer => consumer.queue === 'cloud-weasel-conquest-v2-reward-delivery'
  ).dead_letter_queue
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      config: unsafeConfig
    }).some(error => error.includes('Queue/DLQ'))
  )
  assert.ok(
    conquestV2CloudflareOrchestrationErrors({
      ...evidence,
      test: testSource.replace(
        'attempt seven after six Queue failures',
        'terminally fails after five Queue attempts'
      )
    }).some(error => error.includes('orchestration regression'))
  )
})

test('derives every Conquest V2 treasure consumer from Go and bounds large delivery batches', async () => {
  const [source, treasure, sql, policy, progress, points, economy, worker] =
    await Promise.all([
      readFile('api/lib/conquest/conquestv2/treasure_map.go', 'utf8'),
      readFile('lib/shared/src/conquest-v2-treasure.ts', 'utf8'),
      readFile('cloudflare/src/conquest-v2-treasure.ts', 'utf8'),
      readFile('cloudflare/src/conquest-v2-reward-policy.ts', 'utf8'),
      readFile('cloudflare/src/conquest.ts', 'utf8'),
      readFile('game-server-cloudflare/src/conquest-points.ts', 'utf8'),
      readFile('cloudflare/src/conquest-v2-economy.ts', 'utf8'),
      readFile('cloudflare/src/conquest-v2-reward-worker.ts', 'utf8')
    ])
  const consumers = { sql, policy, progress, points, economy, worker }
  assert.deepEqual(
    conquestV2TreasureSourceParityErrors(source, treasure, consumers),
    []
  )
  assert.deepEqual(conquestV2DeliveryBatchErrors(worker), [])

  assert.ok(
    conquestV2TreasureSourceParityErrors(
      source.replace('10: conquestPointsCap', '10: 13749'),
      treasure,
      consumers
    ).some(error => error.includes('points drifted from Go'))
  )
  assert.ok(
    conquestV2TreasureSourceParityErrors(
      source,
      treasure.replace('218.69', '218.68'),
      consumers
    ).some(error => error.includes('weights drifted from Go'))
  )
  assert.ok(
    conquestV2TreasureSourceParityErrors(source, treasure, {
      ...consumers,
      progress: progress.replaceAll(
        'conquestV2TreasureProgress',
        'driftedTreasureProgress'
      )
    }).some(error => error.includes('progress does not use shared'))
  )
  assert.ok(
    conquestV2TreasureSourceParityErrors(source, treasure, {
      ...consumers,
      points: points.replace(
        'CONQUEST_V2_POINTS_CAP,',
        'const POINTS_CAP = 13_749\n  CONQUEST_V2_POINTS_CAP,'
      )
    }).some(error => error.includes('points duplicates the treasure map'))
  )
  assert.ok(
    conquestV2DeliveryBatchErrors(
      worker.replace(
        'GROUP BY award.id, selected.value, item.balance',
        'GROUP BY award.id, selected.value'
      )
    ).some(error => error.includes('set-based delivery is missing'))
  )
  assert.ok(
    conquestV2DeliveryBatchErrors(
      worker.replace(
        'const statements: D1PreparedStatement[] = [',
        'for (const [cardId, count] of cardCounts) {}\n  const statements: D1PreparedStatement[] = ['
      )
    ).some(error => error.includes('statements per distinct card'))
  )
})

test('derives Conquest V2 point earning and turn eligibility from Go', async () => {
  const [sourceParts, worker, sharedHeroSkins, sharedConstants, repository] =
    await Promise.all([
      Promise.all([
        readFile('api/lib/conquest/conquestv2/points_updater.go', 'utf8'),
        readFile('api/lib/conquest/conquestv2/points_calculator.go', 'utf8'),
        readFile(
          'api/lib/conquest/conquestv2/card_points_calculator.go',
          'utf8'
        ),
        readFile('api/data/hero_skin.go', 'utf8'),
        readFile('api/data/hero.go', 'utf8'),
        readFile('api/proto/api.gen.go', 'utf8'),
        readFile(
          'api/data/schema/migrations/30000000000181_create_hero_skins_table.sql',
          'utf8'
        )
      ]),
      readFile('game-server-cloudflare/src/conquest-points.ts', 'utf8'),
      readFile('lib/shared/src/source-hero-skins.ts', 'utf8'),
      readFile('lib/shared/src/constants.ts', 'utf8'),
      readFile('match-service-cloudflare/src/repository.ts', 'utf8')
    ])
  const source = sourceParts.join('\n')
  const errors = (
    workerSource = worker,
    heroSkinSource = sharedHeroSkins,
    constantSource = sharedConstants,
    repositorySource = repository
  ) =>
    conquestV2PointsSourceParityErrors(
      source,
      workerSource,
      heroSkinSource,
      constantSource,
      repositorySource
    )
  assert.deepEqual(errors(), [])

  for (const mutation of [
    worker.replace('const EVENT_ID = 2', 'const EVENT_ID = 1'),
    worker.replace('turnCount >= 8', 'turnCount >= 9'),
    worker.replace('let earned =\n        4 +', 'let earned =\n        5 +'),
    worker.replace(
      'byCard.set(item.token_id, 3)',
      'byCard.set(item.token_id, 2)'
    ),
    worker.replace('Math.ceil(earned * 0.25)', 'Math.ceil(earned * 0.2)'),
    worker.replace('if (winner !== undefined)', 'if (winner === 0)'),
    worker.replace(
      "throw new Error('Conquest match deck is malformed')",
      'return { cardIds: [], deckClass: DeckClass.STR, heroSkinId: 1 }'
    ),
    worker.replace('deck.heroSkinId)', '1)')
  ]) {
    assert.ok(errors(mutation).length > 0)
  }
  assert.ok(
    errors(
      worker,
      sharedHeroSkins.replace('[Hero.SAMYA]: 2', '[Hero.SAMYA]: 22')
    ).some(error => error.includes('hero-skin IDs drifted'))
  )
  assert.ok(
    errors(
      worker,
      sharedHeroSkins,
      sharedConstants.replace(
        '[DeckClass.AGY]: Hero.SAMYA',
        '[DeckClass.AGY]: Hero.ADA'
      )
    ).some(error => error.includes('deck-class heroes drifted'))
  )
  assert.ok(
    errors(
      worker,
      sharedHeroSkins,
      sharedConstants,
      repository.replaceAll(
        'sourceHeroSkinIdForDeckClass',
        'localHeroSkinForDeckClass'
      )
    ).some(error => error.includes('match service'))
  )
})

test('pins WASM filledDeck as the shared points and deck-rank authority', async () => {
  const [
    server,
    apiClient,
    pointsSource,
    ranksSource,
    runtime,
    gameMatch,
    authoritativeDecks,
    migration,
    points,
    ranks
  ] = await Promise.all([
    readFile('server/src/worker/match/Match.ts', 'utf8'),
    readFile('server/src/ApiClient.ts', 'utf8'),
    readFile('api/lib/conquest/conquestv2/points_updater.go', 'utf8'),
    readFile('api/lib/decks/rank_updater.go', 'utf8'),
    readFile('game-server-cloudflare/src/state-runtime.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('game-server-cloudflare/src/authoritative-decks.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0115_authoritative_match_decks.sql',
      'utf8'
    ),
    readFile('game-server-cloudflare/src/conquest-points.ts', 'utf8'),
    readFile('game-server-cloudflare/src/deck-ranks.ts', 'utf8')
  ])
  const source = { server, apiClient, points: pointsSource, ranks: ranksSource }
  const worker = {
    runtime,
    gameMatch,
    authoritativeDecks,
    migration,
    points,
    ranks
  }
  const errors = (sourceMutation = {}, workerMutation = {}) =>
    conquestFilledDeckAuthorityErrors(
      { ...source, ...sourceMutation },
      { ...worker, ...workerMutation }
    )
  assert.deepEqual(errors(), [])

  for (const mutation of [
    [
      {
        server: server.replace(
          'secrets[p].secret.filledDeck',
          'secrets[p].secret.originalDeck'
        )
      },
      {}
    ],
    [
      {
        apiClient: apiClient.replace(
          'player1DeckString: match.playerContexts[0].realDeckString',
          'player1DeckString: match.playerContexts[0].deckString'
        )
      },
      {}
    ],
    [
      {
        ranks: ranksSource.replace(
          'match.Player1DeckString',
          'match.InitPlayer1DeckString'
        )
      },
      {}
    ],
    [
      {},
      {
        runtime: runtime.replace(
          'authoritativeFilledDecks()',
          'submittedDecks()'
        )
      }
    ],
    [
      {},
      {
        gameMatch: gameMatch.replace(
          'await persistAuthoritativeMatchDecks(',
          'void persistAuthoritativeMatchDecks('
        )
      }
    ],
    [
      {},
      {
        authoritativeDecks: authoritativeDecks.replace(
          'WHERE NOT EXISTS (',
          'WHERE EXISTS ('
        )
      }
    ],
    [
      {},
      {
        migration: migration.replace(
          'multiplayer_match_authoritative_decks_no_update',
          'mutable_authoritative_decks'
        )
      }
    ],
    [
      {},
      {
        points: points.replaceAll(
          'readAuthoritativeMatchDeckStrings',
          'readSubmittedDeckStrings'
        )
      }
    ],
    [{}, { ranks: `${ranks}\nconst match_payload_json = true` }]
  ]) {
    assert.ok(errors(mutation[0], mutation[1]).length > 0)
  }
})

test('derives Conquest settlement rewards and terminal behavior from source', async () => {
  const [stateManager, conquestModel, cardIndex, settlement, progression] =
    await Promise.all([
      readFile('api/lib/conquest/state_manager.go', 'utf8'),
      readFile('api/data/conquest.go', 'utf8'),
      readFile('api/data/card_index.go', 'utf8'),
      readFile('game-server-cloudflare/src/conquest-settlement.ts', 'utf8'),
      readFile('game-server-cloudflare/src/progression.ts', 'utf8')
    ])
  const source = `${stateManager}\n${conquestModel}\n${cardIndex}`
  assert.deepEqual(
    conquestSettlementSourceParityErrors(source, settlement, progression),
    []
  )

  assert.match(
    conquestSettlementSourceParityErrors(
      source,
      settlement.replace(
        'return { silver: 2, gold: 0 }',
        'return { silver: 1, gold: 0 }'
      ),
      progression
    )[0],
    /reward bundles drifted/
  )
  assert.match(
    conquestSettlementSourceParityErrors(
      source.replace('i <= 2', 'i <= 1'),
      settlement,
      progression
    )[0],
    /reward bundles drifted/
  )
  assert.ok(
    conquestSettlementSourceParityErrors(
      source,
      settlement.replace(
        "['DELAYED_REWARD', goldTokenIds]",
        "['REWARD', goldTokenIds]"
      ),
      progression
    ).some(error => error.includes('feed projection drifted'))
  )
  assert.ok(
    conquestSettlementSourceParityErrors(
      source,
      settlement,
      progression.replace('wins >= 3', 'wins >= 4')
    ).some(error => error.includes('terminal contract is missing'))
  )
  assert.ok(
    conquestSettlementSourceParityErrors(
      source,
      settlement,
      progression.replace(
        'conquestRewardBundle(wins)',
        'conquestRewardBundle(wins === 0 ? 0 : 1)'
      )
    ).some(error => error.includes('terminal contract is missing'))
  )
  assert.ok(
    conquestSettlementSourceParityErrors(
      source,
      settlement.replace('amount: 0', 'amount: 1'),
      progression
    ).some(error => error.includes('reward wire'))
  )
  assert.ok(
    conquestSettlementSourceParityErrors(
      source,
      settlement.replace('itemType: ItemType.UNKNOWN', 'itemType: itemType'),
      progression
    ).some(error => error.includes('reward wire'))
  )
  assert.ok(
    conquestSettlementSourceParityErrors(
      source.replace(
        'card.ImageURL = m.GetImageURL(card.ID)',
        `card.ItemType = proto.ItemType_SW_SILVER_CARDS
        card.ImageURL = m.GetImageURL(card.ID)`
      ),
      settlement,
      progression
    ).some(error => error.includes('source Conquest reward wire'))
  )
})

test('pins pending Conquest settlement to the source transaction boundary', async () => {
  const [sourceMatches, gameMatch, repository, rpcTest] = await Promise.all([
    readFile('api/rpc/matches.go', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('cloudflare/src/conquest.ts', 'utf8'),
    readFile('cloudflare/test/conquest-rpc.test.ts', 'utf8')
  ])
  const errors = (
    sourceMutation = sourceMatches,
    gameMutation = gameMatch,
    repositoryMutation = repository,
    testMutation = rpcTest
  ) =>
    conquestSettlementAdmissionErrors(
      sourceMutation,
      gameMutation,
      repositoryMutation,
      testMutation
    )

  assert.deepEqual(errors(), [])
  assert.ok(
    errors(
      sourceMatches.replace(
        'err := repo.TxContext(ctx, func(tx db.Session) error {',
        'err := repo.NoTx(ctx, func(tx db.Session) error {'
      )
    ).some(error => error.includes('match-completion transaction'))
  )
  assert.ok(
    errors(
      sourceMatches,
      gameMatch.replace(
        'const conquestCards = await settleConquestRewardsForMatch(',
        'const conquestCards = await deferConquestRewardsForMatch('
      )
    ).some(error => error.includes('retry stages'))
  )
  assert.ok(
    errors(
      sourceMatches,
      gameMatch,
      repository.replace(
        "status IN ('IN_PROGRESS', 'REWARDS_PENDING')",
        "status = 'IN_PROGRESS'"
      )
    ).some(error => error.includes('admission lookup'))
  )
  assert.ok(
    errors(
      sourceMatches,
      gameMatch,
      repository.replace('AND NOT EXISTS (', 'AND EXISTS (')
    ).some(error => error.includes('insert race guard'))
  )
  assert.ok(
    errors(
      sourceMatches,
      gameMatch,
      repository.replaceAll(
        'conquest rewards are still settling',
        'enter conquest'
      )
    ).some(error => error.includes('admission boundary'))
  )
  assert.ok(
    errors(
      sourceMatches,
      gameMatch,
      repository,
      rpcTest.replace(
        '.toEqual({ balance: 2, conquests: 1, in_progress: 0 })',
        '.toEqual({ balance: 1, conquests: 1, in_progress: 0 })'
      )
    ).some(error => error.includes('runtime proof'))
  )
})

test('withholds Conquest projections until source-atomic match publication', async () => {
  const [sourceMatches, sourceConquests, publication, repository, rpcTest] =
    await Promise.all([
      readFile('api/rpc/matches.go', 'utf8'),
      readFile('api/rpc/conquests.go', 'utf8'),
      readFile('game-server-cloudflare/src/completion-publication.ts', 'utf8'),
      readFile('cloudflare/src/conquest.ts', 'utf8'),
      readFile('cloudflare/test/conquest-rpc.test.ts', 'utf8')
    ])
  const errors = (
    sourceMatchMutation = sourceMatches,
    sourceConquestMutation = sourceConquests,
    publicationMutation = publication,
    repositoryMutation = repository,
    testMutation = rpcTest
  ) =>
    conquestProjectionPublicationErrors(
      sourceMatchMutation,
      sourceConquestMutation,
      publicationMutation,
      repositoryMutation,
      testMutation
    )

  assert.deepEqual(errors(), [])
  assert.ok(
    errors(sourceMatches.replaceAll('tx.Save(match)', 'tx.Skip(match)')).some(
      error => error.includes('publication transaction')
    )
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests.replace(
        'repo.Conquests().FindInProgress(accountID)',
        'repo.Conquests().FindLatest(accountID)'
      )
    ).some(error => error.includes('ConquestStatus'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests.replaceAll(
        'jsonb_object_keys(match_progress)',
        'jsonb_keys(match_progress)'
      )
    ).some(error => error.includes('ConquestStats'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      publication.replace("SET status = 'ended'", "SET status = 'active'")
    ).some(error => error.includes('publication barrier'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      publication,
      repository.replace("WHERE status <> 'ended'", "WHERE status = 'ended'")
    ).some(error => error.includes('unpublished-match lookup'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      publication,
      repository.replace(
        "conquest.status = 'IN_PROGRESS'\n             OR EXISTS (",
        "conquest.status = 'IN_PROGRESS'\n             AND EXISTS ("
      )
    ).some(error => error.includes('ConquestStatus publication'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      publication,
      repository.replace(
        '.filter(([matchId]) => !unpublishedMatchIds.has(matchId))',
        '.filter(() => true)'
      )
    ).some(error => error.includes('progress filter'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      publication,
      repository.replaceAll(' && !progress.withheld', '')
    ).some(error => error.includes('terminal rewards'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      publication,
      repository,
      rpcTest.replace(
        'constructedMatchesPlayed: 1',
        'constructedMatchesPlayed: 2'
      )
    ).some(error => error.includes('runtime proof'))
  )
})

test('withholds Conquest V2 points until source-atomic match publication', async () => {
  const [
    sourceMatches,
    sourceConquests,
    sourcePoints,
    publication,
    repository,
    rpcTest
  ] = await Promise.all([
    readFile('api/rpc/matches.go', 'utf8'),
    readFile('api/rpc/conquests.go', 'utf8'),
    readFile('api/lib/conquest/conquestv2/points_updater.go', 'utf8'),
    readFile('game-server-cloudflare/src/completion-publication.ts', 'utf8'),
    readFile('cloudflare/src/conquest.ts', 'utf8'),
    readFile('cloudflare/test/conquest-rpc.test.ts', 'utf8')
  ])
  const errors = (
    sourceMatchMutation = sourceMatches,
    sourceConquestMutation = sourceConquests,
    sourcePointMutation = sourcePoints,
    publicationMutation = publication,
    repositoryMutation = repository,
    testMutation = rpcTest
  ) =>
    conquestV2PointsPublicationErrors(
      sourceMatchMutation,
      sourceConquestMutation,
      sourcePointMutation,
      publicationMutation,
      repositoryMutation,
      testMutation
    )

  assert.deepEqual(errors(), [])
  assert.ok(
    errors(sourceMatches.replaceAll('tx.Save(match)', 'tx.Skip(match)')).some(
      error => error.includes('point transaction')
    )
  )
  assert.ok(
    errors(
      sourceMatches.replace(
        's.ConquestV2PointsUpdater.Update(ctx, sess, match)',
        's.ConquestV2PointsUpdater.Skip(ctx, sess, match)'
      )
    ).some(error => error.includes('no longer updates'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests.replace(
        'repo.ConquestPoints(nil).FindOrCreateByAddressAndEventID',
        'repo.ConquestPoints(nil).FindByAddressAndEventID'
      )
    ).some(error => error.includes('ConquestV2Progress read'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      sourcePoints,
      publication.replace("SET status = 'ended'", "SET status = 'active'")
    ).some(error => error.includes('point publication'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      sourcePoints,
      publication,
      repository.replaceAll("match.status <> 'ended'", "match.status = 'ended'")
    ).some(error => error.includes('publication projection'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      sourcePoints,
      publication,
      repository.replace(
        '(SELECT before_points FROM unpublished)',
        'points.current_points'
      )
    ).some(error => error.includes('publication projection'))
  )
  assert.ok(
    errors(
      sourceMatches,
      sourceConquests,
      sourcePoints,
      publication,
      repository,
      rpcTest.replace(
        'current: 200,\n      total: 1200',
        'current: 500,\n      total: 1500'
      )
    ).some(error => error.includes('runtime proof'))
  )
})
