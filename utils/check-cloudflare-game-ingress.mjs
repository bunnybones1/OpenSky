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

export const gameIngressErrors = ({
  sourceServer,
  sourceMatchManager,
  sourcePlayerContext,
  sourceBrowserSocket,
  workerProtocol,
  workerMatch,
  workerProtocolTest,
  workerRuntimeTest,
  rootPackage
}) => {
  const errors = []

  const sourceMessage = bodyBetween(
    sourceServer,
    'private async onClientMessage(',
    '\n  }\n}'
  )
  requireOrdered(errors, 'Source game frame ingress', sourceMessage, [
    'const strData = data.toString()',
    "if (strData.startsWith('PING')) {",
    "const split = strData.split(':')",
    'if (split.length < 2) {',
    'playerContext.ping(split[1])',
    'message = JSON.parse(strData)',
    "logger.error('WS ERROR PARSING MESSAGE'",
    'return',
    'this.matchManager.handleMessage(message, playerContext)'
  ])

  const sourceHandleMessage = bodyBetween(
    sourceMatchManager,
    'handleMessage = (',
    '\n\n  disconnect ='
  )
  requireOrdered(
    errors,
    'Source game unknown-message lifecycle',
    sourceHandleMessage,
    [
      'try {',
      'switch (msg.type) {',
      'default:',
      "logger.error('GAMESERVER: UNKNOWN MESSAGE'",
      'context.connection.close()',
      '} catch (error) {',
      "logger.critical('UNEXPECTED ERROR'"
    ]
  )

  const sourceLoading = bodyBetween(
    sourceMatchManager,
    'private handleLoadingProgress = (',
    'private handleClientError = ('
  )
  requireOrdered(errors, 'Source unlinked loading progress', sourceLoading, [
    'if (!context.matchProxy) {',
    'return'
  ])
  if (sourceLoading.includes('connection.close(')) {
    errors.push('Source unlinked loading-progress handler became terminal')
  }
  const sourceClientError = bodyBetween(
    sourceMatchManager,
    'private handleClientError = (',
    'private handleGameplayAction = ('
  )
  if (!sourceClientError.includes("logger.error('ERROR FROM CLIENT'")) {
    errors.push('Source unlinked client-error logging changed')
  }
  if (sourceClientError.includes('connection.close(')) {
    errors.push('Source client-error handler became terminal')
  }
  const sourceEmote = bodyBetween(
    sourceMatchManager,
    'private handlePlayerEmoted(',
    'private handlePlayerMuted('
  )
  requireOrdered(errors, 'Source unlinked emote handling', sourceEmote, [
    "if (!sendingContext.id || !('sticker' in message)) {",
    'return'
  ])
  const sourceUnlinkedEmote = bodyBetween(
    sourceEmote,
    "if (!sendingContext.id || !('sticker' in message)) {",
    'message.fromSpectator = sendingContext.id'
  )
  if (sourceUnlinkedEmote.includes('connection.close(')) {
    errors.push('Source unlinked emote handler became terminal')
  }
  const sourceMute = bodyBetween(
    sourceMatchManager,
    'private handlePlayerMuted(',
    '\n  }\n}'
  )
  requireOrdered(errors, 'Source unlinked mute handling', sourceMute, [
    'sendingContext.matchProxy?.playerOrder.findIndex(',
    'if (sendingGamePlayer !== undefined && sendingGamePlayer !== -1) {',
    'sendingContext.processMessage(message)'
  ])

  if (!sourcePlayerContext.includes('const KEEPALIVE_INTERVAL = 5000')) {
    errors.push('Source game keepalive interval is no longer five seconds')
  }
  if (!sourcePlayerContext.includes('const KEEPALIVE_GRACE_PERIOD = 2000')) {
    errors.push('Source game server keepalive grace is no longer two seconds')
  }
  const sourcePing = bodyBetween(
    sourcePlayerContext,
    'ping(id: string): void {',
    '\n  }\n}'
  )
  requireOrdered(errors, 'Source game application heartbeat', sourcePing, [
    'this.clearPingInterval()',
    'const latency = now - last - KEEPALIVE_INTERVAL',
    'KEEPALIVE_INTERVAL + KEEPALIVE_GRACE_PERIOD + latency',
    'this.connection.send(`PONG:${id}`)',
    'this._keepaliveInterval = global.setTimeout(() => {',
    'this.connection.terminate()',
    '}, this._keepaliveResponseTime)'
  ])

  if (!sourceBrowserSocket.includes('const KEEPALIVE_INTERVAL = 5000')) {
    errors.push('Source browser keepalive interval is no longer five seconds')
  }
  requireOrdered(
    errors,
    'Source browser missed-PONG recovery',
    sourceBrowserSocket,
    [
      "if (ev.data.toString().startsWith('PONG')) {",
      'clearTimeout(this._keepaliveFailTimeout)',
      'this._keepaliveInterval = setInterval(() => {',
      "thisConn.send('PING:' + this._keepaliveID)",
      'this._keepaliveFailTimeout = setTimeout(() => {',
      'this.close(thisConn)',
      '}, this._latencyAdjustedResponseTime)',
      '}, KEEPALIVE_INTERVAL)'
    ]
  )

  const workerDecode = bodyBetween(
    workerProtocol,
    'export const decodeClientFrame = (',
    'export const parseSourcePing = ('
  )
  requireOrdered(
    errors,
    'Worker source-compatible frame decoding',
    workerDecode,
    [
      'const bytes =',
      'new TextEncoder().encode(raw)',
      'new Uint8Array(raw)',
      'if (bytes.byteLength > MAX_GAME_MESSAGE_BYTES) {',
      "typeof raw === 'string' ? raw : new TextDecoder().decode(bytes)"
    ]
  )
  if (workerDecode.includes('binary messages are not supported')) {
    errors.push('Worker still rejects source-compatible binary game frames')
  }

  const workerPing = bodyBetween(
    workerProtocol,
    'export const parseSourcePing = (',
    'export const parseClientMessage = ('
  )
  requireOrdered(errors, 'Worker source-compatible PING decoder', workerPing, [
    "if (!frame.startsWith('PING')) return { handled: false }",
    "const fields = frame.split(':')",
    'fields.length < 2',
    '{ handled: true, id: fields[1] }'
  ])

  for (const declaration of [
    'export class IgnoredGameMessageError extends GameProtocolError',
    'export class UnknownGameMessageError extends GameProtocolError'
  ]) {
    if (!workerProtocol.includes(declaration)) {
      errors.push(
        `Worker game decode classification is missing: ${declaration}`
      )
    }
  }
  const workerParser = bodyBetween(
    workerProtocol,
    'export const parseClientMessage = (',
    'export const stateError = ('
  )
  requireOrdered(
    errors,
    'Worker source-compatible decode lifecycle',
    workerParser,
    [
      "throw new IgnoredGameMessageError('message is not valid JSON')",
      'if (value === null) {',
      "throw new IgnoredGameMessageError('message is null')",
      "throw new UnknownGameMessageError('message type is required')",
      'default:',
      "throw new UnknownGameMessageError('unsupported message type')"
    ]
  )

  const workerMessage = bodyBetween(
    workerMatch,
    'async webSocketMessage(',
    'async webSocketClose('
  )
  requireOrdered(errors, 'Worker game frame routing', workerMessage, [
    'const frame = decodeClientFrame(raw)',
    'const ping = parseSourcePing(frame)',
    'if (ping.handled) {',
    'if (ping.id !== undefined) {',
    'this.safeSend(socket, `PONG:${ping.id}`)',
    'const message = parseClientMessage(frame)'
  ])
  requireOrdered(errors, 'Worker game decode failure routing', workerMessage, [
    'if (error instanceof IgnoredGameMessageError) return',
    'if (error instanceof UnknownGameMessageError) {',
    'socket.close()',
    'return',
    'this.safeSend(socket, stateError(error))'
  ])
  const workerUnjoined = bodyBetween(
    workerMessage,
    'if (!attachment.joined) {',
    'await this.handleMessage(socket, attachment, message)'
  )
  requireOrdered(
    errors,
    'Worker source-compatible pre-join routing',
    workerUnjoined,
    [
      "if (message.type === 'gameplay') {",
      "level: 'user'",
      "message: 'You have no game in progress!'",
      'socket.close()',
      "message.type === 'player_loading_progress' ||",
      "message.type === 'emote' ||",
      "message.type === 'mute_opponent' ||",
      "message.type === 'error'",
      'return',
      'const bootstrapAllowed ='
    ]
  )
  if (workerUnjoined.includes('attachment.detachedPlayerSession &&')) {
    errors.push('Worker no-game gameplay remains limited to detached players')
  }
  for (const token of [
    'Cloudflare owns protocol ping/pong and disconnect detection',
    'the preserved browser still closes',
    'Do not wake',
    'duplicate five-second alarm'
  ]) {
    if (!workerMessage.includes(token)) {
      errors.push(`Worker keepalive disposition is missing: ${token}`)
    }
  }

  for (const [label, source, tokens] of [
    [
      'unit',
      workerProtocolTest,
      [
        "it('preserves the source PING prefix and first colon-delimited ID'",
        "it('accepts source-compatible binary JSON and bounds malformed messages'",
        'new ArrayBuffer(MAX_GAME_MESSAGE_BYTES + 1)',
        "parseClientMessage('null')).toThrow(IgnoredGameMessageError)",
        "parseClientMessage('{}')).toThrow(UnknownGameMessageError)"
      ]
    ],
    [
      'Workers',
      workerRuntimeTest,
      [
        "it('preserves source text and binary game frames across hibernation'",
        "first.send('PINGlegacy:roundtrip:ignored')",
        "expect(await pong).toBe('PONG:roundtrip')",
        'await evictDurableObject(stub())',
        'as ArrayBuffer',
        "it('silently ignores malformed frames and empty-closes unknown messages'",
        "malformed.send('{')",
        'malformed.send(new Uint8Array([0]).buffer as ArrayBuffer)',
        "malformed.send('null')",
        "unknown.send(JSON.stringify({ type: 'unknown_source_message' }))",
        "code: 1005, reason: ''",
        'expect(unexpectedMessages).toEqual([])',
        "it('silently ignores source non-gameplay messages before join_server'",
        "type: 'player_loading_progress', progress: 0.5",
        "type: 'emote', emote: 'hello'",
        "type: 'mute_opponent', muted: true",
        "type: 'error', message: 'client diagnostic'",
        "it('preserves source no-game gameplay before join_server'",
        "message: 'You have no game in progress!'",
        "code: 1005, reason: ''"
      ]
    ]
  ]) {
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(
          `Worker ${label} game-ingress regression is missing: ${token}`
        )
      }
    }
  }

  const workerSilentPreJoinTest = bodyBetween(
    workerRuntimeTest,
    "it('silently ignores source non-gameplay messages before join_server'",
    "it('preserves source no-game gameplay before join_server'"
  )
  requireOrdered(
    errors,
    'Worker silent pre-join runtime regression',
    workerSilentPreJoinTest,
    [
      "type: 'player_loading_progress', progress: 0.5",
      "type: 'emote', emote: 'hello'",
      "type: 'mute_opponent', muted: true",
      "type: 'error', message: 'client diagnostic'",
      "type: 'timesync', clientTime: 8765",
      'expect(first.readyState).toBe(WebSocket.OPEN)'
    ]
  )
  const workerNoGamePreJoinTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves source no-game gameplay before join_server'",
    "it('restores the authoritative WASM snapshot"
  )
  requireOrdered(
    errors,
    'Worker no-game pre-join runtime regression',
    workerNoGamePreJoinTest,
    [
      "type: 'gameplay', data: ['0x00']",
      "level: 'user'",
      "message: 'You have no game in progress!'",
      "code: 1005, reason: ''"
    ]
  )

  const scripts = rootPackage?.scripts ?? {}
  if (
    !String(scripts['build:cloudflare'] ?? '').includes(
      'pnpm check:cloudflare:game-ingress'
    )
  ) {
    errors.push('Complete Cloudflare build omits the game ingress gate')
  }
  if (
    !String(scripts['deploy:cloudflare:game-server'] ?? '').includes(
      'pnpm check:cloudflare:game-ingress'
    )
  ) {
    errors.push('Game-server deployment omits the ingress source gate')
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
    readFile(path.join(root, 'server/src/Server.ts'), 'utf8'),
    readFile(path.join(root, 'server/src/core/MatchManager.ts'), 'utf8'),
    readFile(path.join(root, 'server/src/PlayerContext.ts'), 'utf8'),
    readFile(path.join(root, 'game/src/state/net/WebSocketClient.ts'), 'utf8'),
    readFile(path.join(root, 'game-server-cloudflare/src/protocol.ts'), 'utf8'),
    readFile(
      path.join(root, 'game-server-cloudflare/src/game-match.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/test/protocol.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare/test-cloudflare/game-match.test.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = gameIngressErrors({
    sourceServer,
    sourceMatchManager,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  })
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare game ingress preserves source text/binary frames, PING, and decode-error behavior'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
