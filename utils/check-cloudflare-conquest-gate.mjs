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
  if (!Array.isArray(cards)) return ['generated Conquest card catalog is missing']
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
  if (evidence.settlement !== undefined) {
    for (const token of [
      'FROM conquest_approved_active_reward_pools',
      'SELECT 1 FROM conquest_approved_active_reward_pools'
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
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
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
    cardLibrary,
    settlement,
    api,
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
      path.join(root, 'cloudflare', 'src', 'generated', 'card-library.json'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'conquest-settlement.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-readiness.ts'),
      'utf8'
    )
  ])
  const errors = conquestGateErrors(config, {
    matchService,
    migration,
    poolActivation,
    cardLibrary,
    settlement,
    api,
    readiness
  })
  if (errors.length) {
    for (const error of errors) process.stderr.write(`Conquest gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Conquest deployment defaults remain disabled; pool approval, settlement, and runtime admission are receipt-gated\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
