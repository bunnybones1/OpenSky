import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchInfoErrors } from './check-cloudflare-match-info.mjs'

const fixtures = async () => {
  const [
    sourceRegistry,
    sourceMatchTracker,
    sourceMessages,
    sourceGameServerInfo,
    sourceProto,
    sourceServer,
    sourceMatchCollection,
    sourceMatch,
    sourceBrowserWorker,
    sourceInProgressHook,
    sharedGameMessages,
    sharedMatchmakerMessages,
    sharedMatchModes,
    gameWorker,
    gameRuntimeTest,
    gameModeTest,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile('server/src/services/RegistryService.ts', 'utf8'),
    readFile(
      'matchmaker/lib/matchtrackers/match_in_progress_tracker.go',
      'utf8'
    ),
    readFile('matchmaker/lib/messages/messages.go', 'utf8'),
    readFile('matchmaker/lib/gameservers/game_server_info.go', 'utf8'),
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('server/src/Server.ts', 'utf8'),
    readFile('server/src/worker/match/MatchCollection.ts', 'utf8'),
    readFile('server/src/worker/match/Match.ts', 'utf8'),
    readFile('game/src/state/worker/multiplayerWorkerState.ts', 'utf8'),
    readFile(
      'webapp/src/AppLayout/Widgets/MatchMakerWidget/hooks/useHandleInProgressMatch.tsx',
      'utf8'
    ),
    readFile('lib/shared/src/game-server-message-types.ts', 'utf8'),
    readFile('lib/shared/src/matchmaker-message-types.ts', 'utf8'),
    readFile('lib/shared/src/match-modes.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile(
      'game-server-cloudflare/test-cloudflare/game-match.test.ts',
      'utf8'
    ),
    readFile('game-server-cloudflare/test/match-modes.test.ts', 'utf8'),
    readFile('cloudflare/src/multiplayer-gateway.ts', 'utf8'),
    readFile('cloudflare/test/multiplayer-gateway.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceRegistry,
    sourceMatchTracker,
    sourceMessages,
    sourceGameServerInfo,
    sourceProto,
    sourceServer,
    sourceMatchCollection,
    sourceMatch,
    sourceBrowserWorker,
    sourceInProgressHook,
    sharedGameMessages,
    sharedMatchmakerMessages,
    sharedMatchModes,
    gameWorker,
    gameRuntimeTest,
    gameModeTest,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  }
}

const replaceAfter = (source, marker, search, replacement) => {
  const markerIndex = source.indexOf(marker)
  const searchIndex = source.indexOf(search, markerIndex)
  assert.ok(markerIndex >= 0 && searchIndex >= markerIndex)
  return `${source.slice(0, searchIndex)}${replacement}${source.slice(
    searchIndex + search.length
  )}`
}

test('pins source match/server/recent wires, initialization retry, and timeout lifecycles', async () => {
  assert.deepEqual(matchInfoErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, runtime-test, and build requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceMessages: value.sourceMessages.replace(
        'ServerLocationKey string         `json:"serverLocationKey"`',
        'ServerLocationKey string         `json:"replayID"`'
      )
    },
    {
      ...value,
      sourceGameServerInfo: value.sourceGameServerInfo.replace(
        'InternalHostname string         `json:"internalHostname,omitempty"`',
        'InternalHostname string         `json:"internalHostname"`'
      )
    },
    {
      ...value,
      sourceMessages: value.sourceMessages.replace(
        'ConquestInfo [2]proto.Conquest          `json:"conquestInfo"`',
        'ConquestInfo [2]proto.Conquest          `json:"conquestInfo,omitempty"`'
      )
    },
    {
      ...value,
      sourceProto: value.sourceProto.replace(
        'MatchProgress ConquestMatchResultMap `json:"matchProgress"',
        'MatchProgress ConquestMatchResultMap `json:"progress"'
      )
    },
    {
      ...value,
      sourceProto: replaceAfter(
        value.sourceProto,
        'var ConquestStatus_name = map[',
        '0: "UNKNOWN"',
        '0: "NONE"'
      )
    },
    {
      ...value,
      sourceServer: value.sourceServer.replace(
        'this.registry.registerMatch(matchID, replayID, player1.gameMode, [',
        'this.registry.registerMatch(matchID, replayID, player2.gameMode, ['
      )
    },
    {
      ...value,
      sourceMatch: replaceAfter(
        value.sourceMatch,
        '    this.gameMode =',
        ': GameMode.UNKNOWN',
        ': player1context.mode'
      )
    },
    {
      ...value,
      sharedMatchModes: replaceAfter(
        value.sharedMatchModes,
        'export const sourceGameServerMode = ([',
        'GameMode.UNKNOWN',
        'player2Mode'
      )
    },
    {
      ...value,
      sharedMatchmakerMessages: value.sharedMatchmakerMessages.replace(
        'serverLocationKey: string',
        'serverLocationKey?: string'
      )
    },
    {
      ...value,
      sharedGameMessages: value.sharedGameMessages.replace(
        'internalHttp?: string',
        'internalHttp: string'
      )
    },
    {
      ...value,
      sharedGameMessages: value.sharedGameMessages.replace(
        'conquestInfo: [Conquest, Conquest]',
        'conquestInfo?: [Conquest, Conquest]'
      )
    },
    {
      ...value,
      sourceRegistry: replaceAfter(
        value.sourceRegistry,
        '  registerMatch(\n    matchID:',
        'initialized: false',
        'initialized: true'
      )
    },
    {
      ...value,
      sourceRegistry: replaceAfter(
        value.sourceRegistry,
        '  registerMatch(\n    p1address:',
        'initialized: true',
        'initialized: false'
      )
    },
    {
      ...value,
      sourceBrowserWorker: replaceAfter(
        value.sourceBrowserWorker,
        "case 'in_progress_match_info':",
        '}, 3000)',
        '}, 0)'
      )
    },
    {
      ...value,
      sourceMatchTracker: value.sourceMatchTracker.replace(
        'math.Min(float64(abandonTimeout), float64(loadingAssetsTimeout))',
        'math.Max(float64(abandonTimeout), float64(loadingAssetsTimeout))'
      )
    },
    {
      ...value,
      sourceInProgressHook: value.sourceInProgressHook.replace(
        'inProgressMatchInfo.disconnectTimeout * 1000',
        '180 * 1000'
      )
    },
    {
      ...value,
      gameWorker: value.gameWorker.replace(
        "if (url.pathname === '/internal/status')",
        "if (url.pathname === '/internal/status-disabled')"
      )
    },
    {
      ...value,
      gameWorker: value.gameWorker.replace(
        "searchParams.get('scope') === 'match-info'",
        "searchParams.get('scope') === 'full'"
      )
    },
    {
      ...value,
      gameRuntimeTest: replaceAfter(
        value.gameRuntimeTest,
        "it('exposes only authenticated durable timeout state to match info'",
        'https://match/internal/status?scope=match-info',
        'https://match/internal/status?scope=full'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        "WHERE (status = 'creating'",
        "WHERE (status = 'active'"
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'mode: modes[0]',
        'mode: modes[1]'
      )
    },
    {
      ...value,
      gameWorker: replaceAfter(
        value.gameWorker,
        '  private async recentMatchInfo(request: Request)',
        'gameMode: sourceGameServerMode([',
        'gameMode: participant.gameMode || (['
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        `it("returns player one's source registry mode for both mixed-match participants"`,
        'GameMode.PRACTICE_PVP',
        'GameMode.RANKED_CONSTRUCTED'
      )
    },
    {
      ...value,
      gameModeTest: value.gameModeTest.replace(
        '.toBe(GameMode.UNKNOWN)',
        '.toBe(GameMode.PRACTICE_PVP)'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'conquestInfo: conquestInfo.map(sourceConquest)',
        'conquestInfo'
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('returns a participant recent match for 24 hours without leaking it to spectators'",
        'conquestInfo: [emptyConquest, emptyConquest]',
        'conquestInfo: []'
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('returns a participant recent match for 24 hours without leaking it to spectators'",
        'expect(invalidConquestResponse.status).toBe(500)',
        'expect(invalidConquestResponse.status).toBe(200)'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'Math.min(...deadlines)',
        'Math.max(...deadlines)'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'Number.isSafeInteger(loadExpiryAtMs)',
        'Number.isFinite(loadExpiryAtMs)'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'status.proposalId !== proposalId',
        'false'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        "const initialized = row.status === 'active'",
        'const initialized = true'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'serverLocationKey: `match:${row.proposal_id}`',
        'replayID: row.proposal_id'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        'hostname: websocket.hostname,',
        "hostname: websocket.hostname, internalHostname: '',"
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        "pendingAddress.protocol === 'https:' ? 'wss:' : 'ws:'",
        "pendingAddress.protocol === 'https:' ? 'https:' : 'http:'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('restores the source match-info contract for the requested player'",
        'expect(await response.json()).toEqual({',
        'expect(await response.json()).toMatchObject({'
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves source initializing match info for the client retry loop'",
        "serverLocationKey: 'match:initializing-proposal'",
        "replayID: 'initializing-replay'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('uses the source minimum remaining loading and disconnect TTL'",
        'abandonAtMs: deadlineBase + 60_900',
        'abandonAtMs: undefined'
      )
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'build:cloudflare': value.rootPackage.scripts[
            'build:cloudflare'
          ].replace('pnpm check:cloudflare:match-info && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchInfoErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
