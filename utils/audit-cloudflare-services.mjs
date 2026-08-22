import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// This inventory covers deployment artifacts, not every workspace package.
// Browser clients, build tools, local infrastructure, and production services
// are intentionally distinguished so a utility is never mistaken for an
// unported runtime (or vice versa).
export const EXPECTED_DOCKER_WORKLOADS = {
  api: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/index.ts',
    evidence: ['handleApiRequest', 'async scheduled']
  },
  chain: {
    disposition: 'superseded',
    evidenceFile: 'docs/OFFCHAIN_REWARD_POLICY.md',
    evidence: [
      'off-chain `player_items`',
      'No game flow asks a player to mint a reward',
      'Every preserved source behavior that required minting grants an equivalent',
      'Stripe or mobile-store receipts'
    ]
  },
  game: {
    disposition: 'ported',
    evidenceFile: 'utils/build-cloudflare.mjs',
    evidence: ["'game', 'dist'", "'webapp', 'dist'"]
  },
  'game-analytics': {
    disposition: 'ported-blocked',
    evidenceFile: 'docs/CLOUDFLARE_GAME_ANALYTICS.md',
    evidence: [
      'Cloudflare adapter',
      'R2 is enabled',
      'paused before bucket creation',
      'zero producers and zero consumers',
      'no analytics Worker exists yet'
    ]
  },
  matchmaker: {
    disposition: 'ported',
    evidenceFile: 'matchmaker-ts/src/worker.ts',
    evidence: ['cloud-weasel-matchmaker', 'MatchmakerPool']
  },
  server: {
    disposition: 'ported',
    evidenceFile: 'game-server-cloudflare/src/worker.ts',
    evidence: ['GameMatch', "'/health'"]
  },
  sheets: {
    disposition: 'tooling',
    evidenceFile: 'sheets/package.json',
    evidence: ['tauri dev', 'vite build']
  },
  webapp: {
    disposition: 'ported',
    evidenceFile: 'wrangler.jsonc',
    evidence: ['webapp/dist', 'single-page-application']
  }
}

export const EXPECTED_COMPOSE_SERVICES = {
  'cors-anywhere': 'local-infrastructure',
  dozzle: 'local-infrastructure',
  draft: 'stale',
  game: 'ported',
  'localhost-bridge': 'local-infrastructure',
  matchmaker: 'ported',
  'opensky-api': 'ported',
  'opensky-worker': 'ported',
  postgres: 'superseded',
  pgweb: 'local-infrastructure',
  redis: 'superseded',
  server: 'ported',
  traefik: 'superseded',
  webapp: 'ported'
}

export const EXPECTED_GO_ENTRYPOINTS = {
  'api/cmd/grant-cards/_main.go': 'operator-adapter',
  'api/cmd/opensky-api/main.go': 'ported',
  'api/cmd/opensky-gm-cli/main.go': 'operator-tooling',
  'api/cmd/opensky-worker/main.go': 'ported',
  'api/cmd/util-goose/main.go': 'superseded',
  'api/cmd/util-jwt/main.go': 'superseded',
  'api/cmd/util-stress-api/main.go': 'test-tooling',
  'matchmaker/cmd/matchmaker/main.go': 'ported'
}

const dockerDirectories = async root => {
  const entries = await readdir(root, { withFileTypes: true })
  const directories = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    try {
      await readFile(path.join(root, entry.name, 'Dockerfile'), 'utf8')
      directories.push(entry.name)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return directories.sort()
}

export const extractComposeServices = source => {
  const services = []
  let inServices = false
  for (const line of source.split(/\r?\n/)) {
    if (/^services:\s*$/.test(line)) {
      inServices = true
      continue
    }
    if (inServices && /^\S/.test(line) && line.trim()) break
    const match = inServices ? line.match(/^  ([a-zA-Z0-9_-]+):\s*$/) : null
    if (match) services.push(match[1])
  }
  return [...new Set(services)].sort()
}

export const extractGoEntrypoints = sources =>
  Object.entries(sources)
    .filter(([, source]) => /^func main\s*\(/m.test(source))
    .map(([file]) => file)
    .sort()

export const auditServices = ({
  dockerWorkloads,
  composeServices,
  goEntrypoints,
  evidenceSources,
  analyticsPackageSource,
  productionRunnerSource
}) => {
  const errors = []
  const compare = (actual, expected, label) => {
    for (const item of actual) {
      if (!(item in expected)) errors.push(`unreviewed ${label}: ${item}`)
    }
    for (const item of Object.keys(expected)) {
      if (!actual.includes(item)) errors.push(`reviewed ${label} disappeared: ${item}`)
    }
  }

  compare(dockerWorkloads, EXPECTED_DOCKER_WORKLOADS, 'Docker workload')
  compare(composeServices, EXPECTED_COMPOSE_SERVICES, 'compose service')
  compare(goEntrypoints, EXPECTED_GO_ENTRYPOINTS, 'Go entrypoint')

  for (const [entrypoint, disposition] of Object.entries(
    EXPECTED_GO_ENTRYPOINTS
  )) {
    if (disposition === 'retired') {
      errors.push(
        `${entrypoint} is an executable source entrypoint and cannot use an unexplained retirement disposition`
      )
    }
  }

  for (const [workload, review] of Object.entries(EXPECTED_DOCKER_WORKLOADS)) {
    if (review.disposition === 'retired') {
      errors.push(
        `${workload} is a reviewed source workload and cannot use a blanket retirement disposition`
      )
    }
    const evidence = evidenceSources[workload] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(
          `${workload} is missing ${review.disposition} evidence: ${token}`
        )
      }
    }
  }

  if (
    !analyticsPackageSource.includes(
      'node ../utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc'
    )
  ) {
    errors.push('game-analytics deploy does not use the reviewed target runner')
  }
  for (const token of [
    "commandArguments[0] !== 'deploy'",
    'const plan = productionOperationPlan(operation, targetPath)',
    'const check = spawnSync(',
    'productionSchemaRow(check.stdout)',
    "['--dir', 'cloudflare', 'exec', 'wrangler', ...operationStep.args]",
    'CLOUDFLARE_ACCOUNT_ID: config.account_id'
  ]) {
    if (!productionRunnerSource.includes(token)) {
      errors.push(`production target runner is missing: ${token}`)
    }
  }

  const byDisposition = {}
  for (const [workload, review] of Object.entries(EXPECTED_DOCKER_WORKLOADS)) {
    ;(byDisposition[review.disposition] ??= []).push(workload)
  }

  return {
    dockerWorkloads,
    composeServices,
    goEntrypoints,
    byDisposition,
    errors
  }
}

const walkGo = async (root, relative = '') => {
  const sources = {}
  for (const entry of await readdir(path.join(root, relative), {
    withFileTypes: true
  })) {
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'temp', 'vendor'].includes(entry.name)) continue
      Object.assign(sources, await walkGo(root, child))
    } else if (entry.name.endsWith('.go')) {
      sources[child] = await readFile(path.join(root, child), 'utf8')
    }
  }
  return sources
}

export const loadServiceAudit = async root => {
  const evidenceSources = {}
  for (const [workload, review] of Object.entries(EXPECTED_DOCKER_WORKLOADS)) {
    evidenceSources[workload] = await readFile(
      path.join(root, review.evidenceFile),
      'utf8'
    )
  }
  return auditServices({
    dockerWorkloads: await dockerDirectories(root),
    composeServices: extractComposeServices(
      await readFile(path.join(root, 'docker-compose.yml'), 'utf8')
    ),
    goEntrypoints: extractGoEntrypoints(await walkGo(root)),
    evidenceSources,
    analyticsPackageSource: await readFile(
      path.join(root, 'game-analytics/package.json'),
      'utf8'
    ),
    productionRunnerSource: await readFile(
      path.join(root, 'utils/run-cloudflare-production.mjs'),
      'utf8'
    )
  })
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const audit = await loadServiceAudit(root)
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`)
  } else {
    process.stdout.write(`Source Docker workloads: ${audit.dockerWorkloads.length}\n`)
    process.stdout.write(`Source compose services: ${audit.composeServices.length}\n`)
    process.stdout.write(`Source Go entrypoints: ${audit.goEntrypoints.length}\n`)
    for (const [disposition, workloads] of Object.entries(audit.byDisposition)) {
      process.stdout.write(`${disposition}: ${workloads.length} (${workloads.join(', ')})\n`)
    }
  }
  for (const error of audit.errors) process.stderr.write(`Service audit: ${error}\n`)
  if (audit.errors.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
