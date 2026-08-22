import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const workers = [
  'opensky-webapp',
  'cloud-weasel-matchmaker',
  'cloud-weasel-match-service',
  'cloud-weasel-game-server',
]

const gameServerWorker = 'cloud-weasel-game-server'
const internalSecretName = 'INTERNAL_AUTH_SECRET'
const ownerKeyName = 'MATCH_OWNER_PRIVATE_KEY'
const rotateInternalSecret = process.env.CLOUD_WEASEL_ROTATE_INTERNAL_AUTH_SECRET === '1'

const runWrangler = (args, input) => {
  const result = spawnSync(
    'corepack',
    ['pnpm', '--dir', 'cloudflare', 'exec', 'wrangler', ...args],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      input,
      maxBuffer: 10 * 1024 * 1024,
    }
  )

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'Wrangler failed').trim()
    throw new Error(detail)
  }

  return result.stdout
}

const listSecrets = (worker) => {
  const output = runWrangler(['secret', 'list', '--name', worker])
  const parsed = JSON.parse(output)
  return new Set(parsed.map(({ name }) => name))
}

const putSecret = (worker, name, value) => {
  runWrangler(['secret', 'put', name, '--name', worker], `${value}\n`)
  console.log(`Provisioned ${name} for ${worker}.`)
}

const createPrivateKey = () => {
  const secp256k1Order = BigInt(
    '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
  )

  for (;;) {
    const candidate = randomBytes(32)
    const scalar = BigInt(`0x${candidate.toString('hex')}`)
    if (scalar > 0n && scalar < secp256k1Order) {
      return `0x${candidate.toString('hex')}`
    }
  }
}

const secretsByWorker = new Map(workers.map((worker) => [worker, listSecrets(worker)]))
const workersWithInternalSecret = workers.filter((worker) =>
  secretsByWorker.get(worker).has(internalSecretName)
)

if (
  !rotateInternalSecret &&
  workersWithInternalSecret.length > 0 &&
  workersWithInternalSecret.length < workers.length
) {
  throw new Error(
    `${internalSecretName} is only present on ${workersWithInternalSecret.length}/${workers.length} Workers. ` +
      'Refusing to generate mismatched service credentials. Repair the missing bindings manually, or set ' +
      'CLOUD_WEASEL_ROTATE_INTERNAL_AUTH_SECRET=1 to rotate every Worker together.'
  )
}

if (rotateInternalSecret || workersWithInternalSecret.length === 0) {
  const internalSecret = randomBytes(32).toString('hex')
  for (const worker of workers) {
    putSecret(worker, internalSecretName, internalSecret)
  }
} else {
  console.log(`${internalSecretName} is already provisioned consistently by presence.`)
}

if (!secretsByWorker.get(gameServerWorker).has(ownerKeyName)) {
  putSecret(gameServerWorker, ownerKeyName, createPrivateKey())
} else {
  console.log(`${ownerKeyName} is already provisioned; preserving the stable match identity.`)
}

