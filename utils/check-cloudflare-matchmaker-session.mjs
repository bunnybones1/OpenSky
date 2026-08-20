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
  worker,
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

  const workerAttachment = bodyBetween(
    worker,
    'private attachmentFromRequest(',
    'private async findMatch('
  )
  if (!workerAttachment.includes('subscribed: false')) {
    errors.push('Worker new socket is not explicitly unsubscribed')
  }

  const workerMessages = bodyBetween(
    worker,
    'async webSocketMessage(',
    'async webSocketClose('
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
    worker,
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
    readFile(path.join(root, 'matchmaker-ts/src/runtime.ts'), 'utf8'),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = matchmakerSessionErrors(
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceNotifier,
    sourceFactory,
    sourceBrowserClient,
    worker,
    rootPackage
  )
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker session lifecycle matches the source subscriber contract'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
