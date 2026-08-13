import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONQUEST_MODES = new Set([
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY'
])

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
  const [matchService, migration] = await Promise.all([
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
    )
  ])
  const errors = conquestGateErrors(config, { matchService, migration })
  if (errors.length) {
    for (const error of errors) process.stderr.write(`Conquest gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Conquest deployment defaults remain disabled and runtime admission is receipt-gated\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
