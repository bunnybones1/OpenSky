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
  sourcePendingMatchValidator,
  sourceIPAddressValidator,
  sourceApp,
  sourceFrontendService,
  sourceAcceptTimeouter,
  sourceDecliner,
  sourceMatchProposalRepository,
  sourceQueryService,
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

  const sourcePendingMatch = bodyBetween(
    sourcePendingMatchValidator,
    'func (v *PendingMatchValidator) IsValid(',
    '//go:generate'
  )
  requireOrdered(
    errors,
    'Source independent pending-match validator',
    sourcePendingMatch,
    [
      'v.pendingMatchChecker.HasMatchProposal(client.Player().Address())',
      'if has {',
      'return false, fmt.Errorf("there is pending match already")',
      'return true, nil'
    ]
  )
  if (sourcePendingMatch.includes('.Load(')) {
    errors.push('Source pending-match validator now depends on proposal state')
  }

  const sourceIPAddress = sourceIPAddressValidator
  requireOrdered(
    errors,
    'Source empty-IP admission validator',
    sourceIPAddress,
    [
      'if v.allowSameIPMatch {',
      'return true, nil',
      'if len(client.Player().IPAddress) == 0 {',
      'return false, nil',
      'return true, nil'
    ]
  )
  const sourceFindSetup = bodyBetween(
    sourceApp,
    'findMatchHandler := findmatch.NewHandler(',
    'websocketHandler := frontend.NewWebsocketHandler('
  )
  requireOrdered(errors, 'Source find-match admission order', sourceFindSetup, [
    'validators.NewVersionValidator(cfg)',
    'validators.NewIPAddressValidatorValidator(cfg)',
    'validators.NewAuthValidator(cfg)',
    'validators.NewCaptchaValidator('
  ])
  const sourceValidationLoop = bodyBetween(
    sourceHandle,
    'for i := 0; i < len(h.validators); i++ {',
    'h.mu.Lock()'
  )
  requireOrdered(
    errors,
    'Source silent validator rejection',
    sourceValidationLoop,
    ['if !isValid {', 'return nil']
  )

  const sourceAcceptMatch = bodyBetween(
    sourceFrontendService,
    'func (s *FrontendService) AcceptMatch(',
    'func (s *FrontendService) DeclineMatch('
  )
  requireOrdered(
    errors,
    'Source expired-accept player notification',
    sourceAcceptMatch,
    [
      'if !p.HasMatchProposalID() {',
      's.matchProposalRepository.Load(p.GetMatchProposalID())',
      'if matchProposal == nil || *matchProposal.Timeout() < 0 {',
      's.notifier.Message(ctx, events.EventTimeOutMessage{}, p)',
      'return fmt.Errorf("match timed out: %w", errors.ErrInvalidOperation)',
      'if matchProposal.HasAccepted(p.Address()) {'
    ]
  )
  if (
    sourceAcceptMatch.includes('matchProposalRepository.Delete(') ||
    sourceAcceptMatch.includes('SetAcceptTimeoutPenalty(')
  ) {
    errors.push('Source accept command now owns shared proposal expiration')
  }

  const sourceAcceptanceTimeout = bodyBetween(
    sourceAcceptTimeouter,
    'func (t *acceptTimeouter) checkAcceptanceTimeout(',
    '//go:generate'
  )
  requireOrdered(
    errors,
    'Source shared proposal timeout authority',
    sourceAcceptanceTimeout,
    [
      'if err := t.matchProposalRepository.Delete(matchProposal); err != nil {',
      'for _, address := range matchProposal.Addresses() {',
      'playerStatus := player.PlayerStatus_MATCH_TIMED_OUT',
      'if matchProposal.HasAccepted(address) {',
      'playerStatus = player.PlayerStatus_MATCH_ABORTED',
      't.notifier.Message(context.Background(), events.EventTimeOutMessage{}, p)',
      'if p.IsChallengeMatch() {',
      'if matchProposal.HasAccepted(address) {',
      't.acceptTimeoutPenaltySetter.SetAcceptTimeoutPenalty(p)'
    ]
  )

  const sourceDeclineMatch = bodyBetween(
    sourceDecliner,
    'func (d *decliner) DeclineMatch(',
    '//go:generate'
  )
  requireOrdered(
    errors,
    'Source status-independent pending-match decline behavior',
    sourceDeclineMatch,
    [
      'd.playerRepository.Load(address)',
      'd.playerQueue.Remove(p)',
      'd.matchProposalRepository.HasMatchProposal(p.Address())',
      'if !hasMatchProposal {',
      'return nil',
      'if p.IsConquestMatch() {',
      'd.matchProposalRepository.Locker(p.GetMatchProposalID())',
      'd.matchProposalRepository.Load(p.GetMatchProposalID())',
      'if matchProposal == nil {',
      'declineMessage := events.EventDeclinedMessage{',
      'd.notifier.Message(ctx, declineMessage, players...)',
      'd.matchProposalRepository.Delete(matchProposal)',
      'if p.IsChallengeMatch() {',
      'd.refusalPenaltySetter.SetRefusalPenalty(p)'
    ]
  )
  for (const forbidden of [
    'matchProposal.IsFound()',
    'matchProposal.IsAccepted()',
    'matchProposal.IsToBeMade()'
  ]) {
    if (sourceDeclineMatch.includes(forbidden)) {
      errors.push(`Source decline became proposal-status gated: ${forbidden}`)
    }
  }
  const sourceHasMatchProposal = bodyBetween(
    sourceMatchProposalRepository,
    'func (r *matchProposalRepository) HasMatchProposal(',
    'func (r *matchProposalRepository) pendingMatchStoreID('
  )
  requireOrdered(
    errors,
    'Source expired pending-match authority',
    sourceHasMatchProposal,
    [
      'r.keyValStore.TTL(r.pendingMatchStoreID(address))',
      'if ttl < 0 || errors.Is(err, store.ErrNoSuchItem) {',
      'return false, nil'
    ]
  )
  const sourceProposalSave = bodyBetween(
    sourceMatchProposalRepository,
    'func (r *matchProposalRepository) Save(',
    'func (r *matchProposalRepository) pushToQueue('
  )
  requireOrdered(
    errors,
    'Source independent pending-match storage',
    sourceProposalSave,
    [
      'if proposal.IsFound() {',
      'for _, address := range proposal.Addresses() {',
      'r.HasMatchProposal(address)',
      'if has {',
      'r.keyValStore.StoreTTL(r.pendingMatchStoreID(address), proposal.ID(), *proposal.Timeout())'
    ]
  )

  const sourceSubscriberRepair = bodyBetween(
    sourceQueryService,
    'nsubs, err := s.notifier.NumberOfSubscribers(p)',
    'players = append(players, p)'
  )
  requireOrdered(
    errors,
    'Source orphaned queue repair',
    sourceSubscriberRepair,
    [
      'nsubs, err := s.notifier.NumberOfSubscribers(p)',
      'if err != nil {',
      'return nil, fmt.Errorf("get number of subscribers: %w", err)',
      'if nsubs == 0 {',
      's.playerQueue.Remove(p)',
      'continue'
    ]
  )

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
  requireOrdered(
    errors,
    'Source command failure outer lifecycle',
    sourceWebsocketSession,
    [
      'if err := h.listenOnMessage(ctx, client); err != nil {',
      'if !errors.As(err, &closeErr) {',
      'h.messageSender.SendErrorMessage(client, *mmerrors.ErrServerError)',
      'client.Close()',
      'return nil'
    ]
  )
  const sourceWebsocketListen = bodyBetween(
    sourceWebsocketHandler,
    'func (h *websocketHandler) listenOnMessage(',
    'func (h *websocketHandler) addClient('
  )
  for (const [label, start, end, handler, failure] of [
    [
      'find',
      'case messages.FindMatchType:',
      'case messages.AcceptMatchType:',
      'h.findMatchHandler.Handle(ctx, client, findMatchMessage)',
      'return fmt.Errorf("handle find match: %w", err)'
    ],
    [
      'accept',
      'case messages.AcceptMatchType:',
      'case messages.DeclineMatchType:',
      'h.acceptMatchHandler.Handle(ctx, client)',
      'return fmt.Errorf("handle accept match: %w", err)'
    ]
  ]) {
    const sourceCommand = bodyBetween(sourceWebsocketListen, start, end)
    requireOrdered(
      errors,
      `Source ${label}-match fatal handler error`,
      sourceCommand,
      [handler, failure]
    )
    if (sourceCommand.includes('SendErrorMessage')) {
      errors.push(`Source ${label}-match handler error became nonfatal`)
    }
  }
  const sourceDeclineCommand = bodyBetween(
    sourceWebsocketListen,
    'case messages.DeclineMatchType:',
    'default:'
  )
  requireOrdered(
    errors,
    'Source decline-match invalid-operation exception',
    sourceDeclineCommand,
    [
      'h.declineMatchHandler.Handle(ctx, client)',
      'errors.Is(err, mmerrors.ErrInvalidOperation)',
      'h.messageSender.SendErrorMessage(client, *mmerrors.ErrInvalidOperation)',
      '} else {',
      'return fmt.Errorf("handle decline match: %w", err)'
    ]
  )
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
      "throw new Error('player channel is missing')",
      handler
    ])
  }
  const workerCommandFailure = bodyBetween(
    workerMessages,
    '// Source websocket_handler.go exposes only decline',
    'private failMalformedClientMessage('
  )
  requireOrdered(
    errors,
    'Worker source command failure lifecycle',
    workerCommandFailure,
    [
      "command.type === 'decline_match'",
      'error instanceof ProtocolError',
      "error.reason === 'INVALID_OPERATION'",
      "this.safeSend(webSocket, errorMessage('INVALID_OPERATION'))",
      'return',
      "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))",
      'webSocket.close()'
    ]
  )
  if (workerCommandFailure.includes('errorMessage(error.reason')) {
    errors.push('Worker command failure leaks arbitrary handler details')
  }

  const workerFind = bodyBetween(
    worker,
    'private async findMatch(',
    'private async loadPlayerProfile('
  )
  requireOrdered(errors, 'Worker find-match channel lifecycle', workerFind, [
    'if (attachment.subscribed) return',
    'command.versionHash !== this.config.expectedReleaseVersion',
    '!this.config.allowSameIpMatch &&',
    'attachment.clientIp.length === 0',
    'return',
    'normalizePrivateSeedForIdentity(',
    'validateGameModeDataConsistency(command)',
    'this.captcha.validate(',
    'this.loadPlayerProfile(',
    'profile.conquest.deckClass !== prismsToDeckClass(prisms)',
    'validateOwnedDeckForAdmission(',
    'if (!profile.gameModeEnabled)',
    'if (profile.activeMatch)',
    'this.pendingProposalReference(',
    'this.penalties.getPenaltyMs(',
    'this.notifyDuplicateSubscribers(webSocket, attachment.principal)',
    'attachment.subscribed = true',
    'webSocket.serializeAttachment(attachment)',
    'this.putTicketAndArmFindWindow(ticket, Date.now())'
  ])
  for (const [label, wrangler] of [
    ['production', workerWrangler],
    ['test', workerTestWrangler]
  ]) {
    if (!/^\s*"ALLOW_SAME_IP_MATCH":\s*"false",?\s*$/m.test(wrangler)) {
      errors.push(
        `Worker ${label} configuration no longer activates the source empty-IP validator`
      )
    }
  }
  requireOrdered(
    errors,
    'Worker independent pending-match validation',
    workerFind,
    [
      'const pendingProposal = await this.pendingProposalReference(',
      'proposalKey(pendingProposal.proposalId)',
      'pendingProposal.expiresAtMs ?? proposal?.expiresAtMs',
      'pendingExpiresAtMs >= now',
      "throw new ProtocolError('SERVER_ERROR', 'pending match already exists')",
      'await this.state.storage.delete(pendingKey(attachment.principal))',
      "proposal?.status === 'FOUND' && proposal.expiresAtMs <= now",
      'await this.expireProposal(proposal)'
    ]
  )
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

  const workerAccept = bodyBetween(
    worker,
    'private async acceptMatch(',
    'private async recordAcceptance('
  )
  requireOrdered(errors, 'Worker accept-match error identity', workerAccept, [
    'const pendingProposal = await this.pendingProposalReference(principal)',
    'if (!pendingProposal) {',
    "'INVALID_OPERATION'",
    'this.state.storage.get<StoredProposal>(',
    'proposalKey(pendingProposal.proposalId)',
    'if (!proposal || proposal.expiresAtMs < Date.now()) {',
    "this.sendToPrincipal(principal, { type: 'timed_out' })",
    "'match proposal timed out'",
    'if (proposal.accepted.includes(principal)) return',
    "proposal.status !== 'FOUND'",
    "'INVALID_OPERATION'"
  ])
  if (
    workerAccept.includes('this.expireProposal(') ||
    workerAccept.includes('errorMessage(')
  ) {
    errors.push(
      'Worker accept command owns shared expiration or bypasses the fatal outer handler'
    )
  }

  const workerPendingStorage = bodyBetween(
    worker,
    'interface StoredPendingProposal {',
    'interface RuntimeConfig {'
  )
  requireOrdered(
    errors,
    'Worker pending-match storage shape',
    workerPendingStorage,
    [
      'proposalId: string',
      'expiresAtMs: number',
      'interface PendingProposalReference {',
      'proposalId: string',
      'expiresAtMs?: number'
    ]
  )
  const workerCreateProposal = bodyBetween(
    worker,
    'private async createProposal(',
    'private async processProposalTimers('
  )
  requireOrdered(errors, 'Worker pending-match write', workerCreateProposal, [
    'writes[pendingKey(principal)] = {',
    'proposalId: proposal.id',
    'expiresAtMs: proposal.expiresAtMs',
    '} satisfies StoredPendingProposal'
  ])
  const workerPendingReference = bodyBetween(
    worker,
    'private async pendingProposalReference(',
    'private async deleteProposal('
  )
  requireOrdered(
    errors,
    'Worker pending-match rolling decoder',
    workerPendingReference,
    [
      'this.state.storage.get<unknown>(pendingKey(principal))',
      "typeof stored === 'string' && stored.length > 0",
      'return { proposalId: stored }',
      'isRecord(stored)',
      "typeof stored.proposalId === 'string'",
      'Number.isSafeInteger(stored.expiresAtMs)',
      'return stored as unknown as StoredPendingProposal',
      "throw new Error('invalid pending match reference')"
    ]
  )

  const workerDecline = bodyBetween(
    worker,
    'private async declineMatch(',
    'private async attemptMatchFindWindow('
  )
  requireOrdered(errors, 'Worker source decline lifecycle', workerDecline, [
    'await this.state.storage.delete(ticketKey(principal))',
    'const proposal = await this.proposalForPrincipal(principal)',
    'if (!proposal || proposal.expiresAtMs < Date.now()) return',
    'isConquestMatch(deserializePlayer(player.player))',
    'throw new ProtocolError(',
    "'INVALID_OPERATION'",
    "'conquest cannot be declined'",
    "type: 'decline_match'",
    'await this.deleteProposal(proposal)',
    'this.penalties.setRefusalPenalty(',
    'await this.rescheduleAlarm(Date.now())'
  ])
  if (workerDecline.includes('proposal.status')) {
    errors.push('Worker decline is still restricted by proposal status')
  }
  if (workerDecline.includes("errorMessage('INVALID_OPERATION')")) {
    errors.push('Worker decline-match bypasses its source outer exception')
  }

  const workerAttemptMatches = bodyBetween(
    worker,
    'private async attemptMatchFindWindow(',
    'private async putTicketAndArmFindWindow('
  )
  requireOrdered(errors, 'Worker orphaned queue repair', workerAttemptMatches, [
    'this.drainDisabledMatchmaking(enabledModes)',
    'this.state.storage.list<StoredTicket>({',
    'const orphanedTicketKeys: string[] = []',
    'this.hasSubscribedSocket(ticket.player.address)',
    'tickets.push(ticket)',
    'orphanedTicketKeys.push(key)',
    'if (orphanedTicketKeys.length > 0) {',
    'await this.state.storage.delete(orphanedTicketKeys)',
    'const byAddress = new Map('
  ])

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
  requireOrdered(
    errors,
    'Worker last-subscriber decline behavior',
    workerCleanup,
    [
      'if (this.hasSubscribedSocket(attachment.principal)) return',
      'await this.declineMatch(attachment.principal)',
      "console.error('matchmaker socket cleanup decline failed', error)"
    ]
  )
  if (
    workerCleanup.includes('proposal.status') ||
    workerCleanup.includes('this.broadcastProposal(') ||
    workerCleanup.includes('this.deleteProposal(')
  ) {
    errors.push('Worker socket cleanup bypasses the shared source decline path')
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
  const zeroSocketCleanupAssertions =
    workerRuntimeTest.match(/\.toEqual\(\[0, 0\]\)/g)?.length ?? 0
  if (zeroSocketCleanupAssertions < 2) {
    errors.push(
      'Worker read-timeout or fatal accept cleanup regression is missing'
    )
  }
  for (const title of [
    'sends the source generic error and closes when find-match handling fails',
    'sends the source generic error and closes when accept-match handling fails',
    'keeps the channel open only for decline invalid-operation errors'
  ]) {
    if (!workerRuntimeTest.includes(title)) {
      errors.push(`Worker command-error regression is missing: ${title}`)
    }
  }
  const genericServerErrorFixture = bodyBetween(
    workerRuntimeTest,
    'const GENERIC_SERVER_ERROR = {',
    'const runtimeEnv ='
  )
  requireOrdered(
    errors,
    'Worker generic command-error fixture',
    genericServerErrorFixture,
    [
      "type: 'error'",
      "reason: 'SERVER_ERROR'",
      "message: 'SERVER_ERROR'",
      "level: 'server'"
    ]
  )
  const findFailureTest = bodyBetween(
    workerRuntimeTest,
    "it('sends the source generic error and closes when find-match handling fails'",
    "it('rejects a chosen deck from discovery before queueing'"
  )
  const missingIPAddressTest = bodyBetween(
    workerRuntimeTest,
    "it('silently rejects a missing client IP before captcha and profile hydration'",
    "it('sends the source generic error and closes when find-match handling fails'"
  )
  requireOrdered(
    errors,
    'Worker empty-IP admission regression',
    missingIPAddressTest,
    [
      "isolatedPool('missing-client-ip')",
      "connectDirectlyToPool(missingIpPool, PRINCIPAL_3, '')",
      'findCommand(GameMode.PRACTICE_BOT)',
      'await expectNoMessage(player)',
      'queuedPlayers: 0',
      'activeProposals: 0',
      'connectedSockets: 1',
      'state.getWebSockets(PRINCIPAL_3)',
      "clientIp: ''",
      'subscribed: false',
      'state.storage.get(`ticket:${PRINCIPAL_3}`)',
      'toBeUndefined()'
    ]
  )
  requireOrdered(
    errors,
    'Worker fatal find-match regression',
    findFailureTest,
    [
      'expect(await error).toEqual(GENERIC_SERVER_ERROR)',
      "expect(await closed).toMatchObject({ code: 1005, reason: '' })"
    ]
  )
  const acceptFailureTest = bodyBetween(
    workerRuntimeTest,
    "it('sends the source generic error and closes when accept-match handling fails'",
    "it('keeps the channel open only for decline invalid-operation errors'"
  )
  requireOrdered(
    errors,
    'Worker fatal accept-match regression',
    acceptFailureTest,
    [
      'expect(await error).toEqual(GENERIC_SERVER_ERROR)',
      "expect(await closed).toMatchObject({ code: 1005, reason: '' })",
      '.toEqual([0, 0])'
    ]
  )
  const expiredAcceptTest = bodyBetween(
    workerRuntimeTest,
    "it('notifies only the accepter before the timeout alarm expires the proposal'",
    "it('reports a referenced missing proposal as timed out before closing'"
  )
  requireOrdered(
    errors,
    'Worker expired-accept regression',
    expiredAcceptTest,
    [
      'expiresAtMs: Date.now() - 1',
      "first.send(JSON.stringify({ type: 'accept_match' }))",
      "{ type: 'timed_out' }",
      'GENERIC_SERVER_ERROR',
      "expect(await accepterClosed).toMatchObject({ code: 1005, reason: '' })",
      'await opponentStayedSilent',
      "state.storage.list({ prefix: 'proposal:' })",
      ').toBe(1)',
      "state.storage.list({ prefix: 'penalty:accept-timeout:' })",
      ').toBe(0)',
      'runDurableObjectAlarm(pool())',
      "expect(await opponentTimedOut).toEqual({ type: 'timed_out' })",
      ').toBe(0)',
      "state.storage.list({ prefix: 'penalty:accept-timeout:' })",
      ').toBe(2)'
    ]
  )
  const missingProposalAcceptTest = bodyBetween(
    workerRuntimeTest,
    "it('reports a referenced missing proposal as timed out before closing'",
    "it('rejects a new search while a missing proposal reference is still live'"
  )
  requireOrdered(
    errors,
    'Worker missing-proposal accept regression',
    missingProposalAcceptTest,
    [
      "state.storage.list({ prefix: 'proposal:' })",
      'await state.storage.delete([...proposals.keys()])',
      "first.send(JSON.stringify({ type: 'accept_match' }))",
      "{ type: 'timed_out' }",
      'GENERIC_SERVER_ERROR',
      "expect(await accepterClosed).toMatchObject({ code: 1005, reason: '' })",
      'await opponentStayedSilent',
      "state.storage.list({ prefix: 'proposal:' })",
      ').toBe(0)',
      "state.storage.list({ prefix: 'pending:' })",
      ').toBe(2)'
    ]
  )
  const liveMissingProposalFindTest = bodyBetween(
    workerRuntimeTest,
    "it('rejects a new search while a missing proposal reference is still live'",
    "it('allows a new search after a missing proposal reference expires'"
  )
  requireOrdered(
    errors,
    'Worker live missing-proposal find regression',
    liveMissingProposalFindTest,
    [
      "proposalId: 'missing-live-proposal'",
      'expiresAtMs: Date.now() + 60_000',
      'player.send(JSON.stringify(findCommand()))',
      'expect(await error).toEqual(GENERIC_SERVER_ERROR)',
      "expect(await closed).toMatchObject({ code: 1005, reason: '' })",
      'state.storage.get(`pending:${PRINCIPAL_1}`)',
      ').toEqual(',
      'pending',
      'state.storage.get(`ticket:${PRINCIPAL_1}`)',
      'toBeUndefined()'
    ]
  )
  const expiredMissingProposalFindTest = bodyBetween(
    workerRuntimeTest,
    "it('allows a new search after a missing proposal reference expires'",
    "it('drains a legacy missing-proposal reference during a rolling upgrade'"
  )
  requireOrdered(
    errors,
    'Worker expired missing-proposal find regression',
    expiredMissingProposalFindTest,
    [
      "proposalId: 'missing-expired-proposal'",
      'expiresAtMs: Date.now() - 1',
      'player.send(JSON.stringify(findCommand()))',
      '.toBe(1)',
      'state.storage.get(`pending:${PRINCIPAL_1}`)',
      'toBeUndefined()',
      'state.storage.get(`ticket:${PRINCIPAL_1}`)',
      'toBeDefined()'
    ]
  )
  const legacyMissingProposalFindTest = bodyBetween(
    workerRuntimeTest,
    "it('drains a legacy missing-proposal reference during a rolling upgrade'",
    "it('accepts through a legacy live reference during a rolling upgrade'"
  )
  requireOrdered(
    errors,
    'Worker legacy missing-proposal find regression',
    legacyMissingProposalFindTest,
    [
      "'legacy-missing-proposal'",
      'player.send(JSON.stringify(findCommand()))',
      '.toBe(1)',
      'state.storage.get(`pending:${PRINCIPAL_1}`)',
      'toBeUndefined()',
      'state.storage.get(`ticket:${PRINCIPAL_1}`)',
      'toBeDefined()'
    ]
  )
  const legacyLiveProposalAcceptTest = bodyBetween(
    workerRuntimeTest,
    "it('accepts through a legacy live reference during a rolling upgrade'",
    "it('keeps the channel open only for decline invalid-operation errors'"
  )
  requireOrdered(
    errors,
    'Worker legacy live-proposal accept regression',
    legacyLiveProposalAcceptTest,
    [
      "proposalKey.slice('proposal:'.length)",
      "first.send(JSON.stringify({ type: 'accept_match' }))",
      "type: 'accept_match'",
      'playerID: PRINCIPAL_1',
      'state.storage.list<{ accepted: string[] }>({',
      'accepted).toEqual([PRINCIPAL_1])'
    ]
  )
  const declineInvalidOperationTest = bodyBetween(
    workerRuntimeTest,
    "it('keeps the channel open only for decline invalid-operation errors'",
    "it('declines an accepted proposal while the source pending lifetime is live'"
  )
  requireOrdered(
    errors,
    'Worker nonfatal decline invalid-operation regression',
    declineInvalidOperationTest,
    [
      "reason: 'INVALID_OPERATION'",
      "message: 'INVALID_OPERATION'",
      "first.send('PING')",
      'expect(first.readyState).toBe(WebSocket.OPEN)'
    ]
  )
  const acceptedDeclineTest = bodyBetween(
    workerRuntimeTest,
    "it('declines an accepted proposal while the source pending lifetime is live'",
    "it('continues an in-flight source director copy after a live decline'"
  )
  requireOrdered(
    errors,
    'Worker accepted-proposal decline regression',
    acceptedDeclineTest,
    [
      "status: 'ACCEPTED'",
      'accepted: [PRINCIPAL_1, PRINCIPAL_2]',
      "first.send(JSON.stringify({ type: 'decline_match' }))",
      "type: 'decline_match'",
      'playerID: PRINCIPAL_1',
      'activeProposals: 0',
      ').toMatchObject({ count: 1 })'
    ]
  )
  const inFlightDeclineTest = bodyBetween(
    workerRuntimeTest,
    "it('continues an in-flight source director copy after a live decline'",
    "it('declines a dispatching proposal when its final player channel closes'"
  )
  requireOrdered(
    errors,
    'Worker in-flight source director decline regression',
    inFlightDeclineTest,
    [
      'await setDispatchBlocked(true)',
      "second.send(JSON.stringify({ type: 'accept_match' }))",
      ".toBe('DISPATCHING')",
      "first.send(JSON.stringify({ type: 'decline_match' }))",
      "type: 'decline_match'",
      'playerID: PRINCIPAL_1',
      'await setDispatchBlocked(false)',
      "type: 'match_made'",
      "type: 'match_ready_to_start'",
      "state.storage.list({ prefix: 'proposal:' })",
      ').toBe(0)',
      ').toMatchObject({ count: 1 })'
    ]
  )
  const dispatchingDisconnectTest = bodyBetween(
    workerRuntimeTest,
    "it('declines a dispatching proposal when its final player channel closes'",
    "it('ignores an accepted decline after the source pending lifetime expires'"
  )
  requireOrdered(
    errors,
    'Worker dispatching-proposal disconnect regression',
    dispatchingDisconnectTest,
    [
      "status: 'DISPATCHING'",
      "first.close(1000, 'disconnect during dispatch')",
      "type: 'decline_match'",
      'playerID: PRINCIPAL_1',
      'activeProposals: 0',
      'connectedSockets: 1',
      ').toMatchObject({ count: 1 })'
    ]
  )
  const expiredAcceptedDeclineTest = bodyBetween(
    workerRuntimeTest,
    "it('ignores an accepted decline after the source pending lifetime expires'",
    "it('persists queue state and socket identity through Durable Object eviction'"
  )
  requireOrdered(
    errors,
    'Worker expired accepted-proposal decline regression',
    expiredAcceptedDeclineTest,
    [
      "status: 'ACCEPTED'",
      'expiresAtMs: Date.now() - 1',
      "first.send(JSON.stringify({ type: 'decline_match' }))",
      'await Promise.all([firstStayedSilent, secondStayedSilent])',
      "state.storage.list({ prefix: 'proposal:' })",
      ').toBe(1)',
      "state.storage.list({ prefix: 'penalty:refusal-count:' })",
      ').toBe(0)'
    ]
  )

  const orphanedQueueTicketTest = bodyBetween(
    workerRuntimeTest,
    "it('removes an orphaned queue ticket before source matching'",
    "it('drains an accepted proposal when its mode is disabled'"
  )
  requireOrdered(
    errors,
    'Worker orphaned queue ticket regression',
    orphanedQueueTicketTest,
    [
      "isolatedPool('orphaned-queue-ticket')",
      'player.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))',
      "player.close(1000, 'create a persisted orphan')",
      'queuedPlayers: 0, connectedSockets: 0',
      'state.storage.put(`ticket:${PRINCIPAL_1}`, ticket!)',
      'state.storage.setAlarm(Date.now() + 60_000)',
      'runDurableObjectAlarm(orphanPool)',
      'state.storage.get(`ticket:${PRINCIPAL_1}`)',
      'toBeUndefined()',
      'state.storage.getAlarm()',
      'toBeNull()'
    ]
  )

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
    sourcePendingMatchValidator,
    sourceIPAddressValidator,
    sourceApp,
    sourceFrontendService,
    sourceAcceptTimeouter,
    sourceDecliner,
    sourceMatchProposalRepository,
    sourceQueryService,
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
      path.join(
        root,
        'matchmaker/lib/frontend/findmatch/validators/pending_match.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'matchmaker/lib/frontend/findmatch/validators/ip_address.go'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'matchmaker/app.go'), 'utf8'),
    readFile(
      path.join(
        root,
        'matchmaker/lib/matchmaker/custommatchmaker/frontend_service.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'matchmaker/lib/matchmaker/custommatchmaker/accept_timeouter.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/matchmaker/custommatchmaker/decliner.go'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'matchmaker/lib/matchmaker/custommatchmaker/match_proposal_repository.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'matchmaker/lib/matchmaker/custommatchmaker/query_service.go'
      ),
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
    sourcePendingMatchValidator,
    sourceIPAddressValidator,
    sourceApp,
    sourceFrontendService,
    sourceAcceptTimeouter,
    sourceDecliner,
    sourceMatchProposalRepository,
    sourceQueryService,
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
      'Cloudflare matchmaker session lifecycle matches the source subscriber, empty-IP admission, orphaned-queue, command-error, independent pending-match, expired-accept, status-independent decline, authentication-timeout, and read-timeout contracts'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
