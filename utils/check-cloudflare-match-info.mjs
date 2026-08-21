import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const bodyBetween = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const requireOrdered = (errors, label, source, tokens) => {
  let prior = -1
  for (const token of tokens) {
    const index = source.indexOf(token, prior + 1)
    if (index < 0) {
      errors.push(
        source.includes(token)
          ? `${label} order changed at: ${token}`
          : `${label} is missing: ${token}`
      )
      continue
    }
    prior = index
  }
}

export const matchInfoErrors = ({
  sourceRegistry,
  sourceBrowserWorker,
  workerGateway,
  workerRuntimeTest,
  rootPackage
}) => {
  const errors = []

  const sourcePendingRegistration = bodyBetween(
    sourceRegistry,
    '  registerMatch(\n    matchID:',
    '\n  async getMatchInProgress'
  )
  requireOrdered(
    errors,
    'Source pending-match registration',
    sourcePendingRegistration,
    [
      'const playerIDs = players.map(',
      'const info: MatchInfo = {',
      'initialized: false',
      'playerIDs.forEach(p => {',
      'matchInProgressKey(p)',
      'JSON.stringify(info)'
    ]
  )

  const sourceReadyRegistration = bodyBetween(
    sourceRegistry,
    '  registerMatch(\n    p1address:',
    '\n  markMatchPendingRewards'
  )
  requireOrdered(
    errors,
    'Source ready-match registration',
    sourceReadyRegistration,
    [
      'const healthCheck = () => {',
      'const info: MatchInfo = {',
      'initialized: true',
      'healthCheck()',
      'global.setInterval('
    ]
  )

  const sourceConnect = bodyBetween(
    sourceBrowserWorker,
    '  const connectMatch = () =>',
    '\n  connectMatch()'
  )
  requireOrdered(
    errors,
    'Source initializing-match client retry',
    sourceConnect,
    [
      "case 'in_progress_match_info':",
      'if (!info.matchInfo.initialized) {',
      'setTimeout(() => {',
      'connectMatch()',
      '}, 3000)',
      'break',
      'ws.connectGameServer('
    ]
  )

  const workerCurrentMatch = bodyBetween(
    workerGateway,
    'const currentMatchFor = (',
    'const recentMatchFor = ('
  )
  requireOrdered(
    errors,
    'Worker active-or-creating match lookup',
    workerCurrentMatch,
    [
      'server_address, status,',
      "WHERE (status = 'creating'",
      "OR (status = 'active' AND server_address IS NOT NULL))",
      '(player1_principal = ? OR player2_principal = ?)',
      'ORDER BY id DESC'
    ]
  )

  const workerProjection = bodyBetween(
    workerGateway,
    'const matchInfo = async (',
    'const anonymousSpectator = () =>'
  )
  requireOrdered(
    errors,
    'Worker initializing-match projection',
    workerProjection,
    [
      'const row = await currentMatchFor(env, principal)',
      "const initialized = row.status === 'active'",
      'if (initialized) {',
      'JSON.parse(row.match_payload_json)',
      'let serverAddress = row.server_address',
      'if (!serverAddress) {',
      '`/api/game/matches/${encodeURIComponent(row.proposal_id)}`',
      "pendingAddress.protocol === 'https:' ? 'wss:' : 'ws:'",
      'serverAddress = pendingAddress.href',
      'initialized\n        },'
    ]
  )

  requireOrdered(
    errors,
    'Worker initializing-match runtime regression',
    workerRuntimeTest,
    [
      "it('preserves source initializing match info for the client retry loop'",
      "NULL, 'creating'",
      'initialized: false',
      "ws: 'wss://opensky.example/api/game/matches/initializing-proposal'",
      "http: 'https://opensky.example/api/game/matches/initializing-proposal'"
    ]
  )

  const scripts = rootPackage?.scripts ?? {}
  if (
    !String(scripts['build:cloudflare'] ?? '').includes(
      'pnpm check:cloudflare:match-info'
    )
  ) {
    errors.push('Complete Cloudflare build omits the match-info source gate')
  }
  if (
    !String(scripts['deploy:cloudflare'] ?? '').includes(
      'pnpm build:cloudflare'
    )
  ) {
    errors.push('Main Worker deployment bypasses the complete match-info gate')
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    sourceRegistry,
    sourceBrowserWorker,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile(path.join(root, 'server/src/services/RegistryService.ts'), 'utf8'),
    readFile(
      path.join(root, 'game/src/state/worker/multiplayerWorkerState.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/multiplayer-gateway.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/test/multiplayer-gateway.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = matchInfoErrors({
    sourceRegistry,
    sourceBrowserWorker,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  })
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare match info preserves the source initializing-to-ready client retry lifecycle'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
