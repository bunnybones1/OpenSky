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
  sourceMatchTracker,
  sourceMessages,
  sourceGameServerInfo,
  sourceProto,
  sourceBrowserWorker,
  sourceInProgressHook,
  sharedGameMessages,
  sharedMatchmakerMessages,
  gameWorker,
  gameRuntimeTest,
  workerGateway,
  workerRuntimeTest,
  rootPackage
}) => {
  const errors = []

  const sourceMatchInfoWire = bodyBetween(
    sourceMessages,
    'type MatchInfo struct {',
    '\n}'
  )
  const sourceMatchInfoFields = [
    ...sourceMatchInfoWire.matchAll(/`json:"([^",]+)(?:,[^"]*)?"`/g)
  ].map(match => match[1])
  const expectedMatchInfoFields = [
    'id',
    'mode',
    'playerIDs',
    'serverLocationKey',
    'version',
    'initialized'
  ]
  if (
    JSON.stringify(sourceMatchInfoFields) !==
    JSON.stringify(expectedMatchInfoFields)
  ) {
    errors.push(
      'Source public MatchInfo JSON fields changed; registry-only fields must not leak'
    )
  }

  const sourceRecentInfoWire = bodyBetween(
    sourceMessages,
    'type RecentMatchInfo struct {',
    '\n}'
  )
  const sourceRecentInfoFields = [
    ...sourceRecentInfoWire.matchAll(/`json:"([^",]+)(,omitempty)?"`/g)
  ].map(match => [match[1], Boolean(match[2])])
  const expectedRecentInfoFields = [
    ['playerID', false],
    ['gameMode', false],
    ['matchID', false],
    ['replayID', false],
    ['accounts', false],
    ['conquestInfo', false],
    ['store', false],
    ['rewards', false]
  ]
  if (
    JSON.stringify(sourceRecentInfoFields) !==
    JSON.stringify(expectedRecentInfoFields)
  ) {
    errors.push('Source public RecentMatchInfo JSON contract changed')
  }
  if (
    !sourceRecentInfoWire.includes(
      'ConquestInfo [2]proto.Conquest          `json:"conquestInfo"`'
    )
  ) {
    errors.push('Source public conquestInfo is no longer a required pair')
  }

  const sourceConquestWire = bodyBetween(
    sourceProto,
    'type Conquest struct {',
    '\n}'
  )
  const sourceConquestFields = [
    ...sourceConquestWire.matchAll(/`json:"([^",]+)(?:,[^"]*)?"/g)
  ]
    .map(match => match[1])
    .filter(field => field !== '-')
  if (
    JSON.stringify(sourceConquestFields) !==
    JSON.stringify([
      'id',
      'status',
      'nonce',
      'mode',
      'hero',
      'deckClass',
      'matchProgress',
      'createdAt',
      'endedAt'
    ])
  ) {
    errors.push('Source public Conquest JSON fields changed')
  }
  for (const enumType of ['ConquestStatus', 'GameMode', 'Hero']) {
    const enumWire = bodyBetween(
      sourceProto,
      `var ${enumType}_name = map[`,
      '\n}'
    )
    if (!/0:\s+"UNKNOWN"/.test(enumWire)) {
      errors.push(`Source ${enumType} zero enum is no longer UNKNOWN`)
    }
  }

  const sharedPublicMatchInfo = bodyBetween(
    sharedMatchmakerMessages,
    'export interface MatchInfo {',
    '\n}'
  )
  requireOrdered(
    errors,
    'Shared public MatchInfo type',
    sharedPublicMatchInfo,
    [
      'id: number',
      'mode: GameMode',
      'playerIDs: string[]',
      'serverLocationKey: string',
      'version: string',
      'initialized: boolean'
    ]
  )
  if (
    sharedPublicMatchInfo.includes('replayID:') ||
    sharedPublicMatchInfo.includes('serverLocationKey?:')
  ) {
    errors.push('Shared public MatchInfo type retains registry-only fields')
  }
  requireOrdered(
    errors,
    'Shared registry MatchInfo type',
    sharedMatchmakerMessages,
    [
      'export interface RegistryMatchInfo extends MatchInfo {',
      'replayID: string'
    ]
  )

  const sharedServerInfo = bodyBetween(
    sharedGameMessages,
    'export interface ServerInfo {',
    '\n}'
  )
  for (const field of [
    'hostname?: string',
    'internalHostname?: string',
    'port?: number',
    'ws?: string',
    'http?: string',
    'internalHttp?: string',
    'releaseVersion?: string',
    'error?: string'
  ]) {
    if (!sharedServerInfo.includes(field)) {
      errors.push(`Shared ServerInfo loses source optionality: ${field}`)
    }
  }
  requireOrdered(
    errors,
    'Shared stored/public recent-match types',
    sharedGameMessages,
    [
      'export interface StoredRecentMatchInfo {',
      'conquestInfo?: [Conquest, Conquest]',
      'export interface RecentMatchInfo extends Omit<',
      'StoredRecentMatchInfo,',
      "'conquestInfo'",
      'conquestInfo: [Conquest, Conquest]'
    ]
  )

  const sourcePendingRegistration = bodyBetween(
    sourceRegistry,
    '  registerMatch(\n    matchID:',
    '\n  async getMatchInProgress'
  )

  const sourceServerInfoWire = bodyBetween(
    sourceGameServerInfo,
    'type GameServerInfo struct {',
    '\n}'
  )
  const sourceServerInfoFields = [
    ...sourceServerInfoWire.matchAll(/`json:"([^",]+)(,omitempty)?"`/g)
  ].map(match => [match[1], Boolean(match[2])])
  const expectedServerInfoFields = [
    ['name', false],
    ['status', false],
    ['load', false],
    ['hostname', true],
    ['internalHostname', true],
    ['port', true],
    ['ws', true],
    ['http', true],
    ['internalHttp', true],
    ['releaseVersion', true],
    ['error', true]
  ]
  if (
    JSON.stringify(sourceServerInfoFields) !==
    JSON.stringify(expectedServerInfoFields)
  ) {
    errors.push(
      'Source public GameServerInfo JSON or omitempty contract changed'
    )
  }
  requireOrdered(
    errors,
    'Source pending-match registration',
    sourcePendingRegistration,
    [
      'const playerIDs = players.map(',
      'const info: RegistryMatchInfo = {',
      'initialized: false',
      'playerIDs.forEach(p => {',
      'matchInProgressKey(p)',
      'JSON.stringify(info)'
    ]
  )

  const sourceDisconnectTimeout = bodyBetween(
    sourceMatchTracker,
    'func (c *MatchInProgressTracker) GetMatch',
    '\nfunc (c *MatchInProgressTracker) getMatchInfo'
  )
  requireOrdered(
    errors,
    'Source match-info disconnect timeout',
    sourceDisconnectTimeout,
    [
      'loadingAssetsTimeout, err := c.keyValStore.TTL',
      'abandonTimeout, err := c.keyValStore.TTL',
      'disconnectTimeout := abandonTimeout',
      'if abandonTimeout > 0 && loadingAssetsTimeout > 0 {',
      'math.Min(',
      'if disconnectTimeout == 0 {',
      'disconnectTimeout = loadingAssetsTimeout',
      'InProgressMatchInfoMessage(*matchInfo, *gameServerInfo, disconnectTimeout)'
    ]
  )

  requireOrdered(
    errors,
    'Source webapp disconnect-timeout consumer',
    sourceInProgressHook,
    [
      'inProgressMatchInfo.disconnectTimeout * 1000',
      '(inProgressMatchInfo.disconnectTimeout - 1) * 1000'
    ]
  )

  const gameStatus = bodyBetween(
    gameWorker,
    '  private async status(',
    '\n  private async recentMatchInfo'
  )
  requireOrdered(errors, 'Game Worker internal timeout state', gameWorker, [
    "if (url.pathname === '/internal/status')",
    'return await this.status(request)'
  ])
  requireOrdered(errors, 'Game Worker internal status projection', gameStatus, [
    'if (!this.isInternal(request))',
    'const [players, timers] = await Promise.all(',
    "searchParams.get('scope') === 'match-info'",
    'proposalId: metadata.proposalId',
    'players,',
    'timers',
    'const runtime = await this.ensureRuntime()'
  ])
  requireOrdered(
    errors,
    'Game Worker scoped status runtime regression',
    gameRuntimeTest,
    [
      "it('exposes only authenticated durable timeout state to match info'",
      "'https://match/internal/status?scope=match-info'",
      'expect(anonymous.status).toBe(404)',
      'finishedLoadingAssets: false',
      "['ended', 'initialized', 'players', 'proposalId', 'timers'].sort()"
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
      'const info: RegistryMatchInfo = {',
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
  requireOrdered(
    errors,
    'Source recent-match conquest consumer',
    sourceConnect,
    ["case 'recent_match_info':", 'conquestInfo: info.conquestInfo']
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
      'const disconnectTimeout = await matchDisconnectTimeout(env, row, principal)',
      'serverLocationKey: `match:${row.proposal_id}`',
      'initialized\n        },'
    ]
  )
  if (workerProjection.includes('replayID:')) {
    errors.push('Worker in-progress MatchInfo leaks registry-only replayID')
  }
  for (const field of ['internalHostname:', 'internalHttp:']) {
    if (workerProjection.includes(field)) {
      errors.push(`Worker serializes empty optional server field: ${field}`)
    }
  }

  const workerRecentProjection = bodyBetween(
    workerGateway,
    'const validRecentMatchInfo = (',
    '\nconst matchInfo = async ('
  )
  requireOrdered(
    errors,
    'Worker public recent-match conquest projection',
    workerRecentProjection,
    [
      'const conquestInfo = info.conquestInfo',
      'conquestInfo.length === 2',
      'conquestInfo.every(validStoredConquest)',
      "info.gameMode === 'CONQUEST_CONSTRUCTED'",
      "info.gameMode === 'CONQUEST_DISCOVERY'",
      '(!conquestMode || conquestInfo !== undefined)',
      'const validStoredConquest = (value: unknown) =>',
      'optionalSourceUint(value.id)',
      'optionalSourceString(value.status)',
      'optionalSourceNullableString(value.deckClass)',
      'record(value.matchProgress)',
      'const sourceConquest = (value: unknown) => {',
      'id: conquest.id ?? 0',
      "status: conquest.status ?? 'UNKNOWN'",
      'nonce: conquest.nonce ?? 0',
      "mode: conquest.mode ?? 'UNKNOWN'",
      "hero: conquest.hero ?? 'UNKNOWN'",
      'deckClass: conquest.deckClass ?? null',
      'matchProgress: conquest.matchProgress ?? null',
      'createdAt: conquest.createdAt ?? null',
      'endedAt: conquest.endedAt ?? null',
      'const publicRecentMatchInfo = (info: Record<string, unknown>) => {',
      ': [undefined, undefined]',
      'conquestInfo: conquestInfo.map(sourceConquest)',
      'return json(publicRecentMatchInfo(info), 200)'
    ]
  )

  const workerDisconnectTimeout = bodyBetween(
    workerGateway,
    'const remainingMatchTimeoutSeconds = (',
    '\nconst json = ('
  )
  requireOrdered(
    errors,
    'Worker source disconnect-timeout projection',
    workerDisconnectTimeout,
    [
      'status.proposalId !== proposalId',
      'status.ended === true',
      'player.finishedLoadingAssets === false',
      'Number.isSafeInteger(loadExpiryAtMs)',
      'deadlines.push(loadExpiryAtMs)',
      'const abandonAtMs = player.abandonAtMs',
      'Number.isSafeInteger(abandonAtMs)',
      'deadlines.push(abandonAtMs)',
      'Math.min(...deadlines)',
      "new Request('https://game-match/internal/status?scope=match-info'",
      '[INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET',
      'return 0'
    ]
  )
  const readyRuntimeTest = bodyBetween(
    workerRuntimeTest,
    "it('restores the source match-info contract for the requested player'",
    "it('preserves source initializing match info for the client retry loop'"
  )
  const pendingRuntimeTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves source initializing match info for the client retry loop'",
    "it('uses the source minimum remaining loading and disconnect TTL'"
  )
  const recentRuntimeTest = bodyBetween(
    workerRuntimeTest,
    "it('returns a participant recent match for 24 hours without leaking it to spectators'",
    "it('suppresses no-load results and stale results after a newer match attempt'"
  )
  requireOrdered(
    errors,
    'Worker public recent-match runtime regression',
    recentRuntimeTest,
    [
      'const stored = {',
      'const emptyConquest = {',
      "status: 'UNKNOWN'",
      "mode: 'UNKNOWN'",
      "hero: 'UNKNOWN'",
      'conquestInfo: [emptyConquest, emptyConquest]',
      'return Response.json(stored)',
      'expect(await response.json()).toEqual(expected)',
      'const conquestInfo = [',
      'gameMode: GameMode.CONQUEST_CONSTRUCTED',
      'expect(await conquestResponse.json()).toMatchObject({',
      'conquestInfo',
      'expect(invalidConquestResponse.status).toBe(500)',
      "message: 'Recent match is unavailable.'"
    ]
  )
  for (const [label, runtimeTest] of [
    ['ready', readyRuntimeTest],
    ['initializing', pendingRuntimeTest]
  ]) {
    if (!runtimeTest.includes('expect(await response.json()).toEqual({')) {
      errors.push(`Worker ${label} match-info regression is not exact`)
    }
    if (
      runtimeTest.includes('internalHostname:') ||
      runtimeTest.includes('internalHttp:')
    ) {
      errors.push(`Worker ${label} regression expects empty optional internals`)
    }
  }

  requireOrdered(
    errors,
    'Worker initializing-match runtime regression',
    workerRuntimeTest,
    [
      "it('preserves source initializing match info for the client retry loop'",
      "NULL, 'creating'",
      "serverLocationKey: 'match:initializing-proposal'",
      'initialized: false',
      "ws: 'wss://opensky.example/api/game/matches/initializing-proposal'",
      "http: 'https://opensky.example/api/game/matches/initializing-proposal'"
    ]
  )
  requireOrdered(
    errors,
    'Worker disconnect-timeout runtime regression',
    workerRuntimeTest,
    [
      "it('uses the source minimum remaining loading and disconnect TTL'",
      "vi.spyOn(Date, 'now').mockReturnValue(deadlineBase)",
      'abandonAtMs: deadlineBase + 60_900',
      'loadExpiryAtMs: deadlineBase + 120_900',
      'expect(active.disconnectTimeout).toBe(60)',
      'const loadingOnly =',
      'expect(loadingOnly.disconnectTimeout).toBe(120)',
      'const abandonOnly =',
      'expect(abandonOnly.disconnectTimeout).toBe(30)',
      "proposalId: 'different-proposal'",
      'finishedLoadingAssets: true',
      'disconnectTimeout: 0'
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
    sourceMatchTracker,
    sourceMessages,
    sourceGameServerInfo,
    sourceProto,
    sourceBrowserWorker,
    sourceInProgressHook,
    sharedGameMessages,
    sharedMatchmakerMessages,
    gameWorker,
    gameRuntimeTest,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile(path.join(root, 'server/src/services/RegistryService.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'matchmaker/lib/matchtrackers/match_in_progress_tracker.go'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'matchmaker/lib/messages/messages.go'), 'utf8'),
    readFile(
      path.join(root, 'matchmaker/lib/gameservers/game_server_info.go'),
      'utf8'
    ),
    readFile(path.join(root, 'api/proto/api.gen.go'), 'utf8'),
    readFile(
      path.join(root, 'game/src/state/worker/multiplayerWorkerState.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AppLayout/Widgets/MatchMakerWidget/hooks/useHandleInProgressMatch.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'lib/shared/src/game-server-message-types.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'lib/shared/src/matchmaker-message-types.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/src/game-match.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare/test-cloudflare/game-match.test.ts'
      ),
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
    sourceMatchTracker,
    sourceMessages,
    sourceGameServerInfo,
    sourceProto,
    sourceBrowserWorker,
    sourceInProgressHook,
    sharedGameMessages,
    sharedMatchmakerMessages,
    gameWorker,
    gameRuntimeTest,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  })
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare match info preserves public match/server/recent wires, initialization retry, and per-player timeout lifecycles'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
