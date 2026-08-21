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

export const matchmakerSessionErrors = (
  sourceHandler,
  sourceAcceptHandler,
  sourceDeclineHandler,
  sourceNotifier,
  sourceFactory,
  sourceBrowserClient,
  sourceBrowserSocket,
  sourceWebsocketHandler,
  sourceClientConnection,
  sourceMessageReceiver,
  sourceConfig,
  sourceComposeConfig,
  worker,
  workerWrangler,
  workerTestWrangler,
  workerRuntimeTest,
  rootPackage
) => {
  const errors = []

  const sourceHandle = bodyBetween(
    sourceHandler,
    'func (h *Handler) Handle(',
    '//go:generate'
  )
  requireOrdered(errors, 'Source find-match channel lifecycle', sourceHandle, [
    'if client.HasChannel() {',
    'return nil',
    'h.playerFactory.Create(ctx, msg)',
    'client.SetPlayer(p)',
    'for i := 0; i < len(h.validators); i++ {',
    'if !isValid {',
    'h.mu.Lock()',
    'h.notifier.Message(ctx, mmerrors.ErrDuplicateConnection, p)',
    'h.matchFinder.FindMatch(ctx, p)',
    'client.SetChannel(channel)',
    'go h.eventListener.Listen(ctx, client)'
  ])
  if (sourceHandle.includes('client.Close()')) {
    errors.push('Source duplicate notification became a server-side close')
  }

  for (const [label, source] of [
    ['accept', sourceAcceptHandler],
    ['decline', sourceDeclineHandler]
  ]) {
    const sourceCommand = bodyBetween(
      source,
      'func (h *Handler) Handle(',
      '//go:generate'
    )
    requireOrdered(errors, `Source ${label} channel authority`, sourceCommand, [
      'if !client.HasChannel() {',
      'return mmerrors.ErrMissingChannel',
      'if !client.HasPlayer() {'
    ])
  }

  const sourcePublish = bodyBetween(
    sourceNotifier,
    'func (n *Notifier) Message(',
    'func (n *Notifier) NumberOfSubscribers('
  )
  if (!sourcePublish.includes('n.pubsub.Publish(ctx, channelID, message)')) {
    errors.push('Source duplicate notification is no longer pubsub delivery')
  }

  const sourceSubscribe = bodyBetween(
    sourceFactory,
    'func (f *Factory) Create(',
    'func (f *Factory) onClose('
  )
  requireOrdered(
    errors,
    'Source player-channel subscription',
    sourceSubscribe,
    [
      'f.pubsub.Subscribe(ctx, channelID)',
      'channel := New(subscriber, p)',
      'channel.SetCloseHandler('
    ]
  )
  const sourceClose = bodyBetween(
    sourceFactory,
    'func (f *Factory) onClose(',
    'type ChannelCloser interface'
  )
  requireOrdered(errors, 'Source last-subscriber cleanup', sourceClose, [
    'channel.Close()',
    'f.pubsub.NumSubscribers(channel.ChannelID())',
    'if nsubs > 0 {',
    'return nil',
    'for _, closer := range f.channelClosers {'
  ])

  const browserError = bodyBetween(
    sourceBrowserClient,
    "case 'error': {",
    'default:'
  )
  requireOrdered(errors, 'Source browser duplicate close', browserError, [
    "data.reason === 'DUPLICATE_CONNECTION'",
    '? WEBSOCKET_FORCED_CLOSE_CODE',
    'this.ws.manual_disconnect(code)'
  ])

  const sourceWebsocketConstructor = bodyBetween(
    sourceWebsocketHandler,
    'func NewWebsocketHandler(',
    'func (h *websocketHandler) Run('
  )
  if (
    !sourceWebsocketConstructor.includes(
      'authenticationTimeout: cfg.MatchMaker.AuthenticationTimeout'
    )
  ) {
    errors.push('Source websocket authentication timeout is not config-backed')
  }
  const sourceWebsocketSession = bodyBetween(
    sourceWebsocketHandler,
    'func (h *websocketHandler) Handle(',
    'func (h *websocketHandler) listenOnMessage('
  )
  requireOrdered(
    errors,
    'Source websocket authentication deadline',
    sourceWebsocketSession,
    [
      'ticker := time.NewTicker(h.authenticationTimeout)',
      'case <-ticker.C:',
      'if !client.HasChannel() {',
      'ticker.Stop()',
      'return nil'
    ]
  )
  const sourceAuthenticationTimeout = bodyBetween(
    sourceWebsocketSession,
    'case <-ticker.C:',
    'case <-client.Done():'
  )
  if (sourceAuthenticationTimeout.includes('SendErrorMessage')) {
    errors.push('Source authentication timeout now sends an application error')
  }
  requireOrdered(errors, 'Source authentication timeout config', sourceConfig, [
    'AuthenticationTimeoutSeconds float32',
    'if cfg.MatchMaker.AuthenticationTimeoutSeconds <= 0 {',
    'cfg.MatchMaker.AuthenticationTimeoutSeconds = 5.0',
    'cfg.MatchMaker.AuthenticationTimeout = secondsToDuration(cfg.MatchMaker.AuthenticationTimeoutSeconds)'
  ])
  if (
    !/^\s*authentication_timeout_seconds\s*=\s*10\.0\s*$/m.test(
      sourceComposeConfig
    )
  ) {
    errors.push(
      'Checked-in source matchmaker configuration no longer pins a 10-second authentication timeout'
    )
  }

  const sourceReadJSON = bodyBetween(
    sourceClientConnection,
    'func (c *clientConn) ReadJSON(',
    'func (c *clientConn) WriteJSON('
  )
  if (!sourceClientConnection.includes('readTimeout = time.Second * 120')) {
    errors.push('Source websocket read timeout is no longer 120 seconds')
  }
  requireOrdered(errors, 'Source websocket read deadline', sourceReadJSON, [
    'c.ws.SetReadDeadline(time.Now().Add(readTimeout))',
    'c.ws.ReadMessage()'
  ])
  const sourceReceive = bodyBetween(
    sourceMessageReceiver,
    'func (r *messageReceiver) Receive(',
    'type timeouter interface'
  )
  const sourceIdleTimeout = bodyBetween(
    sourceReceive,
    'if t, ok := err.(timeouter); ok && t.Timeout() {',
    'if websocket.IsUnexpectedCloseError('
  )
  requireOrdered(errors, 'Source idle read-timeout close', sourceIdleTimeout, [
    'if t, ok := err.(timeouter); ok && t.Timeout() {',
    'return nil, messages.EmptyMessageType, client.Close()'
  ])
  if (!/^const KEEPALIVE_INTERVAL = 3000$/m.test(sourceBrowserSocket)) {
    errors.push('Source browser matchmaker heartbeat is no longer 3 seconds')
  }
  requireOrdered(
    errors,
    'Source browser matchmaker heartbeat',
    sourceBrowserSocket,
    [
      'this.keepaliveInterval = setInterval(',
      "this.conn.send('PING')",
      'KEEPALIVE_INTERVAL'
    ]
  )

  if (!worker.includes('AUTHENTICATION_TIMEOUT_MS?: string')) {
    errors.push(
      'Worker authentication timeout environment authority is missing'
    )
  }
  const workerConfig = bodyBetween(
    worker,
    'const readConfig = (env: MatchmakerEnv): RuntimeConfig => {',
    'const serializePlayer = ('
  )
  requireOrdered(errors, 'Worker authentication timeout config', workerConfig, [
    'authenticationTimeoutMs: parsePositiveInteger(',
    'env.AUTHENTICATION_TIMEOUT_MS,',
    '10_000,',
    '120_000'
  ])
  for (const [label, wrangler] of [
    ['production', workerWrangler],
    ['test', workerTestWrangler]
  ]) {
    if (!/^\s*"AUTHENTICATION_TIMEOUT_MS":\s*"10000",?\s*$/m.test(wrangler)) {
      errors.push(
        `Worker ${label} configuration does not pin the source 10-second authentication timeout`
      )
    }
  }

  const workerConnect = bodyBetween(
    worker,
    'async fetch(request: Request)',
    'async webSocketMessage('
  )
  for (const forbidden of [
    "errorMessage('DUPLICATE_CONNECTION')",
    "close(4001, 'Duplicate connection')",
    'previousSockets'
  ]) {
    if (workerConnect.includes(forbidden)) {
      errors.push(`Worker socket connect must not perform: ${forbidden}`)
    }
  }
  requireOrdered(
    errors,
    'Worker hibernation-safe authentication deadline',
    workerConnect,
    [
      'this.state.acceptWebSocket(server, [attachment.principal])',
      'await this.scheduleAlarmAt(',
      'attachment.connectedAtMs + this.config.authenticationTimeoutMs'
    ]
  )

  const workerAlarm = bodyBetween(
    worker,
    'async alarm() {',
    'private attachmentFromRequest('
  )
  requireOrdered(errors, 'Worker alarm authentication cleanup', workerAlarm, [
    'const now = Date.now()',
    'this.expireUnauthenticatedSockets(now)',
    'this.expireIdleSockets(now)',
    'await this.processProposalTimers(now)',
    'await this.attemptMatches(now)',
    'await this.rescheduleAlarm(now)'
  ])

  const workerAttachment = bodyBetween(
    worker,
    'private attachmentFromRequest(',
    'private async findMatch('
  )
  if (!workerAttachment.includes('subscribed: false')) {
    errors.push('Worker new socket is not explicitly unsubscribed')
  }
  if (!worker.includes('MATCHMAKER_READ_TIMEOUT_MS = 120_000')) {
    errors.push('Worker websocket read timeout does not match the source')
  }
  const workerSocketAttachment = bodyBetween(
    worker,
    'interface SocketAttachment {',
    'interface StoredPlayer'
  )
  if (!workerSocketAttachment.includes('lastMessageAtMs?: number')) {
    errors.push('Worker hibernating socket has no rolling-safe read timestamp')
  }
  if (!workerAttachment.includes('lastMessageAtMs: Date.now()')) {
    errors.push('Worker new socket has no initial read timestamp')
  }

  const workerMessages = bodyBetween(
    worker,
    'async webSocketMessage(',
    'async webSocketClose('
  )
  requireOrdered(
    errors,
    'Worker received-message deadline reset',
    workerMessages,
    [
      'attachment.lastMessageAtMs = Date.now()',
      'webSocket.serializeAttachment(attachment)',
      'command = parseClientCommand(raw)'
    ]
  )
  for (const [command, handler] of [
    ['accept_match', 'this.acceptMatch(attachment.principal)'],
    ['decline_match', 'this.declineMatch(attachment.principal)']
  ]) {
    const commandBody = bodyBetween(
      workerMessages,
      `case '${command}':`,
      command === 'accept_match' ? "case 'decline_match':" : '\n      }'
    )
    requireOrdered(errors, `Worker ${command} channel authority`, commandBody, [
      'if (attachment.subscribed === false) {',
      "'SERVER_ERROR'",
      "'player channel is missing'",
      handler
    ])
  }

  const workerFind = bodyBetween(
    worker,
    'private async findMatch(',
    'private async loadPlayerProfile('
  )
  requireOrdered(errors, 'Worker find-match channel lifecycle', workerFind, [
    'if (attachment.subscribed) return',
    'command.versionHash !== this.config.expectedReleaseVersion',
    'normalizePrivateSeedForIdentity(',
    'validateGameModeDataConsistency(command)',
    'this.captcha.validate(',
    'this.loadPlayerProfile(',
    'pendingProposalId',
    'this.penalties.getPenaltyMs(',
    'profile.conquest.deckClass !== prismsToDeckClass(prisms)',
    'this.notifyDuplicateSubscribers(webSocket, attachment.principal)',
    'attachment.subscribed = true',
    'webSocket.serializeAttachment(attachment)',
    'this.state.storage.put(ticketKey(attachment.principal), ticket)'
  ])
  for (const directType of [
    "type: 'match_made'",
    "type: 'match_refusal_cooldown'"
  ]) {
    const typeIndex = workerFind.indexOf(directType)
    const preceding = workerFind.slice(Math.max(0, typeIndex - 80), typeIndex)
    if (typeIndex < 0 || !preceding.includes('this.safeSend(webSocket')) {
      errors.push(
        `Worker pre-subscription response is not socket-scoped: ${directType}`
      )
    }
  }

  const workerDuplicate = bodyBetween(
    worker,
    'private notifyDuplicateSubscribers(',
    'private isSubscribedSocket('
  )
  requireOrdered(
    errors,
    'Worker duplicate subscriber notification',
    workerDuplicate,
    [
      'this.state.getWebSockets(principal)',
      'socket === current || !this.isSubscribedSocket(socket)',
      "this.safeSend(socket, errorMessage('DUPLICATE_CONNECTION'))"
    ]
  )
  if (
    workerDuplicate.includes('.close(') ||
    workerDuplicate.includes('subscribed = false')
  ) {
    errors.push(
      'Worker duplicate notification closes or detaches the old subscriber'
    )
  }

  const workerPublish = bodyBetween(
    worker,
    'private sendToPrincipal(',
    'private notifyDuplicateSubscribers('
  )
  if (
    !workerPublish.includes(
      '.filter(socket => this.isSubscribedSocket(socket))'
    )
  ) {
    errors.push(
      'Worker pubsub messages are not limited to established channels'
    )
  }

  const workerSubscription = bodyBetween(
    worker,
    'private isSubscribedSocket(',
    'private safeSend('
  )
  if (!workerSubscription.includes('attachment.subscribed !== false')) {
    errors.push('Worker rolling-upgrade subscription compatibility is missing')
  }

  const workerHasSubscriber = bodyBetween(
    worker,
    'private hasSubscribedSocket(',
    'private async cleanupSocket('
  )
  requireOrdered(errors, 'Worker live-subscriber query', workerHasSubscriber, [
    'socket.readyState === WebSocket.OPEN',
    'this.isSubscribedSocket(socket)'
  ])
  const workerCleanup = bodyBetween(
    worker,
    'private async cleanupSocket(',
    '\n  }\n}'
  )
  if (
    !workerCleanup.includes(
      'if (this.hasSubscribedSocket(attachment.principal)) return'
    )
  ) {
    errors.push('Worker cleanup can be preserved by an unsubscribed socket')
  }

  const workerReschedule = bodyBetween(
    worker,
    'private async rescheduleAlarm(',
    'private async scheduleAlarmAt('
  )
  requireOrdered(
    errors,
    'Worker pending-socket alarm rescheduling',
    workerReschedule,
    [
      'for (const socket of this.state.getWebSockets()) {',
      'socket.readyState !== WebSocket.OPEN || !attachment',
      'if (attachment.subscribed === false) {',
      'attachment.connectedAtMs + this.config.authenticationTimeoutMs'
    ]
  )
  requireOrdered(
    errors,
    'Worker established-socket read deadline rescheduling',
    workerReschedule,
    [
      'if (attachment.subscribed === false) {',
      'continue',
      'this.socketLastMessageAtMs(socket, attachment, now)',
      'MATCHMAKER_READ_TIMEOUT_MS'
    ]
  )
  const workerAlarmSchedule = bodyBetween(
    worker,
    'private async scheduleAlarmAt(',
    'private expireUnauthenticatedSockets('
  )
  requireOrdered(
    errors,
    'Worker earlier-alarm preservation',
    workerAlarmSchedule,
    [
      'this.state.storage.transaction(',
      'const current = await transaction.getAlarm()',
      'if (current === null || deadline < current) {',
      'await transaction.setAlarm(deadline)'
    ]
  )
  const workerAuthenticationExpiry = bodyBetween(
    worker,
    'private expireUnauthenticatedSockets(',
    'private expireIdleSockets('
  )
  requireOrdered(
    errors,
    'Worker authentication-timeout eligibility',
    workerAuthenticationExpiry,
    [
      'socket.readyState !== WebSocket.OPEN',
      'attachment?.subscribed !== false',
      'attachment.connectedAtMs + this.config.authenticationTimeoutMs > now',
      'socket.close()'
    ]
  )
  if (
    workerAuthenticationExpiry.includes('safeSend(') ||
    workerAuthenticationExpiry.includes('errorMessage(') ||
    !/socket\.close\(\s*\)/.test(workerAuthenticationExpiry)
  ) {
    errors.push(
      'Worker authentication timeout invents an application error or close payload'
    )
  }

  const workerIdleExpiry = bodyBetween(
    worker,
    'private expireIdleSockets(',
    'private socketLastMessageAtMs('
  )
  requireOrdered(
    errors,
    'Worker source read-timeout eligibility',
    workerIdleExpiry,
    [
      'socket.readyState !== WebSocket.OPEN',
      'attachment.subscribed === false',
      'this.socketLastMessageAtMs(',
      'lastMessageAtMs + MATCHMAKER_READ_TIMEOUT_MS > now',
      'socket.close()'
    ]
  )
  if (
    workerIdleExpiry.includes('safeSend(') ||
    workerIdleExpiry.includes('errorMessage(') ||
    !/socket\.close\(\s*\)/.test(workerIdleExpiry)
  ) {
    errors.push(
      'Worker read timeout invents an application error or close payload'
    )
  }
  const workerReadUpgrade = bodyBetween(
    worker,
    'private socketLastMessageAtMs(',
    'private async proposalForPrincipal('
  )
  requireOrdered(
    errors,
    'Worker legacy read-timeout upgrade',
    workerReadUpgrade,
    [
      'const lastMessageAtMs = attachment.lastMessageAtMs',
      'Number.isSafeInteger(lastMessageAtMs)',
      'lastMessageAtMs <= now',
      'attachment.lastMessageAtMs = now',
      'socket.serializeAttachment(attachment)',
      'return now'
    ]
  )
  for (const title of [
    'silently closes an established channel after the source read timeout',
    'resets the source read timeout when the browser sends PING',
    'gives a legacy established attachment one bounded read window'
  ]) {
    if (!workerRuntimeTest.includes(title)) {
      errors.push(`Worker read-timeout regression is missing: ${title}`)
    }
  }
  if (!workerRuntimeTest.includes('.toEqual([0, 0])')) {
    errors.push('Worker read-timeout cleanup regression is missing')
  }

  const scripts = rootPackage?.scripts ?? {}
  if (
    !String(scripts['build:cloudflare'] ?? '').includes(
      'pnpm check:cloudflare:matchmaker-session'
    )
  ) {
    errors.push('Complete Cloudflare build omits the matchmaker session gate')
  }
  if (
    !String(scripts['deploy:cloudflare:matchmaker'] ?? '').includes(
      'pnpm check:cloudflare:matchmaker-session'
    )
  ) {
    errors.push('Matchmaker deployment omits the session source gate')
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceNotifier,
    sourceFactory,
    sourceBrowserClient,
    sourceBrowserSocket,
    sourceWebsocketHandler,
    sourceClientConnection,
    sourceMessageReceiver,
    sourceConfig,
    sourceComposeConfig,
    worker,
    workerWrangler,
    workerTestWrangler,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile(
      path.join(root, 'matchmaker/lib/frontend/findmatch/handler.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/acceptmatch/handler.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/declinematch/handler.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/playerchannel/notifier.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/playerchannel/factory.go'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/clients/MatchMakerClient/MatchMakerClient.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/src/clients/WebsocketClient.ts'), 'utf8'),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/websocket_handler.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/client_connection.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/message_receiver.go'),
      'utf8'
    ),
    readFile(path.join(root, 'matchmaker/config/config.go'), 'utf8'),
    readFile(path.join(root, 'matchmaker/etc/matchmaker.compose.conf'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts/src/runtime.ts'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts/wrangler.jsonc'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts/wrangler.test.jsonc'), 'utf8'),
    readFile(
      path.join(root, 'matchmaker-ts/test-cloudflare/runtime.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = matchmakerSessionErrors(
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceNotifier,
    sourceFactory,
    sourceBrowserClient,
    sourceBrowserSocket,
    sourceWebsocketHandler,
    sourceClientConnection,
    sourceMessageReceiver,
    sourceConfig,
    sourceComposeConfig,
    worker,
    workerWrangler,
    workerTestWrangler,
    workerRuntimeTest,
    rootPackage
  )
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker session lifecycle matches the source subscriber, authentication-timeout, and read-timeout contracts'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
