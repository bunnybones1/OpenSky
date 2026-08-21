import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ciWorkflowAuditErrors = (workflow, nodeVersion) => {
  const errors = []
  const requiredTokens = [
    'pull_request:',
    'contents: read',
    'cancel-in-progress: true',
    'timeout-minutes: 30',
    'RELEASE_VERSION: cloudflare',
    'GITCOMMIT: cloudflare',
    'actions/checkout@v7.0.1',
    'persist-credentials: false',
    'pnpm/action-setup@v6.0.10',
    'actions/setup-node@v7.0.0',
    'node-version-file: .nvmrc',
    'pnpm install --frozen-lockfile',
    'pnpm build:cloudflare'
  ]
  for (const token of requiredTokens) {
    if (!workflow.includes(token)) {
      errors.push(`Cloudflare PR workflow is missing: ${token}`)
    }
  }
  for (const forbidden of [
    'wrangler deploy',
    'deploy:cloudflare',
    'CLOUDFLARE_API_TOKEN',
    'secrets.'
  ]) {
    if (workflow.includes(forbidden)) {
      errors.push(`Cloudflare PR workflow must not contain: ${forbidden}`)
    }
  }

  const major = Number.parseInt(nodeVersion.trim().split('.')[0] ?? '', 10)
  if (!Number.isInteger(major) || major < 22) {
    errors.push('Cloudflare CI Node version must satisfy Wrangler >=22')
  }
  return errors
}

export const cloudflareBuildScriptErrors = rootPackage => {
  const build = rootPackage?.scripts?.['build:cloudflare'] ?? ''
  const errors = []
  if (!build.includes('pnpm check:cloudflare:match-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go match wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:match-completion')) {
    errors.push(
      'Cloudflare build must include the transactional match completion gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:matchmaker-ingress')) {
    errors.push(
      'Cloudflare build must include the matchmaker ingress source gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:matchmaker-session')) {
    errors.push(
      'Cloudflare build must include the matchmaker session source gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:matchmaker-relaxation')) {
    errors.push(
      'Cloudflare build must include the matchmaker relaxation source gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:matchmaker-conquest')) {
    errors.push(
      'Cloudflare build must include the matchmaker Conquest source gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:bot-difficulty')) {
    errors.push('Cloudflare build must include the source bot-difficulty gate')
  }
  if (!build.includes('pnpm check:cloudflare:match-reward-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go match reward wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:conquest-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go Conquest wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:account-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go Account wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:account-stat-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go AccountStat wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:deck-wire')) {
    errors.push('Cloudflare build must include the generated Go Deck wire gate')
  }
  if (!build.includes('pnpm check:cloudflare:card-wire')) {
    errors.push('Cloudflare build must include the generated Go Card wire gate')
  }
  if (!build.includes('pnpm check:cloudflare:card-balance-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go CardWithBalance wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:card-ownership-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go CardOwnershipResponse wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:pending-card-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go PendingCardsResponse wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:feed-event-wire')) {
    errors.push(
      'Cloudflare build must include the generated Go FeedEvent wire gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:item-wire')) {
    errors.push('Cloudflare build must include the generated Go Item wire gate')
  }
  if (!build.includes('pnpm check:cloudflare:browser-cache')) {
    errors.push(
      'Cloudflare build must include the browser cache lifecycle gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:system-player-gate')) {
    errors.push(
      'Cloudflare build must include the operational system-player isolation gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:reward-timing')) {
    errors.push(
      'Cloudflare build must include the reward timing visibility gate'
    )
  }
  if (!build.includes('pnpm check:cloudflare:branding')) {
    errors.push('Cloudflare build must include the original-game branding gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [workflow, nodeVersion, rootPackage] = await Promise.all([
    readFile(
      path.join(root, '.github/workflows/cloudflare-release.yml'),
      'utf8'
    ),
    readFile(path.join(root, '.nvmrc'), 'utf8'),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = [
    ...ciWorkflowAuditErrors(workflow, nodeVersion),
    ...cloudflareBuildScriptErrors(rootPackage)
  ]
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare pull-request release contract is fail-closed and non-deploying'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
