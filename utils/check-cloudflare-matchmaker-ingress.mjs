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

export const matchmakerIngressErrors = ({
  sourceClientConnection,
  sourceMessageReceiver,
  sourceWebsocketHandler,
  sourceWebsocketHandlerTest,
  sourceMessages,
  sourceMessageSender,
  sourceBackendService,
  sourceBrowserClient,
  workerProtocol,
  workerRuntime,
  workerProtocolTest,
  workerRuntimeTest,
  rootPackage
}) => {
  const errors = []

  if (!sourceClientConnection.includes('readMaxLength = int64(1024 * 32)')) {
    errors.push('Source matchmaker message limit is no longer 32 KiB')
  }
  const sourceConnectionConstructor = bodyBetween(
    sourceClientConnection,
    'func NewClientConn(',
    'func (c *clientConn) ID()'
  )
  if (!sourceConnectionConstructor.includes('SetReadLimit(readMaxLength)')) {
    errors.push('Source websocket no longer applies its message read limit')
  }
  const sourceRead = bodyBetween(
    sourceClientConnection,
    'func (c *clientConn) ReadJSON(',
    'func (c *clientConn) WriteJSON('
  )
  requireOrdered(errors, 'Source websocket payload decoding', sourceRead, [
    '_, buf, err := c.ws.ReadMessage()',
    'if string(buf) == "PING" {',
    'buf = legacyPingMessage',
    'return buf, json.Unmarshal(buf, v)'
  ])

  const sourceReceive = bodyBetween(
    sourceMessageReceiver,
    'func (r *messageReceiver) Receive(',
    'type timeouter interface'
  )
  requireOrdered(
    errors,
    'Source message receiver failure boundary',
    sourceReceive,
    [
      'buf, err := client.ReadJSON(&envelope)',
      'if err != nil {',
      'if t, ok := err.(timeouter); ok && t.Timeout() {',
      'return nil, messages.EmptyMessageType, client.Close()',
      'if websocket.IsUnexpectedCloseError(',
      'return nil, messages.EmptyMessageType, client.Close()',
      'return nil, messages.EmptyMessageType, fmt.Errorf("read message: %w", err)',
      'return buf, envelope.Type, nil'
    ]
  )

  const sourceSession = bodyBetween(
    sourceWebsocketHandler,
    'func (h *websocketHandler) Handle(',
    'func (h *websocketHandler) listenOnMessage('
  )
  requireOrdered(errors, 'Source fatal message lifecycle', sourceSession, [
    'if err := h.listenOnMessage(ctx, client); err != nil {',
    'if !errors.As(err, &closeErr) {',
    'h.messageSender.SendErrorMessage(client, *mmerrors.ErrServerError)',
    'client.Close()',
    'return nil'
  ])
  const sourceListen = bodyBetween(
    sourceWebsocketHandler,
    'func (h *websocketHandler) listenOnMessage(',
    'func (h *websocketHandler) addClient('
  )
  requireOrdered(errors, 'Source unknown-message rejection', sourceListen, [
    'switch messageType {',
    'default:',
    'return fmt.Errorf("unexpected message: %s", messageType)'
  ])
  requireOrdered(
    errors,
    'Source unexpected-message regression',
    sourceWebsocketHandlerTest,
    [
      't.Run("closes connection when unexpected message received"',
      'return nil, "foo", nil',
      'messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrServerError)'
    ]
  )

  const sourceErrorMessage = bodyBetween(
    sourceMessages,
    'func NewErrorMessage(',
    'func NewTimedOutMessage('
  )
  requireOrdered(errors, 'Source error message wire', sourceErrorMessage, [
    'Type:    "error"',
    'Reason:  reason',
    'Message: reason',
    'Level:   "server"'
  ])
  const sourceMatchFoundSender = bodyBetween(
    sourceMessageSender,
    'func (s *messageSender) SendMatchFoundMessage(',
    'func (s *messageSender) SendAcceptedMatchMessage('
  )
  requireOrdered(
    errors,
    'Source recipient-first match-found wire',
    sourceMatchFoundSender,
    [
      'messages.NewMatchFoundMessage(',
      'ev.Mode,',
      'ev.TTL,',
      '[]string{ev.PlayerID.String(), ev.OpponentID.String()}'
    ]
  )
  const sourceMatchFoundPublication = bodyBetween(
    sourceBackendService,
    'func (s *BackendService) MatchFound(',
    'func (s *BackendService) MatchMade('
  )
  requireOrdered(
    errors,
    'Source per-recipient match-found publication',
    sourceMatchFoundPublication,
    [
      'for _, p := range matchProposal.Players {',
      'opponent, err := matchProposal.Opponent(p)',
      'matchFoundMessage := events.EventFoundMessage{',
      'PlayerID:   p.Address()',
      'OpponentID: opponent.Address()',
      'Mode:       p.Mode',
      's.notifier.Message(ctx, matchFoundMessage, p)'
    ]
  )

  const browserError = bodyBetween(
    sourceBrowserClient,
    "case 'error': {",
    'default:'
  )
  requireOrdered(errors, 'Source browser error close', browserError, [
    "data.reason === 'DUPLICATE_CONNECTION'",
    '? WEBSOCKET_FORCED_CLOSE_CODE',
    ': WEBSOCKET_NORMAL_CLOSE_CODE',
    'this.ws.manual_disconnect(code)',
    'messageHandlers.onError(data)'
  ])

  if (!workerProtocol.includes('MAX_CLIENT_MESSAGE_BYTES = 32 * 1024')) {
    errors.push('Worker message limit does not match the source 32 KiB limit')
  }
  const workerParse = bodyBetween(
    workerProtocol,
    'export const parseClientCommand = (',
    'export const errorMessage = ('
  )
  requireOrdered(
    errors,
    'Worker source-compatible payload decoding',
    workerParse,
    [
      'const bytes =',
      'new TextEncoder().encode(raw)',
      'new Uint8Array(raw)',
      'if (bytes.byteLength > MAX_CLIENT_MESSAGE_BYTES) {',
      "typeof raw === 'string' ? raw : new TextDecoder().decode(bytes)",
      "if (message === 'PING') return { type: 'ping' }",
      'value = JSON.parse(message)'
    ]
  )
  if (workerParse.includes('binary messages are not supported')) {
    errors.push('Worker still rejects source-compatible binary JSON')
  }
  const workerErrorMessage = bodyBetween(
    workerProtocol,
    'export const errorMessage = (',
    '\n})'
  )
  requireOrdered(
    errors,
    'Worker source error message wire',
    workerErrorMessage,
    [
      'reason: string',
      "type: 'error'",
      'reason,',
      'message: reason',
      "level: 'server'"
    ]
  )
  if (workerErrorMessage.includes('message = reason')) {
    errors.push('Worker error helper still accepts a non-source message')
  }

  const workerMessage = bodyBetween(
    workerRuntime,
    'async webSocketMessage(',
    'async webSocketClose('
  )
  requireOrdered(errors, 'Worker malformed-message routing', workerMessage, [
    'let command: MatchmakerClientCommand',
    'command = parseClientCommand(raw)',
    '} catch (error) {',
    'this.failMalformedClientMessage(webSocket, error)',
    'return',
    'switch (command.type) {'
  ])
  for (const call of workerRuntime.matchAll(/errorMessage\(([^)]*)\)/g)) {
    if (call[1].includes(',')) {
      errors.push('Worker matchmaker error call supplies a non-source message')
      break
    }
  }
  const workerMatchFound = bodyBetween(
    workerRuntime,
    'private async createProposal(',
    'private async createBotMatch('
  )
  requireOrdered(
    errors,
    'Worker recipient-first match-found publication',
    workerMatchFound,
    [
      'const participant = proposal.participants.find(',
      'current => current.player.address === principal',
      'const opponent = proposal.participants.find(',
      'current => current.player.address !== principal',
      'if (!participant || !opponent) continue',
      'this.sendToPrincipal(principal, {',
      "type: 'match_found'",
      'mode: participant.player.mode',
      'playerIDs: [participant.player.address, opponent.player.address]'
    ]
  )
  const workerFailure = bodyBetween(
    workerRuntime,
    'private failMalformedClientMessage(',
    'async webSocketClose('
  )
  requireOrdered(
    errors,
    'Worker fatal malformed-message lifecycle',
    workerFailure,
    [
      "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))",
      'webSocket.close()'
    ]
  )
  if (
    workerFailure.includes("errorMessage('INVALID_OPERATION')") ||
    !/webSocket\.close\(\s*\)/.test(workerFailure)
  ) {
    errors.push(
      'Worker malformed-message failure leaks detail or invents a close payload'
    )
  }

  for (const [label, source, tokens] of [
    [
      'unit',
      workerProtocolTest,
      [
        "it('aliases the source error message to its reason'",
        "errorMessage('RANK_TOO_LOW')",
        "message: 'RANK_TOO_LOW'",
        "it('accepts source-compatible binary JSON payloads'",
        "it('pins the source 32 KiB message boundary'",
        'expect(MAX_CLIENT_MESSAGE_BYTES).toBe(32 * 1024)'
      ]
    ],
    [
      'Workers',
      workerRuntimeTest,
      [
        "'returns the source server error and closes for %s'",
        "reason: 'SERVER_ERROR'",
        "message: 'SERVER_ERROR'",
        "it('accepts the binary JSON payload that the source decoder accepts'"
      ]
    ]
  ]) {
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`Worker ${label} ingress regression is missing: ${token}`)
      }
    }
  }
  const serviceRejectionTest = bodyBetween(
    workerRuntimeTest,
    "it('terminates proposals rejected by final match preconditions'",
    "it('releases accepted players after bounded transient dispatch failures'"
  )
  requireOrdered(
    errors,
    'Worker match-service rejection error regression',
    serviceRejectionTest,
    ["reason: 'RANK_TOO_LOW'", "message: 'RANK_TOO_LOW'", "level: 'server'"]
  )
  const pairPlayersTest = bodyBetween(
    workerRuntimeTest,
    'const pairPlayers = async (',
    '\nafterEach(async () =>'
  )
  requireOrdered(
    errors,
    'Worker recipient-first match-found regression',
    pairPlayersTest,
    [
      'expect(await firstFound).toMatchObject({',
      'playerIDs: principals',
      'expect(await secondFound).toMatchObject({',
      'playerIDs: [principals[1], principals[0]]'
    ]
  )

  const scripts = rootPackage?.scripts ?? {}
  if (
    !String(scripts['build:cloudflare'] ?? '').includes(
      'pnpm check:cloudflare:matchmaker-ingress'
    )
  ) {
    errors.push('Complete Cloudflare build omits the matchmaker ingress gate')
  }
  if (
    !String(scripts['deploy:cloudflare:matchmaker'] ?? '').includes(
      'pnpm check:cloudflare:matchmaker-ingress'
    )
  ) {
    errors.push('Matchmaker deployment omits the ingress source gate')
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    sourceClientConnection,
    sourceMessageReceiver,
    sourceWebsocketHandler,
    sourceWebsocketHandlerTest,
    sourceMessages,
    sourceMessageSender,
    sourceBackendService,
    sourceBrowserClient,
    workerProtocol,
    workerRuntime,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile(
      path.join(root, 'matchmaker/lib/frontend/client_connection.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/message_receiver.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/websocket_handler.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/websocket_handler_test.go'),
      'utf8'
    ),
    readFile(path.join(root, 'matchmaker/lib/messages/messages.go'), 'utf8'),
    readFile(
      path.join(root, 'matchmaker/lib/frontend/message_sender.go'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'matchmaker/lib/matchmaker/custommatchmaker/backend_service.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/clients/MatchMakerClient/MatchMakerClient.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'matchmaker-ts/src/protocol.ts'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts/src/runtime.ts'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts/test/protocol.test.ts'), 'utf8'),
    readFile(
      path.join(root, 'matchmaker-ts/test-cloudflare/runtime.test.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = matchmakerIngressErrors({
    sourceClientConnection,
    sourceMessageReceiver,
    sourceWebsocketHandler,
    sourceWebsocketHandlerTest,
    sourceMessages,
    sourceMessageSender,
    sourceBackendService,
    sourceBrowserClient,
    workerProtocol,
    workerRuntime,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  })
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker ingress preserves the source payload, recipient-first match-found wire, exact error alias, and close contract'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
