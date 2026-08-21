import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { gameIngressErrors } from './check-cloudflare-game-ingress.mjs'

const fixtures = async () => {
  const [
    sourceServer,
    sourceMatchManager,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile('server/src/Server.ts', 'utf8'),
    readFile('server/src/core/MatchManager.ts', 'utf8'),
    readFile('server/src/PlayerContext.ts', 'utf8'),
    readFile('game/src/state/net/WebSocketClient.ts', 'utf8'),
    readFile('game-server-cloudflare/src/protocol.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('game-server-cloudflare/test/protocol.test.ts', 'utf8'),
    readFile(
      'game-server-cloudflare/test-cloudflare/game-match.test.ts',
      'utf8'
    ),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceServer,
    sourceMatchManager,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
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
      sourceMatchManager: value.sourceMatchManager.replace(
        'private handleLoadingProgress = (\n    msg: LoadingProgressMessage,\n    context: PlayerContext\n  ) => {\n    if (!context.matchProxy) {\n      return',
        'private handleLoadingProgress = (\n    msg: LoadingProgressMessage,\n    context: PlayerContext\n  ) => {\n    if (!context.matchProxy) {\n      context.connection.close()\n      return'
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
        "it('rejects player stickers outside the accepted match equipment'",
        "message: 'player used unowned sticker'",
        "message: 'Error: player used unowned sticker'"
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
