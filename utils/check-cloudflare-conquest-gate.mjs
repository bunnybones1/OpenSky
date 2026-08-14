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
      'modes.delete(mode as GameMode)'
    ]) {
      if (!evidence.matchService.includes(token)) {
        errors.push(`match service lost dynamic Conquest clamp: ${token}`)
      }
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
      'FROM conquest_approved_active_reward_pools',
      'SELECT 1 FROM conquest_approved_active_reward_pools',
      'ORDER BY starts_at DESC, version DESC'
    ]) {
      if (!evidence.settlement.includes(token)) {
        errors.push(`Conquest settlement lost approved-pool gate: ${token}`)
      }
    }
  }
  if (evidence.api !== undefined) {
    if (!evidence.api.includes('FROM conquest_approved_active_reward_pools')) {
      errors.push('Conquest rewards API lost approved-pool gate')
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
    api,
    gateway,
    readiness
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
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-readiness.ts'),
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
    api,
    gateway,
    readiness
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
