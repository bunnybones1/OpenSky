import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONQUEST_MODES = new Set([
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY'
])

export const conquestGateErrors = config => {
  const configured = String(config?.vars?.ENABLED_GAME_MODES ?? '')
    .split(',')
    .map(mode => mode.trim())
    .filter(Boolean)
  return configured
    .filter(mode => CONQUEST_MODES.has(mode))
    .map(
      mode =>
        `${mode} cannot be enabled before the Conquest settlement rollout gate is removed`
    )
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const configPath = path.join(
    root,
    'match-service-cloudflare',
    'wrangler.jsonc'
  )
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const errors = conquestGateErrors(config)
  if (errors.length) {
    for (const error of errors) process.stderr.write(`Conquest gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('Conquest production modes remain disabled\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
