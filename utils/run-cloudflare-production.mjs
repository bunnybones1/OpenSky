import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REVIEWED_CLOUDFLARE_ACCOUNT_ID =
  '528badc1c29c30196335df252a73c5a6'
export const REVIEWED_AUTH_DB_ID = '2ac6fbbd-359b-407c-9d87-bd62b17a7548'

export const REVIEWED_PRODUCTION_TARGETS = new Map([
  [
    'wrangler.jsonc',
    { name: 'opensky-webapp', requiresAuthDatabase: true }
  ],
  [
    'game-server-cloudflare/wrangler.jsonc',
    { name: 'cloud-weasel-game-server', requiresAuthDatabase: true }
  ],
  [
    'match-service-cloudflare/wrangler.jsonc',
    { name: 'cloud-weasel-match-service', requiresAuthDatabase: true }
  ],
  [
    'matchmaker-ts/wrangler.jsonc',
    { name: 'cloud-weasel-matchmaker', requiresAuthDatabase: false }
  ],
  [
    'game-analytics/wrangler.jsonc',
    { name: 'cloud-weasel-game-analytics', requiresAuthDatabase: true }
  ]
])

const normalizedTargetPath = value => value.replaceAll('\\', '/').replace(/^\.\//, '')

const authDatabase = config =>
  config?.d1_databases?.filter(database => database.binding === 'AUTH_DB') ?? []

export const productionTargetErrors = (
  targetPath,
  config,
  environment = {}
) => {
  const normalized = normalizedTargetPath(targetPath)
  const reviewed = REVIEWED_PRODUCTION_TARGETS.get(normalized)
  if (!reviewed) return [`unreviewed Cloudflare production config: ${normalized}`]

  const errors = []
  if (config?.name !== reviewed.name) {
    errors.push(
      `${normalized} Worker name must remain ${reviewed.name}`
    )
  }
  if (config?.account_id !== REVIEWED_CLOUDFLARE_ACCOUNT_ID) {
    errors.push(
      `${normalized} account_id must remain the reviewed Cloud Weasel account`
    )
  }
  if (
    environment.CLOUDFLARE_ACCOUNT_ID &&
    environment.CLOUDFLARE_ACCOUNT_ID !== config?.account_id
  ) {
    errors.push(
      `${normalized} account_id conflicts with CLOUDFLARE_ACCOUNT_ID`
    )
  }

  const databases = authDatabase(config)
  if (reviewed.requiresAuthDatabase) {
    if (databases.length !== 1) {
      errors.push(`${normalized} must bind exactly one AUTH_DB`)
    } else {
      const [database] = databases
      if (database.database_name !== 'opensky-auth') {
        errors.push(`${normalized} AUTH_DB name must remain opensky-auth`)
      }
      if (database.database_id !== REVIEWED_AUTH_DB_ID) {
        errors.push(
          `${normalized} AUTH_DB id must remain the reviewed production database`
        )
      }
    }
  } else if (databases.length) {
    errors.push(`${normalized} has an unreviewed AUTH_DB binding`)
  }
  return errors
}

export const productionInvocation = (operation, targetPath, config) => {
  const normalized = normalizedTargetPath(targetPath)
  const configFromRunner = path.posix.join('..', normalized)
  if (operation === 'deploy') {
    return ['deploy', '--config', configFromRunner]
  }
  if (operation === 'migrate') {
    const databases = authDatabase(config)
    if (databases.length !== 1) {
      throw new Error(`${normalized} has no unambiguous AUTH_DB migration target`)
    }
    return [
      'd1',
      'migrations',
      'apply',
      databases[0].database_name,
      '--remote',
      '--config',
      configFromRunner
    ]
  }
  throw new Error(`unsupported Cloudflare production operation: ${operation}`)
}

export const productionScriptErrors = (rootPackage, analyticsPackage) => {
  const scripts = rootPackage?.scripts ?? {}
  const expected = {
    'deploy:cloudflare':
      'node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc',
    'deploy:cloudflare:game-server':
      'node ./utils/run-cloudflare-production.mjs deploy game-server-cloudflare/wrangler.jsonc',
    'deploy:cloudflare:match-service':
      'node ./utils/run-cloudflare-production.mjs deploy match-service-cloudflare/wrangler.jsonc',
    'deploy:cloudflare:matchmaker':
      'node ./utils/run-cloudflare-production.mjs deploy matchmaker-ts/wrangler.jsonc',
    'deploy:cloudflare:analytics':
      'node ./utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc',
    'db:migrate:cloudflare:remote':
      'node ./utils/run-cloudflare-production.mjs migrate wrangler.jsonc'
  }
  const errors = []
  const hasDirectWranglerCommand = script =>
    /\bwrangler\s/.test(script ?? '')
  for (const [name, token] of Object.entries(expected)) {
    const script = scripts[name]
    if (!script?.includes(token)) {
      errors.push(`${name} bypasses the reviewed Cloudflare production target`)
    }
    if (hasDirectWranglerCommand(script)) {
      errors.push(`${name} contains a direct Wrangler production command`)
    }
  }
  const analyticsScript = analyticsPackage?.scripts?.['deploy:cloudflare']
  if (
    !analyticsScript?.includes(
      'node ../utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc'
    )
  ) {
    errors.push(
      'game-analytics deploy:cloudflare bypasses the reviewed production target'
    )
  }
  if (hasDirectWranglerCommand(analyticsScript)) {
    errors.push(
      'game-analytics deploy:cloudflare contains a direct Wrangler production command'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const commandArguments = process.argv.slice(2)
  if (commandArguments.length !== 2) {
    throw new Error(
      'usage: run-cloudflare-production.mjs <deploy|migrate> <reviewed config>'
    )
  }
  const [operation, requestedTarget] = commandArguments
  const targetPath = normalizedTargetPath(requestedTarget)
  const absoluteTarget = path.resolve(root, targetPath)
  if (!absoluteTarget.startsWith(`${root}${path.sep}`)) {
    throw new Error('Cloudflare production config must be inside the repository')
  }
  const config = JSON.parse(await readFile(absoluteTarget, 'utf8'))
  const errors = productionTargetErrors(targetPath, config, process.env)
  if (errors.length) throw new Error(errors.join('\n'))

  const args = productionInvocation(operation, targetPath, config)
  process.stdout.write(
    `Cloudflare production target: ${config.name} in reviewed account ${config.account_id}\n`
  )
  const child = spawn(
    'pnpm',
    ['--dir', 'cloudflare', 'exec', 'wrangler', ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: config.account_id
      },
      stdio: 'inherit'
    }
  )
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  process.exitCode = exitCode
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
