import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerIngressErrors } from './check-cloudflare-matchmaker-ingress.mjs'

const fixtures = async () => {
  const [
    sourceClientConnection,
    sourceMessageReceiver,
    sourceWebsocketHandler,
    sourceWebsocketHandlerTest,
    sourceMessages,
    sourceMessageSender,
    sourceBackendService,
    sourceBrowserClient,
    sourceBrowserHandlers,
    workerProtocol,
    workerRuntime,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile('matchmaker/lib/frontend/client_connection.go', 'utf8'),
    readFile('matchmaker/lib/frontend/message_receiver.go', 'utf8'),
    readFile('matchmaker/lib/frontend/websocket_handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/websocket_handler_test.go', 'utf8'),
    readFile('matchmaker/lib/messages/messages.go', 'utf8'),
    readFile('matchmaker/lib/frontend/message_sender.go', 'utf8'),
    readFile(
      'matchmaker/lib/matchmaker/custommatchmaker/backend_service.go',
      'utf8'
    ),
    readFile('webapp/src/clients/MatchMakerClient/MatchMakerClient.ts', 'utf8'),
    readFile('webapp/src/clients/MatchMakerClient/handlers.ts', 'utf8'),
    readFile('matchmaker-ts/src/protocol.ts', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/test/protocol.test.ts', 'utf8'),
    readFile('matchmaker-ts/test-cloudflare/runtime.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceClientConnection,
    sourceMessageReceiver,
    sourceWebsocketHandler,
    sourceWebsocketHandlerTest,
    sourceMessages,
    sourceMessageSender,
    sourceBackendService,
    sourceBrowserClient,
    sourceBrowserHandlers,
    workerProtocol,
    workerRuntime,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  }
}

test('pins the source and Worker matchmaker ingress lifecycle', async () => {
  assert.deepEqual(matchmakerIngressErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, browser, test, and release requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceMessageSender: value.sourceMessageSender.replace(
        '[]string{ev.PlayerID.String(), ev.OpponentID.String()}',
        '[]string{ev.OpponentID.String(), ev.PlayerID.String()}'
      )
    },
    {
      ...value,
      sourceBackendService: value.sourceBackendService.replace(
        'PlayerID:   p.Address()',
        'PlayerID:   opponent.Address()'
      )
    },
    {
      ...value,
      sourceMessages: value.sourceMessages.replace(
        'Type: AcceptMatchType',
        'Type: DeclineMatchType'
      )
    },
    {
      ...value,
      sourceMessages: value.sourceMessages.replace(
        'Type: matchReadyToStartType',
        'Type: matchMadeType'
      )
    },
    {
      ...value,
      sourceMessageSender: value.sourceMessageSender.replace(
        'messages.NewAcceptedMatchMessage(ev.PlayerID)',
        'messages.NewAcceptedMatchMessage(proto.Hash{})'
      )
    },
    {
      ...value,
      sourceMessageSender: value.sourceMessageSender.replace(
        'messages.NewMatchReadyToStartMessage(ev.Mode)',
        'messages.NewMatchReadyToStartMessage(proto.GameMode_UNKNOWN)'
      )
    },
    {
      ...value,
      sourceClientConnection: value.sourceClientConnection.replace(
        'readMaxLength = int64(1024 * 32)',
        'readMaxLength = int64(1024 * 64)'
      )
    },
    {
      ...value,
      sourceClientConnection: value.sourceClientConnection.replace(
        '_, buf, err := c.ws.ReadMessage()',
        'messageType, buf, err := c.ws.ReadMessage()'
      )
    },
    {
      ...value,
      sourceClientConnection: value.sourceClientConnection.replace(
        'if string(buf) == "PING" {',
        'if false {'
      )
    },
    {
      ...value,
      sourceMessageReceiver: value.sourceMessageReceiver.replace(
        'return nil, messages.EmptyMessageType, fmt.Errorf("read message: %w", err)',
        'return nil, messages.EmptyMessageType, nil'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        'h.messageSender.SendErrorMessage(client, *mmerrors.ErrServerError)',
        'h.messageSender.SendErrorMessage(client, *mmerrors.ErrInvalidOperation)'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        '\n\t\t\t\tclient.Close()\n',
        '\n\t\t\t\t// connection left open\n'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        'return fmt.Errorf("unexpected message: %s", messageType)',
        'return nil'
      )
    },
    {
      ...value,
      sourceWebsocketHandlerTest: value.sourceWebsocketHandlerTest.replace(
        't.Run("closes connection when unexpected message received"',
        't.Run("allows unexpected message"'
      )
    },
    {
      ...value,
      sourceMessages: value.sourceMessages.replace(
        'Message: reason,',
        'Message: "",'
      )
    },
    {
      ...value,
      sourceBrowserClient: value.sourceBrowserClient.replace(
        ': WEBSOCKET_NORMAL_CLOSE_CODE',
        ': WEBSOCKET_FORCED_CLOSE_CODE'
      )
    },
    {
      ...value,
      sourceBrowserHandlers: value.sourceBrowserHandlers.replace(
        '`${env.GAME_URL}?mode=${data.mode}`',
        '`${env.GAME_URL}`'
      )
    },
    {
      ...value,
      sourceBrowserHandlers: value.sourceBrowserHandlers.replace(
        'if (data.playerID === authedAddress) {',
        'if (data.playerID !== authedAddress) {'
      )
    },
    {
      ...value,
      sourceBrowserHandlers: value.sourceBrowserHandlers.replace(
        "updatePlayState('matchMakerStatus', MatchMakerStatus.OPPONENT_DECLINED)",
        "updatePlayState('matchMakerStatus', MatchMakerStatus.TIMED_OUT)"
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        'MAX_CLIENT_MESSAGE_BYTES = 32 * 1024',
        'MAX_CLIENT_MESSAGE_BYTES = 64 * 1024'
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
        'const bytes =',
        "if (typeof raw !== 'string') throw new Error('binary messages are not supported')\n  const bytes ="
      )
    },
    {
      ...value,
      workerProtocol: value.workerProtocol.replace(
        'message: reason,',
        "message: 'detail',"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'errorMessage(reason)',
        'errorMessage(reason, serviceError)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'playerIDs: [participant.player.address, opponent.player.address]',
        'playerIDs: proposal.participants.map(current => current.player.address)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        "type: 'accept_match',\n        playerID: principal",
        "type: 'accept_match',\n        playerID: addresses[0]"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        "type: 'decline_match',\n        playerID: principal",
        "type: 'decline_match',\n        playerID: proposal.participants[0].player.address"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        "this.broadcastProposal(proposal, { type: 'timed_out' })",
        "this.broadcastProposal(proposal, { type: 'decline_match', playerID: '' })"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        "type: 'match_ready_to_start',\n        mode: participant.player.mode",
        "type: 'match_ready_to_start',\n        mode: proposal.participants[0].player.mode"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))\n    webSocket.close()",
        "this.safeSend(webSocket, errorMessage('INVALID_OPERATION'))\n    webSocket.close()"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))\n    webSocket.close()",
        "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))"
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'webSocket.close()\n  }\n\n  async webSocketClose',
        "webSocket.close(1008, 'Malformed message')\n  }\n\n  async webSocketClose"
      )
    },
    {
      ...value,
      workerProtocolTest: value.workerProtocolTest.replace(
        "it('aliases the source error message to its reason'",
        "it('allows a detailed error message'"
      )
    },
    {
      ...value,
      workerProtocolTest: value.workerProtocolTest.replace(
        "it('pins the source 32 KiB message boundary'",
        "it('allows a broad message boundary'"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "message: 'RANK_TOO_LOW'",
        "message: 'ranked play is not unlocked'"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'playerIDs: [principals[1], principals[0]]',
        'playerIDs: principals'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "{ type: 'accept_match', playerID: PRINCIPAL_2 }",
        "{ type: 'accept_match', playerID: PRINCIPAL_1 }"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replaceAll(
        'expect(await secondDeclined).toEqual({',
        'expect(await secondDeclined).toMatchObject({'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "expect(await secondTimedOut).toEqual({ type: 'timed_out' })",
        "expect(await secondTimedOut).toMatchObject({ type: 'timed_out' })"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "'returns the source server error and closes for %s'",
        "'returns a protocol detail for %s'"
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
          ].replace('pnpm check:cloudflare:matchmaker-ingress && ', '')
        }
      }
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'deploy:cloudflare:matchmaker': value.rootPackage.scripts[
            'deploy:cloudflare:matchmaker'
          ].replace('pnpm check:cloudflare:matchmaker-ingress && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchmakerIngressErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
