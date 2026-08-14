import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONQUEST_MODES = new Set([
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY'
])

const reviewedPoolCardIds = poolActivation => {
  const match = poolActivation.match(
    /INSERT INTO conquest_reward_pool_valid_card_ranges[\s\S]*?VALUES([\s\S]*?);/
  )
  if (!match) return undefined
  const ids = []
  for (const range of match[1].matchAll(/\((\d+),\s*(\d+)\)/g)) {
    const first = Number(range[1])
    const last = Number(range[2])
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) {
      return undefined
    }
    for (let cardId = first; cardId <= last; cardId += 1) ids.push(cardId)
  }
  return ids
}

export const conquestPoolCatalogErrors = (poolActivation, cardLibrary) => {
  const errors = []
  let cards
  try {
    cards = JSON.parse(cardLibrary).cards
  } catch {
    return ['generated Conquest card catalog is not valid JSON']
  }
  if (!Array.isArray(cards))
    return ['generated Conquest card catalog is missing']
  const generated = cards
    .map(card => card?.id)
    .filter(cardId => Number.isSafeInteger(cardId))
    .sort((left, right) => left - right)
  const reviewed = reviewedPoolCardIds(poolActivation)
  if (!reviewed) return ['reviewed Conquest card ranges are missing']
  if (
    generated.length !== new Set(generated).size ||
    reviewed.length !== new Set(reviewed).size
  ) {
    errors.push('Conquest card IDs must be unique')
  }
  if (
    generated.length !== reviewed.length ||
    generated.some((cardId, index) => cardId !== reviewed[index])
  ) {
    errors.push(
      'reviewed Conquest pool card ranges differ from the generated playable catalog'
    )
  }
  return errors
}

export const conquestGateErrors = (config, evidence = {}) => {
  const errors = []
  const configured = String(config?.vars?.ENABLED_GAME_MODES ?? '')
    .split(',')
    .map(mode => mode.trim())
    .filter(Boolean)
  errors.push(
    ...configured
      .filter(mode => CONQUEST_MODES.has(mode))
      .map(
        mode =>
          `${mode} cannot bypass the receipt-backed D1 readiness gate through deployment configuration`
      )
  )
  if (evidence.matchService !== undefined) {
    for (const token of [
      'isConquestQueueReady(env.AUTH_DB, at)',
      'CONQUEST_GAME_MODES',
      'modes.delete(mode as GameMode)',
      'currentMatchmakerGameModes',
      "'/internal/matchmaker/game-modes'",
      'participantModeEnabled',
      'conquestRepository.isDrainable(identity.userId, mode)'
    ]) {
      if (!evidence.matchService.includes(token)) {
        errors.push(`match service lost dynamic Conquest clamp: ${token}`)
      }
    }
  }
  if (evidence.drainMigration !== undefined) {
    for (const token of [
      'CREATE VIEW conquest_approved_queue_pools',
      'FROM conquest_approved_reward_pools pool',
      'JOIN conquest_verified_drill_receipts drill',
      'JOIN staff_conquest_readiness_operations operation',
      "operation.status = 'APPLIED'",
      'ready.verified_at >= pool.starts_at'
    ]) {
      if (!evidence.drainMigration.includes(token)) {
        errors.push(
          `Conquest admitted-run drain migration is missing: ${token}`
        )
      }
    }
  }
  if (evidence.drainRepository !== undefined) {
    for (const token of [
      'isDrainable(userId: string, mode: GameMode)',
      'drainingModes()',
      'JOIN conquest_approved_queue_pools pool',
      'mode.game_mode = conquest.mode AND mode.enabled = 1',
      "conquest.status = 'IN_PROGRESS'",
      "strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)",
      'pool.starts_at <= conquest.created_at',
      'pool.ends_at >= conquest.created_at'
    ]) {
      if (!evidence.drainRepository.includes(token)) {
        errors.push(`Conquest admitted-run drain boundary is missing: ${token}`)
      }
    }
  }
  if (evidence.matchmaker !== undefined) {
    if (
      !evidence.matchmaker.includes(
        "'https://cloud-weasel-match/internal/matchmaker/game-modes'"
      )
    ) {
      errors.push('matchmaker is not using the admitted-run drain switchboard')
    }
  }
  if (evidence.migration !== undefined) {
    for (const token of [
      'CREATE VIEW conquest_verified_drill_receipts',
      "conquest.entry_key LIKE 'readiness-drill:%'",
      "settlement.application_status = 'APPLIED'",
      "delivery.application_status = 'APPLIED'",
      "event.event_type = 'DELAYED_REWARD_MINTED'",
      'unixepoch(delivery.deliver_at) = unixepoch(settlement.settled_at) + 86400',
      'verified off-chain Conquest drill receipts required',
      'CREATE TRIGGER conquest_queue_readiness_no_update',
      'CREATE TRIGGER conquest_queue_readiness_no_delete'
    ]) {
      if (!evidence.migration.includes(token)) {
        errors.push(`receipt-backed readiness migration is missing: ${token}`)
      }
    }
  }
  if (evidence.poolActivation !== undefined) {
    for (const token of [
      'CREATE TABLE conquest_reward_pool_activations',
      'CREATE TRIGGER conquest_reward_pools_draft_insert_guard',
      'CREATE TRIGGER conquest_reward_pool_activation_insert_guard',
      'CREATE TRIGGER conquest_reward_pool_activation_update_guard',
      'NEW.activated_by_user_id = OLD.created_by_user_id',
      'CREATE VIEW conquest_approved_active_reward_pools',
      'JOIN conquest_approved_active_reward_pools approved',
      'verified approved Conquest reward pool required'
    ]) {
      if (!evidence.poolActivation.includes(token)) {
        errors.push(`Conquest pool approval migration is missing: ${token}`)
      }
    }
    if (evidence.cardLibrary !== undefined) {
      errors.push(
        ...conquestPoolCatalogErrors(
          evidence.poolActivation,
          evidence.cardLibrary
        )
      )
    }
  }
  if (evidence.poolOperationsMigration !== undefined) {
    for (const token of [
      'CREATE TABLE staff_conquest_reward_pool_permissions',
      "permission IN ('PROPOSE', 'ACTIVATE', 'RETIRE')",
      'CREATE TABLE staff_conquest_reward_pool_operations',
      'CREATE UNIQUE INDEX staff_conquest_reward_pool_operations_once_idx',
      'CREATE TRIGGER staff_conquest_reward_pool_operation_apply_guard',
      'CREATE TABLE staff_conquest_reward_pool_audit',
      'staff Conquest reward pool audit rows are immutable'
    ]) {
      if (!evidence.poolOperationsMigration.includes(token)) {
        errors.push(`Conquest pool operations migration is missing: ${token}`)
      }
    }
  }
  if (evidence.poolOperations !== undefined) {
    for (const token of [
      "ConquestRewardPoolOperation = 'PROPOSE' | 'ACTIVATE' | 'RETIRE'",
      'createdByUserId === actorUserId',
      'cardManifest does not match proposal',
      'overlappingActivePool(',
      'Conquest pool window overlaps active pool',
      "'x-cloud-weasel-operation-key'",
      'operation_key, operation, pool_version, actor_user_id'
    ]) {
      if (!evidence.poolOperations.includes(token)) {
        errors.push(`Conquest pool operations adapter is missing: ${token}`)
      }
    }
  }
  if (evidence.poolWindowSafety !== undefined) {
    for (const token of [
      'conquest_reward_pool_window_migration_guard',
      'first_pool.starts_at <= second_pool.ends_at',
      'first_pool.ends_at >= second_pool.starts_at',
      'CREATE TRIGGER conquest_reward_pool_activation_window_guard',
      'CREATE TRIGGER conquest_reward_pool_lifecycle_window_guard',
      'DROP INDEX conquest_reward_pools_one_active_idx',
      'Conquest reward pool windows cannot overlap'
    ]) {
      if (!evidence.poolWindowSafety.includes(token)) {
        errors.push(`Conquest pool window safety is missing: ${token}`)
      }
    }
  }
  if (evidence.readinessOperationsMigration !== undefined) {
    for (const token of [
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
    ]) {
      if (!evidence.readinessOperationsMigration.includes(token)) {
        errors.push(
          `Conquest readiness operations migration is missing: ${token}`
        )
      }
    }
  }
  if (evidence.readinessOperations !== undefined) {
    for (const token of [
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
    ]) {
      if (!evidence.readinessOperations.includes(token)) {
        errors.push(
          `Conquest readiness operations adapter is missing: ${token}`
        )
      }
    }
  }
  if (evidence.v2ScheduleActivation !== undefined) {
    for (const token of [
      'CREATE TABLE conquest_v2_reward_schedule_activations',
      'activated_by_user_id <> created_by_user_id',
      'settings.version = NEW.settings_version',
      'settings.mutation_id = NEW.settings_mutation_id',
      'Conquest V2 reward policy activation is invalid'
    ]) {
      if (!evidence.v2ScheduleActivation.includes(token)) {
        errors.push(`Conquest V2 schedule activation is missing: ${token}`)
      }
    }
  }
  if (evidence.v2ScheduleOperationsMigration !== undefined) {
    for (const token of [
      'CREATE TABLE staff_conquest_v2_reward_schedule_permissions',
      "permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')",
      'CREATE TABLE staff_conquest_v2_reward_schedule_operations',
      'CREATE UNIQUE INDEX staff_conquest_v2_reward_schedule_operations_once_idx',
      'CREATE TRIGGER staff_conquest_v2_reward_schedule_operation_apply_guard',
      'activation.activated_at = NEW.created_at',
      'activation.activated_at <= schedule.starts_at',
      'CREATE TABLE staff_conquest_v2_reward_schedule_audit',
      'staff Conquest V2 reward schedule audit rows are immutable'
    ]) {
      if (!evidence.v2ScheduleOperationsMigration.includes(token)) {
        errors.push(
          `Conquest V2 schedule operations migration is missing: ${token}`
        )
      }
    }
  }
  if (evidence.v2ScheduleOperations !== undefined) {
    for (const token of [
      "ConquestV2RewardScheduleOperation =\n  | 'PROPOSE'\n  | 'ACTIVATE'\n  | 'DISABLE'",
      'version !== replacesVersion + 1',
      'CONQUEST_V2_REWARD_POLICY_HASH',
      'createdByUserId === actorUserId',
      'settings confirmation does not match',
      'settings changed after proposal',
      'Silver quantity confirmation is unsafe',
      'startsAt must be in the future',
      "'x-cloud-weasel-operation-key'"
    ]) {
      if (!evidence.v2ScheduleOperations.includes(token)) {
        errors.push(
          `Conquest V2 schedule operations adapter is missing: ${token}`
        )
      }
    }
  }
  if (evidence.staff !== undefined) {
    for (const token of [
      'requireConquestRewardPoolWrite(',
      'staff_conquest_reward_pool_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest pool staff authority is missing: ${token}`)
      }
    }
    for (const token of [
      'requireConquestReadinessWrite(',
      'staff_conquest_readiness_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest readiness staff authority is missing: ${token}`)
      }
    }
    for (const token of [
      'requireConquestV2RewardScheduleWrite(',
      'staff_conquest_v2_reward_schedule_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest V2 schedule staff authority is missing: ${token}`)
      }
    }
  }
  if (evidence.settlement !== undefined) {
    for (const token of [
      'FROM conquest_approved_reward_pools',
      'conquest.reward_pool_version',
      'Conquest run has no pinned reward pool',
      'Date.parse(pool.ends_at) < admittedAt',
      'AND reward_pool_version = ?',
      'FROM player_account_settings settings',
      "THEN 'DISABLED' ELSE 'PENDING' END"
    ]) {
      if (!evidence.settlement.includes(token)) {
        errors.push(`Conquest settlement lost approved-pool gate: ${token}`)
      }
    }
  }
  if (evidence.goldModerationMigration !== undefined) {
    for (const token of [
      "SET status = 'DISABLED'",
      'CREATE TRIGGER player_conquest_gold_initial_moderation_guard',
      'CREATE TRIGGER player_conquest_gold_claim_moderation_guard',
      'Conquest Gold delivery is blocked by account status',
      'delivery.status = CASE WHEN EXISTS',
      "'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'"
    ]) {
      if (!evidence.goldModerationMigration.includes(token)) {
        errors.push(`Conquest Gold moderation migration is missing: ${token}`)
      }
    }
  }
  if (evidence.goldDelivery !== undefined) {
    for (const token of [
      "status IN ('PENDING', 'DISABLED')",
      'player_conquest_gold_deliveries.user_id',
      "'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'"
    ]) {
      if (!evidence.goldDelivery.includes(token)) {
        errors.push(`Conquest Gold delivery boundary is missing: ${token}`)
      }
    }
  }
  if (evidence.sourceDelayedMinting !== undefined) {
    for (const token of [
      'proto.AccountStatus_BANNED',
      'proto.AccountStatus_FLAGGED',
      'proto.TaskStatus_DISABLED',
      'db.In(proto.TaskStatus_PENDING, proto.TaskStatus_DISABLED)'
    ]) {
      if (!evidence.sourceDelayedMinting.includes(token)) {
        errors.push(`source delayed Conquest Gold contract is missing: ${token}`)
      }
    }
  }
  if (evidence.settlementPinning !== undefined) {
    for (const token of [
      'ADD COLUMN reward_pool_version TEXT',
      'CREATE VIEW conquest_approved_reward_pools',
      "pool.status IN ('ACTIVE', 'RETIRED')",
      'CREATE TRIGGER player_conquests_reward_pool_pin_no_update',
      'conquest.reward_pool_version = NEW.pool_version',
      "strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)",
      'Conquest reward pool pin is immutable'
    ]) {
      if (!evidence.settlementPinning.includes(token)) {
        errors.push(`Conquest settlement pinning is missing: ${token}`)
      }
    }
  }
  if (evidence.api !== undefined) {
    for (const token of [
      'FROM conquest_approved_active_reward_pools',
      'FROM game_mode_status',
      "game_mode = 'CONQUEST_CONSTRUCTED' AND enabled = 1",
      'FROM conquest_verified_queue_pools verified',
      'verified.starts_at <= ? AND verified.ends_at >= ?',
      'reward_pool_version',
      'verified.pool_version'
    ]) {
      if (!evidence.api.includes(token)) {
        errors.push(`Conquest player API lost admission gate: ${token}`)
      }
    }
  }
  if (evidence.sourceRewardPool !== undefined) {
    for (const token of [
      '"start_at": db.Lte(now)',
      '"end_at":   db.Gte(now)'
    ]) {
      if (!evidence.sourceRewardPool.includes(token)) {
        errors.push(
          `source Conquest inclusive pool contract is missing: ${token}`
        )
      }
    }
  }
  if (evidence.boundaryMigration !== undefined) {
    for (const token of [
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
    ]) {
      if (!evidence.boundaryMigration.includes(token)) {
        errors.push(`Conquest inclusive end migration is missing: ${token}`)
      }
    }
  }
  if (evidence.playerConquest !== undefined) {
    for (const token of [
      'useGameModesStatus()',
      'gameModesStatus?.conquestConstructed === true',
      'ALLOW_TICKET_SALES && isConquestAvailable',
      'isConquestAvailable={isConquestAvailable}'
    ]) {
      if (!evidence.playerConquest.includes(token)) {
        errors.push(`Conquest player screen lost availability gate: ${token}`)
      }
    }
  }
  if (evidence.playerConquestButton !== undefined) {
    for (const token of [
      'isConquestAvailable: boolean',
      '!isConquestAvailable ||',
      '!isConquestAvailable || isConquestLocked'
    ]) {
      if (!evidence.playerConquestButton.includes(token)) {
        errors.push(`Conquest Start control lost availability gate: ${token}`)
      }
    }
  }
  if (evidence.gameModesQuery !== undefined) {
    for (const token of [
      'APIClient.opensky.getGameModesStatus()',
      'GAME_MODES_STATUS',
      'staleTime: 10000',
      'refetchInterval: 10000'
    ]) {
      if (!evidence.gameModesQuery.includes(token)) {
        errors.push(`player mode-status query is incomplete: ${token}`)
      }
    }
  }
  if (evidence.gateway !== undefined) {
    for (const token of [
      "case 'GMListConquestReadiness'",
      "case 'GMVerifyConquestReadiness'"
    ]) {
      if (!evidence.gateway.includes(token)) {
        errors.push(`Conquest readiness RPC surface is missing: ${token}`)
      }
    }
    for (const token of [
      "case 'GMListConquestV2RewardSchedules'",
      "case 'GMProposeConquestV2RewardSchedule'",
      "case 'GMActivateConquestV2RewardSchedule'",
      "case 'GMDisableConquestV2RewardSchedule'"
    ]) {
      if (!evidence.gateway.includes(token)) {
        errors.push(`Conquest V2 schedule RPC surface is missing: ${token}`)
      }
    }
  }
  if (evidence.readiness !== undefined) {
    if (
      !evidence.readiness.includes(
        'JOIN conquest_approved_active_reward_pools approved'
      )
    ) {
      errors.push('Conquest readiness lost approved-pool gate')
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const configPath = path.join(
    root,
    'match-service-cloudflare',
    'wrangler.jsonc'
  )
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const [
    matchService,
    migration,
    poolActivation,
    poolOperationsMigration,
    poolOperations,
    poolWindowSafety,
    readinessOperationsMigration,
    readinessOperations,
    v2ScheduleActivation,
    v2ScheduleOperationsMigration,
    v2ScheduleOperations,
    staff,
    cardLibrary,
    settlement,
    goldModerationMigration,
    goldDelivery,
    sourceDelayedMinting,
    settlementPinning,
    drainMigration,
    drainRepository,
    matchmaker,
    api,
    playerConquest,
    playerConquestButton,
    gameModesQuery,
    gateway,
    readiness,
    sourceRewardPool,
    boundaryMigration
  ] = await Promise.all([
    readFile(
      path.join(root, 'match-service-cloudflare', 'src', 'worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0086_conquest_receipt_backed_readiness.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0094_conquest_reward_pool_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0095_conquest_reward_pool_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'src',
        'conquest-reward-pool-operations.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0100_conquest_reward_pool_windows.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0099_conquest_readiness_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-readiness-operations.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0089_conquest_v2_reward_policy_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0097_conquest_v2_reward_schedule_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'src',
        'conquest-v2-reward-schedule-operations.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'staff.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'generated', 'card-library.json'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare',
        'src',
        'conquest-settlement.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0109_conquest_gold_moderation.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest-delivery.ts'), 'utf8'),
    Promise.all([
      readFile(path.join(root, 'api', 'lib', 'jobqueue', 'delayed_minting.go'), 'utf8'),
      readFile(path.join(root, 'api', 'rpc', 'cards.go'), 'utf8')
    ]).then(sources => sources.join('\n')),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0101_conquest_entry_reward_pool_pin.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0102_conquest_admitted_run_drain.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts', 'src', 'runtime.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(
      path.join(root, 'webapp', 'src', 'PlayPage', 'Conquest', 'Conquest.tsx'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp',
        'src',
        'PlayPage',
        'Conquest',
        'InactiveConquestButton',
        'InactiveConquestButton.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp',
        'src',
        'shared',
        'queries',
        'play',
        'useGameModesStatus.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-readiness.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'api', 'data', 'reward_pool_store.go'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0103_conquest_inclusive_pool_end.sql'
      ),
      'utf8'
    )
  ])
  const errors = conquestGateErrors(config, {
    matchService,
    migration,
    poolActivation,
    poolOperationsMigration,
    poolOperations,
    poolWindowSafety,
    readinessOperationsMigration,
    readinessOperations,
    v2ScheduleActivation,
    v2ScheduleOperationsMigration,
    v2ScheduleOperations,
    staff,
    cardLibrary,
    settlement,
    goldModerationMigration,
    goldDelivery,
    sourceDelayedMinting,
    settlementPinning,
    drainMigration,
    drainRepository,
    matchmaker,
    api,
    playerConquest,
    playerConquestButton,
    gameModesQuery,
    gateway,
    readiness,
    sourceRewardPool,
    boundaryMigration
  })
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Conquest gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Conquest deployment defaults remain disabled; pool, V2 schedule, settlement, and runtime admission are independently reviewed and receipt-gated\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
