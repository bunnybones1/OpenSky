import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { gameIngressErrors } from './check-cloudflare-game-ingress.mjs'

const fixtures = async () => {
  const [
    sourceServer,
    sourceConfig,
    sourceMatchManager,
    sourceMatchHandler,
    sourceMatchProxy,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerRuntimeSettings,
    workerProtocolTest,
    workerRuntimeSettingsTest,
    workerRuntimeTest,
    workerProductionConfig,
    workerTestConfig,
    rootPackage
  ] = await Promise.all([
    readFile('server/src/Server.ts', 'utf8'),
    readFile('server/src/utils/config.ts', 'utf8'),
    readFile('server/src/core/MatchManager.ts', 'utf8'),
    readFile('server/src/worker/match/MatchHandler.ts', 'utf8'),
    readFile('server/src/core/MatchProxy.ts', 'utf8'),
    readFile('server/src/PlayerContext.ts', 'utf8'),
    readFile('game/src/state/net/WebSocketClient.ts', 'utf8'),
    readFile('game-server-cloudflare/src/protocol.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('game-server-cloudflare/src/runtime-settings.ts', 'utf8'),
    readFile('game-server-cloudflare/test/protocol.test.ts', 'utf8'),
    readFile('game-server-cloudflare/test/runtime-settings.test.ts', 'utf8'),
    readFile(
      'game-server-cloudflare/test-cloudflare/game-match.test.ts',
      'utf8'
    ),
    readFile('game-server-cloudflare/wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('game-server-cloudflare/wrangler.test.jsonc', 'utf8').then(
      JSON.parse
    ),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceServer,
    sourceConfig,
    sourceMatchManager,
    sourceMatchHandler,
    sourceMatchProxy,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerRuntimeSettings,
    workerProtocolTest,
    workerRuntimeSettingsTest,
    workerRuntimeTest,
    workerProductionConfig,
    workerTestConfig,
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

test('pins the source and Worker game ingress lifecycle', async () => {
  assert.deepEqual(gameIngressErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, test, and release requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceServer: value.sourceServer.replace(
        'const strData = data.toString()',
        "const strData = typeof data === 'string' ? data : ''"
      )
    },
    {
      ...value,
      sourceServer: value.sourceServer.replace(
        "if (strData.startsWith('PING')) {",
        "if (strData === 'PING') {"
      )
    },
    {
      ...value,
      sourceServer: value.sourceServer.replace(
        "logger.error('WS ERROR PARSING MESSAGE', error, { wsData: { data } })\n      return",
        "logger.error('WS ERROR PARSING MESSAGE', error, { wsData: { data } })\n      throw error"
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        "logger.error('GAMESERVER: UNKNOWN MESSAGE', { msg })\n          context.connection.close()",
        "logger.error('GAMESERVER: UNKNOWN MESSAGE', { msg })"
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handleJoinServer = async (',
        "this.sendError(context, 'invalid authentication')",
        "this.sendError(context, 'authentication failed')"
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handleJoinServer = async (',
        'context.opponent?.send({',
        'context.send({'
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        'private handleLoadingProgress = (\n    msg: LoadingProgressMessage,\n    context: PlayerContext\n  ) => {\n    if (!context.matchProxy) {\n      return',
        'private handleLoadingProgress = (\n    msg: LoadingProgressMessage,\n    context: PlayerContext\n  ) => {\n    if (!context.matchProxy) {\n      context.connection.close()\n      return'
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handleLoadingProgress = (',
        'context.opponent?.send({',
        'context.send({'
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        "if (!sendingContext.id || !('sticker' in message)) {\n        return",
        "if (!sendingContext.id || !('sticker' in message)) {\n        sendingContext.connection.close()\n        return"
      )
    },
    {
      ...value,
      sourceConfig: value.sourceConfig.replace('chat: false', 'chat: true')
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handlePlayerEmoted(',
        'if (this.config.settings.chat) {',
        'if (true) {'
      )
    },
    {
      ...value,
      sourceMatchHandler: value.sourceMatchHandler.replace(
        'opponent.send(message)',
        'player.send(message)'
      )
    },
    {
      ...value,
      sourceMatchHandler: replaceAfter(
        value.sourceMatchHandler,
        'handleEnemyMutedMessage = (',
        'player.finishedLoadingAssets && opponent.finishedLoadingAssets',
        'player.finishedLoadingAssets'
      )
    },
    {
      ...value,
      sourceMatchHandler: replaceAfter(
        value.sourceMatchHandler,
        'handleJoin = (message: JoinServerMessage) => {',
        'opponentMuted: player.opponentMuted',
        'opponentMuted: false'
      )
    },
    {
      ...value,
      sourceMatchHandler: replaceAfter(
        value.sourceMatchHandler,
        'handlePlayerFinishLoadingAssets = (',
        'player?.send({',
        'opponent?.send({'
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'disconnect = (context: PlayerContext, code: number) => {',
        'context.opponent?.send({',
        'context.send({'
      )
    },
    {
      ...value,
      sourceMatchProxy: replaceAfter(
        value.sourceMatchProxy,
        'for (const s of this.spectators.values()) {',
        's.context.send(message.message)',
        'void message.message'
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handleSpectate = async (',
        "this.sendError(context, 'invalid spectate player')",
        "this.sendError(context, 'invalid spectator')"
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handleSpectate = async (',
        "this.sendError(context, 'you can\\t spectate yourself')",
        "this.sendError(context, 'you cannot spectate yourself')"
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private sendError = (',
        "level: 'server'",
        "level: 'state'"
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'private handlePlayerEmoted(',
        "message: 'player used unowned sticker'",
        "message: 'invalid sticker'"
      )
    },
    {
      ...value,
      sourceMatchManager: replaceAfter(
        value.sourceMatchManager,
        'const MAX_SPECTATORS = 50',
        "message: 'too many spectators'",
        "message: 'spectator capacity reached'"
      )
    },
    {
      ...value,
      sourcePlayerContext: value.sourcePlayerContext.replace(
        'const KEEPALIVE_GRACE_PERIOD = 2000',
        'const KEEPALIVE_GRACE_PERIOD = 4000'
      )
    },
    {
      ...value,
      sourceBrowserSocket: value.sourceBrowserSocket.replace(
        "thisConn.send('PING:' + this._keepaliveID)",
        "thisConn.send('PING')"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        'new Uint8Array(raw)',
        'new Uint8Array()'
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "typeof raw === 'string' ? raw : new TextDecoder().decode(bytes)",
        "typeof raw === 'string' ? raw : ''"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "if (!frame.startsWith('PING')) return { handled: false }",
        "if (frame !== 'PING') return { handled: false }"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "const fields = frame.split(':')",
        'const fields = [frame]'
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "throw new IgnoredGameMessageError('message is not valid JSON')",
        "throw new GameProtocolError('message is not valid JSON')"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "throw new UnknownGameMessageError('unsupported message type')",
        "throw new GameProtocolError('unsupported message type')"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "typeof value.chat === 'string',",
        "typeof value.chat === 'string' && value.chat.length <= 500,"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        'export class SourceGameError extends GameProtocolError {',
        'export class SourceGameError extends Error {'
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        "throw new SourceGameError('invalid spectate code', 'server')",
        "throw new GameProtocolError('invalid spectate code')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'this.safeSend(socket, `PONG:${ping.id}`)',
        "this.safeSend(socket, 'PONG')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "message.type === 'join_server' ||",
        "(role === 'player' && message.type === 'join_server') ||"
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        "case 'join_server': {",
        "throw new SourceGameError('invalid authentication', 'server')",
        "throw new GameProtocolError('not authorized')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'Cloudflare owns protocol ping/pong and disconnect detection',
        'Application owns all socket timers'
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'if (error instanceof IgnoredGameMessageError) return',
        'if (error instanceof IgnoredGameMessageError) throw error'
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'if (error instanceof UnknownGameMessageError) {\n          socket.close()',
        'if (error instanceof UnknownGameMessageError) {\n          socket.close(1008, error.message)'
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "if (message.type === 'gameplay') {",
        "if (attachment.detachedPlayerSession && message.type === 'gameplay') {"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "message.type === 'error'",
        "message.type === 'unknown'"
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'if (error instanceof SourceGameError) {',
        'socket.close()',
        'socket.close(1008, error.message)'
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "throw new SourceGameError('connected in another location', 'user')",
        "throw new GameProtocolError('spectator is already joined')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "throw new SourceGameError('you can\\t spectate yourself', 'server')",
        "throw new GameProtocolError('you cannot spectate yourself')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "throw new SourceGameError('match ended or cannot be found.', 'server')",
        "throw new GameProtocolError('match ended or cannot be found.')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "throw new SourceGameError('player used unowned sticker', 'server')",
        "throw new GameProtocolError('player used unowned sticker')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'if (this.settings.chatEnabled) {',
        'if (true) {'
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'chatEnabled: sourceChatEnabled(env.CHAT_ENABLED)',
        'chatEnabled: true'
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        "case 'mute_opponent': {",
        '!Object.values(players).every(player =>',
        'Object.values(players).some(player =>'
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'private async join(',
        'await this.updateLoading(attachment.principal, message.loadingProgress)',
        "this.sendToSpectators({ type: 'opponent_connected' })\n    await this.updateLoading(attachment.principal, message.loadingProgress)"
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'private async updateLoading(',
        'this.sendToPrincipal(opponentPrincipal, loadingForOpponent)',
        'this.sendToPrincipal(opponentPrincipal, loadingForOpponent)\n    this.sendToSpectators(loadingForOpponent)'
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'private async disconnectPlayer(',
        'const runtime = await this.ensureRuntime()',
        "this.sendToSpectators({ type: 'opponent_disconnected' })\n    const runtime = await this.ensureRuntime()"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'this.sendToSpectators(message)',
        'void message'
      )
    },
    {
      ...value,
      workerRuntimeSettings: value.workerRuntimeSettings.replace(
        "value === 'true'",
        "value !== 'false'"
      )
    },
    {
      ...value,
      workerRuntimeSettingsTest: value.workerRuntimeSettingsTest.replace(
        "[undefined, '', 'false', 'TRUE', '1']",
        "[undefined, '', 'false']"
      )
    },
    {
      ...value,
      workerProductionConfig: {
        ...value.workerProductionConfig,
        vars: {
          ...value.workerProductionConfig.vars,
          CHAT_ENABLED: 'true'
        }
      }
    },
    {
      ...value,
      workerTestConfig: {
        ...value.workerTestConfig,
        vars: {
          ...value.workerTestConfig.vars,
          CHAT_ENABLED: 'false'
        }
      }
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "message.type === 'spectate_server'",
        "role === 'spectator' && message.type === 'spectate_server'"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "if (role !== 'player') return",
        'this.requirePlayer(role)'
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "attachment.role = 'spectator'",
        "attachment.role = 'player'"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        'const MAX_SPECTATOR_SOCKETS = 64',
        'const MAX_SPECTATOR_SOCKETS = 50'
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'private async connectSocket(',
        "role === 'spectator' &&",
        "role === 'spectator' &&\n      previousSockets.length === 0 &&"
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'private sendToPrincipal(',
        "(attachment.role ?? 'player') === 'player'",
        'true'
      )
    },
    {
      ...value,
      workerMatch: replaceAfter(
        value.workerMatch,
        'const targetIndex = [0, 1].find(',
        "throw new SourceGameError('match ended or cannot be found.', 'server')",
        "throw new GameProtocolError('spectated player is not in match')"
      )
    },
    {
      ...value,
      workerMatch: value.workerMatch.replace(
        "throw new SourceGameError('too many spectators', 'user')",
        "throw new GameProtocolError('too many spectators')"
      )
    },
    {
      ...value,
      workerProtocolTest: value.workerProtocolTest.replace(
        "it('accepts source-compatible binary JSON and bounds malformed messages'",
        "it('rejects binary game messages'"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "expect(await pong).toBe('PONG:roundtrip')",
        "expect(await pong).toBe('PONG')"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'expect(unexpectedMessages).toEqual([])',
        "expect(unexpectedMessages).toEqual(['error'])"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves source no-game gameplay before join_server'",
        "message: 'You have no game in progress!'",
        "message: 'Error: join_server is required first'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves source join authentication and unavailable-match errors'",
        "message: 'invalid authentication'",
        "message: 'Error: invalid authentication'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('rejects player stickers outside the accepted match equipment'",
        "message: 'player used unowned sticker'",
        "message: 'Error: player used unowned sticker'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves source configurable chat outside the emote throttle'",
        'expect(throttledOpponent).toEqual([])',
        "expect(throttledOpponent).toEqual([{ type: 'emote' }])"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves the source loaded-player mute gate and reconnect state'",
        '.toBe(false)',
        '.toBe(true)'
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('keeps source connection and loading lifecycle player-only until completion'",
        'expect(connectionLeaks).toEqual([])',
        "expect(connectionLeaks).toEqual([{ type: 'opponent_connected' }])"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves source spectate validation errors and empty closes'",
        "message: 'invalid spectate player'",
        "message: 'Error: invalid spectate player'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves the source unavailable-match player error and empty close'",
        "message: 'match ended or cannot be found.'",
        "message: 'Error: match ended or cannot be found.'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves the source same-socket spectator replacement close'",
        "level: 'user'",
        "level: 'state'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves the source same-socket player replacement rejoin'",
        "message: 'You connected in another session, please play there.'",
        "message: 'connected elsewhere'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('lets a participant spectate the opponent without leaking player-only messages'",
        'expect(mutedMessages).toEqual([])',
        "expect(mutedMessages).toEqual([{ type: 'error' }])"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('lets a participant spectate the opponent without leaking player-only messages'",
        'expect(leaked).toEqual([])',
        "expect(leaked).toEqual([{ type: 'rewards' }])"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves the source joined-spectator limit error and empty close'",
        "message: 'too many spectators'",
        "message: 'spectator capacity reached'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('bounds pending spectator sockets above the source joined limit'",
        'index < 64',
        'index < 50'
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        'const duplicateOverflow = await SELF.fetch(',
        'expect(duplicateOverflow.status).toBe(429)',
        'expect(duplicateOverflow.status).toBe(101)'
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
          ].replace('pnpm check:cloudflare:game-ingress && ', '')
        }
      }
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'deploy:cloudflare:game-server': value.rootPackage.scripts[
            'deploy:cloudflare:game-server'
          ].replace('pnpm check:cloudflare:game-ingress && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      gameIngressErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
