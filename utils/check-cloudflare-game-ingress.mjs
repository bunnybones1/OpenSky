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

  const sourceJoin = bodyBetween(
    sourceMatchManager,
    'private handleJoinServer = async (',
    'private handleSpectate = async ('
  )
  requireOrdered(errors, 'Source explicit join errors', sourceJoin, [
    'const playerID = this.authenticate(message.authToken)',
    'if (!playerID) {',
    "this.sendError(context, 'invalid authentication')",
    'const match = matchbook.getMatchByPlayerID(playerID)',
    "? 'match initializing, please try again later'",
    ": 'match ended or cannot be found.'",
    'this.sendError(context, message)'
  ])
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
  if (!sourceConfig.includes('chat: false')) {
    errors.push('Source game-server chat no longer defaults to disabled')
  }
  requireOrdered(
    errors,
    'Source configurable chat and emote throttle',
    sourceEmote,
    [
      "if ('chat' in message) {",
      'if (this.config.settings.chat) {',
      'sendingContext.processMessage(message)',
      'return',
      "if ('sticker' in message) {",
      'const MIN_EMOTE_DELAY = 4000',
      'const MIN_EMOTE_SPAM_DELAY = 40000',
      'if (',
      'timeSinceLastEmote > MIN_EMOTE_DELAY &&',
      'timeSinceFirstSavedEmote > MIN_EMOTE_SPAM_DELAY',
      'recvPlayer.processMessage(message)'
    ]
  )
  const sourceEmoteRelay = bodyBetween(
    sourceMatchHandler,
    'handleEmoteMessage = (',
    'handleEnemyMutedMessage = ('
  )
  requireOrdered(errors, 'Source emote recipient relay', sourceEmoteRelay, [
    'player.finishedLoadingAssets && opponent.finishedLoadingAssets',
    'if (message.fromSpectator) {',
    'player.send(message)',
    '} else {',
    'opponent.send(message)'
  ])
  const sourceProxyRelay = bodyBetween(
    sourceMatchProxy,
    "case 'relay': {",
    "case 'internal_match_ended':"
  )
  requireOrdered(errors, 'Source spectator relay', sourceProxyRelay, [
    'player.send(message.message)',
    "if (message.message.type === 'reconnect') {",
    '} else {',
    'for (const s of this.spectators.values()) {',
    's.context.send(message.message)'
  ])
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
  const sourceSpectate = bodyBetween(
    sourceMatchManager,
    'private handleSpectate = async (',
    'private handleLoadingProgress = ('
  )
  requireOrdered(errors, 'Source explicit spectate errors', sourceSpectate, [
    "this.sendError(context, 'invalid spectate player')",
    "this.sendError(context, 'you can\\t spectate yourself')",
    "this.sendError(context, 'invalid spectate code')",
    'existing.context.send({',
    "level: 'user'",
    "message: 'connected in another location'",
    'existing.context.connection.close()',
    'const MAX_SPECTATORS = 50',
    "level: 'user'",
    "message: 'too many spectators'",
    'context.connection.close()'
  ])
  const sourceSendError = bodyBetween(
    sourceMatchManager,
    'private sendError = (',
    'private handlePlayerEmoted('
  )
  requireOrdered(errors, 'Source server-error wire', sourceSendError, [
    'player.send({',
    "type: 'error'",
    'message,',
    "level: 'server'",
    'player.connection.close()'
  ])
  requireOrdered(errors, 'Source unowned-sticker error wire', sourceEmote, [
    'sendingContext.send({',
    "type: 'error'",
    "level: 'server'",
    "message: 'player used unowned sticker'",
    'sendingContext.connection.close()'
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
  const workerEmoteParser = bodyBetween(
    workerParser,
    "case 'emote':",
    "case 'error':"
  )
  if (!workerEmoteParser.includes("typeof value.chat === 'string'")) {
    errors.push('Worker no longer accepts the source chat string variant')
  }
  if (workerEmoteParser.includes('value.chat.length')) {
    errors.push('Worker reintroduced a non-source chat-length policy')
  }
  requireOrdered(errors, 'Worker source error protocol', workerProtocol, [
    'export class SourceGameError extends GameProtocolError {',
    "readonly level: 'user' | 'server'",
    "throw new SourceGameError('invalid spectate player', 'server')",
    "throw new SourceGameError('invalid spectate code', 'server')"
  ])

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
  const workerUnknownErrorRoute = bodyBetween(
    workerMessage,
    'if (error instanceof UnknownGameMessageError) {',
    '// MatchManager.sendError'
  )
  requireOrdered(
    errors,
    'Worker unknown-message empty close',
    workerUnknownErrorRoute,
    ['socket.close()', 'return']
  )
  requireOrdered(errors, 'Worker source error routing', workerMessage, [
    'if (error instanceof SourceGameError) {',
    'this.safeSend(socket, {',
    "type: 'error'",
    'message: error.message',
    'level: error.level',
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
      'const bootstrapAllowed =',
      "message.type === 'join_server'",
      "message.type === 'spectate_server'"
    ]
  )
  if (workerUnjoined.includes('attachment.detachedPlayerSession &&')) {
    errors.push('Worker no-game gameplay remains limited to detached players')
  }
  if (
    workerUnjoined.includes(
      "role === 'player' && message.type === 'join_server'"
    )
  ) {
    errors.push('Worker still chooses join bootstrap from gateway role')
  }
  if (
    workerUnjoined.includes(
      "role === 'spectator' && message.type === 'spectate_server'"
    )
  ) {
    errors.push('Worker still chooses spectate bootstrap from gateway role')
  }
  requireOrdered(errors, 'Worker explicit source errors', workerMatch, [
    "throw new SourceGameError('connected in another location', 'user')",
    "throw new SourceGameError('match ended or cannot be found.', 'server')",
    "throw new SourceGameError('you can\\t spectate yourself', 'server')",
    "throw new SourceGameError('too many spectators', 'user')"
  ])
  const sourceUnavailableErrorCount = workerMatch.match(
    /throw new SourceGameError\('match ended or cannot be found\.', 'server'\)/g
  )?.length
  if (sourceUnavailableErrorCount !== 4) {
    errors.push(
      `Worker source unavailable-match errors changed: expected 4, found ${sourceUnavailableErrorCount ?? 0}`
    )
  }
  const sourceStickerErrorCount = workerMatch.match(
    /throw new SourceGameError\('player used unowned sticker', 'server'\)/g
  )?.length
  if (sourceStickerErrorCount !== 3) {
    errors.push(
      `Worker source unowned-sticker errors changed: expected 3, found ${sourceStickerErrorCount ?? 0}`
    )
  }
  const workerHandleMessage = bodyBetween(
    workerMatch,
    'private async handleMessage(',
    'private async join('
  )
  requireOrdered(
    errors,
    'Worker source message-selected spectator role',
    workerHandleMessage,
    [
      "case 'join_server': {",
      "if (role !== 'player') {",
      'if (attachment.anonymousSpectator) {',
      "throw new SourceGameError('invalid authentication', 'server')",
      "throw new SourceGameError('match ended or cannot be found.', 'server')",
      "case 'spectate_server': {",
      'if (attachment.joined)',
      'await this.spectate(socket, attachment, message)',
      "case 'mute_opponent': {",
      "if (role !== 'player') return"
    ]
  )
  if (
    workerHandleMessage.includes(
      "throw new GameProtocolError('players cannot spectate their own match')"
    )
  ) {
    errors.push('Worker still rejects source participant spectator sessions')
  }
  if (!workerMatch.includes('CHAT_ENABLED?: string')) {
    errors.push('Worker game-server environment omits configurable chat')
  }
  if (!workerRuntimeSettings.includes("value === 'true'")) {
    errors.push('Worker chat setting is not strict and fail-closed')
  }
  if (
    !workerMatch.includes('chatEnabled: sourceChatEnabled(env.CHAT_ENABLED)')
  ) {
    errors.push('Worker runtime does not bind chat to the reviewed setting')
  }
  const workerEmote = bodyBetween(
    workerMatch,
    'private async emote(',
    'private async afterStateChange('
  )
  requireOrdered(
    errors,
    'Worker source-configurable chat and emote throttle',
    workerEmote,
    [
      "if ((attachment.role ?? 'player') === 'spectator') {",
      "if (!('sticker' in message) || !attachment.spectatedPrincipal) return",
      'const sanitized = { ...message } as EmoteMessage',
      'delete sanitized.fromPlayer',
      'delete sanitized.fromSpectator',
      'sanitized.fromPlayer = this.playerIndex(metadata.match, principal)',
      "if ('chat' in sanitized) {",
      'if (this.settings.chatEnabled) {',
      'await this.relayPlayerEmote(metadata, principal, sanitized)',
      'return',
      "if ('sticker' in sanitized) {",
      'const now = Date.now()',
      'if (sinceLast <= 4_000 || sinceFirst <= 40_000) return',
      'player.lastEmoteTimestamps = [',
      'await this.relayPlayerEmote(metadata, principal, sanitized)',
      'await this.state.storage.put(PLAYERS_KEY, players)'
    ]
  )
  const workerPlayerEmoteRelay = bodyBetween(
    workerMatch,
    'private async relayPlayerEmote(',
    'private async afterStateChange('
  )
  requireOrdered(
    errors,
    'Worker player emote recipient relay',
    workerPlayerEmoteRelay,
    [
      'this.sendToPrincipal(',
      'this.opponentAddress(metadata.match, principal)',
      'this.sendToSpectators(message)',
      'await this.replayEmote(message)'
    ]
  )
  if (workerProductionConfig?.vars?.CHAT_ENABLED !== 'false') {
    errors.push('Production game-server chat is not explicitly fail-closed')
  }
  if (workerTestConfig?.vars?.CHAT_ENABLED !== 'true') {
    errors.push('Workers regressions do not exercise enabled chat')
  }
  for (const token of [
    "expect(sourceChatEnabled('true')).toBe(true)",
    "[undefined, '', 'false', 'TRUE', '1']",
    'expect(sourceChatEnabled(value)).toBe(false)'
  ]) {
    if (!workerRuntimeSettingsTest.includes(token)) {
      errors.push(`Worker chat-setting regression is missing: ${token}`)
    }
  }
  const workerSpectate = bodyBetween(
    workerMatch,
    'private async spectate(',
    'private async updateLoading('
  )
  requireOrdered(
    errors,
    'Worker bounded source spectator admission',
    workerSpectate,
    [
      "throw new SourceGameError('match ended or cannot be found.', 'server')",
      "throw new SourceGameError('you can\\t spectate yourself', 'server')",
      'const joinedSpectators = this.spectatorSockets()',
      'if (!replacingSpectator && joinedSpectators.length >= MAX_SPECTATORS) {',
      "throw new SourceGameError('too many spectators', 'user')",
      'this.replaceSpectatorSession(socket, attachment.principal)',
      "attachment.role = 'spectator'",
      'attachment.joined = true'
    ]
  )
  requireOrdered(errors, 'Worker spectator socket safety bound', workerMatch, [
    'const MAX_SPECTATORS = 50',
    'const MAX_SPECTATOR_SOCKETS = 64',
    'this.spectatorSockets(undefined, true).length >= MAX_SPECTATOR_SOCKETS'
  ])
  const workerConnectSocket = bodyBetween(
    workerMatch,
    'private async connectSocket(',
    'private async handleMessage('
  )
  if (workerConnectSocket.includes('previousSockets')) {
    errors.push('Worker pending spectator cap can be bypassed by a duplicate')
  }
  const workerPrincipalSend = bodyBetween(
    workerMatch,
    'private sendToPrincipal(',
    'private spectatorSockets('
  )
  requireOrdered(
    errors,
    'Worker player-only principal routing',
    workerPrincipalSend,
    [
      'attachment?.joined &&',
      "(attachment.role ?? 'player') === 'player'",
      'this.safeSend(socket, message)'
    ]
  )
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
        "parseClientMessage('{}')).toThrow(UnknownGameMessageError)",
        "it('classifies source spectate validation errors with their exact wire'",
        'expect(error).toBeInstanceOf(SourceGameError)'
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
        "code: 1005, reason: ''",
        "it('preserves source join authentication and unavailable-match errors'",
        "message: 'invalid authentication'",
        "it('rejects player stickers outside the accepted match equipment'",
        "message: 'player used unowned sticker'",
        "it('preserves source configurable chat outside the emote throttle'",
        "viewer.send(JSON.stringify({ type: 'emote', chat: 'spectator chat' }))",
        'expect(spectatorChatLeak).toEqual([])',
        "const longChat = 'c'.repeat(501)",
        "chat: 'second chat'",
        "fromSpectator: 'forged'",
        'expect(opponentChats).resolves.toEqual(expectedChats)',
        'expect(spectatorChats).resolves.toEqual(expectedChats)',
        "prefix: 'match:replay:'",
        "first.send(JSON.stringify({ type: 'emote', emote: 'hello' }))",
        'expect(throttledOpponent).toEqual([])',
        'expect(throttledSpectator).toEqual([])',
        "it('preserves source spectate validation errors and empty closes'",
        "message: 'invalid spectate player'",
        "message: 'you can\\t spectate yourself'",
        "it('preserves the source unavailable-match player error and empty close'",
        "it('preserves the source unavailable-match spectator error and empty close'",
        "message: 'match ended or cannot be found.'",
        "it('preserves the source same-socket spectator replacement close'",
        "message: 'connected in another location'",
        "it('preserves the source same-socket player replacement rejoin'",
        "message: 'You connected in another session, please play there.'",
        "it('lets a participant spectate the opponent without leaking player-only messages'",
        "type: 'mute_opponent', muted: true",
        'expect(mutedMessages).toEqual([])',
        'expect(leaked).toEqual([])',
        "it('preserves the source joined-spectator limit error and empty close'",
        "message: 'too many spectators'",
        "it('bounds pending spectator sockets above the source joined limit'"
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
  const workerJoinErrorTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves source join authentication and unavailable-match errors'",
    "it('restores the authoritative WASM snapshot"
  )
  requireOrdered(
    errors,
    'Worker source join-error runtime regression',
    workerJoinErrorTest,
    [
      "[TRUSTED_ANONYMOUS_SPECTATOR_HEADER]: '1'",
      "message: 'invalid authentication'",
      'code: 1005,',
      'const nonparticipant = await connectAs(',
      "message: 'match ended or cannot be found.'",
      'code: 1005,'
    ]
  )
  const workerStickerErrorTest = bodyBetween(
    workerRuntimeTest,
    "it('rejects player stickers outside the accepted match equipment'",
    "it('restores public and private spectator state"
  )
  requireOrdered(
    errors,
    'Worker source sticker-error runtime regression',
    workerStickerErrorTest,
    [
      "type: 'emote', sticker: 999",
      "level: 'server'",
      "message: 'player used unowned sticker'",
      "code: 1005, reason: ''"
    ]
  )
  const workerChatTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves source configurable chat outside the emote throttle'",
    "it('restores public and private spectator state"
  )
  requireOrdered(
    errors,
    'Worker source chat runtime regression',
    workerChatTest,
    [
      "viewer.send(JSON.stringify({ type: 'emote', chat: 'spectator chat' }))",
      'expect(spectatorChatLeak).toEqual([])',
      "const longChat = 'c'.repeat(501)",
      'fromPlayer: 1,',
      "fromSpectator: 'forged'",
      'await expect(opponentChats).resolves.toEqual(expectedChats)',
      'await expect(spectatorChats).resolves.toEqual(expectedChats)',
      'lastEmoteTimestamps).toEqual([0, 0, 0])',
      "prefix: 'match:replay:'",
      'expect(relayed).toEqual(expectedChats)',
      "first.send(JSON.stringify({ type: 'emote', emote: 'hello' }))",
      "first.send(JSON.stringify({ type: 'emote', emote: 'gg' }))",
      'expect(throttledOpponent).toEqual([])',
      'expect(throttledSpectator).toEqual([])',
      'expect.any(Number)'
    ]
  )
  const workerSpectateErrorTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves source spectate validation errors and empty closes'",
    "it('preserves the source same-socket spectator replacement close'"
  )
  requireOrdered(
    errors,
    'Worker source spectate-error runtime regression',
    workerSpectateErrorTest,
    [
      "message: 'invalid spectate player'",
      'code: 1005',
      "message: 'you can\\t spectate yourself'",
      'code: 1005',
      "spectate(wrongTarget, 'identity:not-a-match-participant')",
      "message: 'match ended or cannot be found.'",
      'code: 1005'
    ]
  )
  const workerUnavailableMatchTests = bodyBetween(
    workerRuntimeTest,
    "it('preserves the source unavailable-match player error and empty close'",
    "it('preserves the source same-socket spectator replacement close'"
  )
  requireOrdered(
    errors,
    'Worker source unavailable-match runtime regressions',
    workerUnavailableMatchTests,
    [
      'expiredBeforeLoad: true',
      "message: 'match ended or cannot be found.'",
      "code: 1005, reason: ''",
      "it('preserves the source unavailable-match spectator error and empty close'",
      "message: 'match ended or cannot be found.'",
      "code: 1005, reason: ''"
    ]
  )
  const workerSameSocketSpectatorTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves the source same-socket spectator replacement close'",
    "it('replaces only the prior joined spectator"
  )
  requireOrdered(
    errors,
    'Worker same-socket spectator runtime regression',
    workerSameSocketSpectatorTest,
    [
      "level: 'user'",
      "message: 'connected in another location'",
      "code: 1005, reason: ''"
    ]
  )
  const workerSameSocketPlayerTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves the source same-socket player replacement rejoin'",
    "it('replaces only the prior joined spectator"
  )
  requireOrdered(
    errors,
    'Worker same-socket player runtime regression',
    workerSameSocketPlayerTest,
    [
      "level: 'server'",
      "message: 'You connected in another session, please play there.'",
      "type: 'reconnect'",
      "type: 'timesync'",
      'expect(first.readyState).toBe(WebSocket.OPEN)'
    ]
  )
  const workerParticipantSpectatorTest = bodyBetween(
    workerRuntimeTest,
    "it('lets a participant spectate the opponent without leaking player-only messages'",
    "it('replaces only the prior joined spectator"
  )
  requireOrdered(
    errors,
    'Worker participant spectator runtime regression',
    workerParticipantSpectatorTest,
    [
      'const viewer = await connectAs(PRINCIPAL_1, USER_ID_1)',
      'spectate(viewer, `identity:${USER_ID_2}`)',
      "type: 'mute_opponent', muted: true",
      'expect(mutedMessages).toEqual([])',
      "type: 'rewards', data: []",
      'expect(leaked).toEqual([])',
      "type: 'timesync', clientTime: 7654"
    ]
  )
  const workerSpectatorLimitTest = bodyBetween(
    workerRuntimeTest,
    "it('preserves the source joined-spectator limit error and empty close'",
    "it('preserves the source client time-sync-before-join handshake'"
  )
  requireOrdered(
    errors,
    'Worker spectator admission runtime regressions',
    workerSpectatorLimitTest,
    [
      'expect(serverSockets).toHaveLength(50)',
      'attachment.joined = true',
      "message: 'too many spectators'",
      'code: 1005,',
      "it('bounds pending spectator sockets above the source joined limit'",
      'index < 64',
      'expect(overflow.status).toBe(429)',
      'const duplicateOverflow = await SELF.fetch(',
      'expect(duplicateOverflow.status).toBe(429)'
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
    readFile(path.join(root, 'server/src/Server.ts'), 'utf8'),
    readFile(path.join(root, 'server/src/utils/config.ts'), 'utf8'),
    readFile(path.join(root, 'server/src/core/MatchManager.ts'), 'utf8'),
    readFile(
      path.join(root, 'server/src/worker/match/MatchHandler.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'server/src/core/MatchProxy.ts'), 'utf8'),
    readFile(path.join(root, 'server/src/PlayerContext.ts'), 'utf8'),
    readFile(path.join(root, 'game/src/state/net/WebSocketClient.ts'), 'utf8'),
    readFile(path.join(root, 'game-server-cloudflare/src/protocol.ts'), 'utf8'),
    readFile(
      path.join(root, 'game-server-cloudflare/src/game-match.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/src/runtime-settings.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/test/protocol.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/test/runtime-settings.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare/test-cloudflare/game-match.test.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/wrangler.jsonc'),
      'utf8'
    ).then(JSON.parse),
    readFile(
      path.join(root, 'game-server-cloudflare/wrangler.test.jsonc'),
      'utf8'
    ).then(JSON.parse),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = gameIngressErrors({
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
  })
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare game ingress preserves source text/binary frames, PING, decode errors, and configurable chat/emote behavior'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
