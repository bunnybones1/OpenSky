import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerSessionErrors } from './check-cloudflare-matchmaker-session.mjs'

const fixtures = async () => {
  const [
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceFrontendService,
    sourceAcceptTimeouter,
    sourceDecliner,
    sourceMatchProposalRepository,
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
    readFile('matchmaker/lib/frontend/findmatch/handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/acceptmatch/handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/declinematch/handler.go', 'utf8'),
    readFile(
      'matchmaker/lib/matchmaker/custommatchmaker/frontend_service.go',
      'utf8'
    ),
    readFile(
      'matchmaker/lib/matchmaker/custommatchmaker/accept_timeouter.go',
      'utf8'
    ),
    readFile('matchmaker/lib/matchmaker/custommatchmaker/decliner.go', 'utf8'),
    readFile(
      'matchmaker/lib/matchmaker/custommatchmaker/match_proposal_repository.go',
      'utf8'
    ),
    readFile('matchmaker/lib/playerchannel/notifier.go', 'utf8'),
    readFile('matchmaker/lib/playerchannel/factory.go', 'utf8'),
    readFile('webapp/src/clients/MatchMakerClient/MatchMakerClient.ts', 'utf8'),
    readFile('webapp/src/clients/WebsocketClient.ts', 'utf8'),
    readFile('matchmaker/lib/frontend/websocket_handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/client_connection.go', 'utf8'),
    readFile('matchmaker/lib/frontend/message_receiver.go', 'utf8'),
    readFile('matchmaker/config/config.go', 'utf8'),
    readFile('matchmaker/etc/matchmaker.compose.conf', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/wrangler.jsonc', 'utf8'),
    readFile('matchmaker-ts/wrangler.test.jsonc', 'utf8'),
    readFile('matchmaker-ts/test-cloudflare/runtime.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceFrontendService,
    sourceAcceptTimeouter,
    sourceDecliner,
    sourceMatchProposalRepository,
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
  }
}

const errorsFor = value =>
  matchmakerSessionErrors(
    value.sourceHandler,
    value.sourceAcceptHandler,
    value.sourceDeclineHandler,
    value.sourceFrontendService,
    value.sourceAcceptTimeouter,
    value.sourceDecliner,
    value.sourceMatchProposalRepository,
    value.sourceNotifier,
    value.sourceFactory,
    value.sourceBrowserClient,
    value.sourceBrowserSocket,
    value.sourceWebsocketHandler,
    value.sourceClientConnection,
    value.sourceMessageReceiver,
    value.sourceConfig,
    value.sourceComposeConfig,
    value.worker,
    value.workerWrangler,
    value.workerTestWrangler,
    value.workerRuntimeTest,
    value.rootPackage
  )

test('pins the source and Worker matchmaker subscriber lifecycle', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects weakened source, Worker, browser, and release requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceHandler: value.sourceHandler.replace(
        'if client.HasChannel() {',
        'if false {'
      )
    },
    {
      ...value,
      sourceAcceptHandler: value.sourceAcceptHandler.replace(
        'if !client.HasChannel() {',
        'if false {'
      )
    },
    {
      ...value,
      sourceDeclineHandler: value.sourceDeclineHandler.replace(
        'return mmerrors.ErrMissingChannel',
        'return nil'
      )
    },
    {
      ...value,
      sourceFrontendService: value.sourceFrontendService.replace(
        's.notifier.Message(ctx, events.EventTimeOutMessage{}, p)',
        's.notifier.Message(ctx, events.EventTimeOutMessage{})'
      )
    },
    {
      ...value,
      sourceFrontendService: value.sourceFrontendService.replace(
        'return fmt.Errorf("match timed out: %w", errors.ErrInvalidOperation)',
        'return nil'
      )
    },
    {
      ...value,
      sourceFrontendService: value.sourceFrontendService.replace(
        'matchProposal.Timeout() < 0',
        'matchProposal.Timeout() <= 0'
      )
    },
    {
      ...value,
      sourceAcceptTimeouter: value.sourceAcceptTimeouter.replace(
        'if err := t.matchProposalRepository.Delete(matchProposal); err != nil {',
        'if false {'
      )
    },
    {
      ...value,
      sourceDecliner: value.sourceDecliner.replace(
        'if !hasMatchProposal {',
        'if false {'
      )
    },
    {
      ...value,
      sourceMatchProposalRepository:
        value.sourceMatchProposalRepository.replace(
          'if ttl < 0 || errors.Is(err, store.ErrNoSuchItem) {',
          'if ttl > 0 || errors.Is(err, store.ErrNoSuchItem) {'
        )
    },
    {
      ...value,
      sourceHandler: value.sourceHandler.replace(
        'h.notifier.Message(ctx, mmerrors.ErrDuplicateConnection, p)',
        'h.notifier.Message(ctx, mmerrors.ErrServerError, p)'
      )
    },
    {
      ...value,
      sourceHandler: value.sourceHandler.replace(
        'client.SetChannel(channel)',
        'client.Close()\n\tclient.SetChannel(channel)'
      )
    },
    {
      ...value,
      sourceNotifier: value.sourceNotifier.replace(
        'n.pubsub.Publish(ctx, channelID, message)',
        'n.pubsub.Broadcast(ctx, channelID, message)'
      )
    },
    {
      ...value,
      sourceFactory: value.sourceFactory.replace(
        'if nsubs > 0 {',
        'if nsubs >= 0 {'
      )
    },
    {
      ...value,
      sourceBrowserClient: value.sourceBrowserClient.replace(
        '? WEBSOCKET_FORCED_CLOSE_CODE',
        '? WEBSOCKET_NORMAL_CLOSE_CODE'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        'ticker := time.NewTicker(h.authenticationTimeout)',
        'ticker := time.NewTicker(time.Hour)'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        'if !client.HasChannel() {',
        'if client.HasChannel() {'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        'ticker.Stop()\n\t\t\t\tlogger.Info()',
        'h.messageSender.SendErrorMessage(client, *mmerrors.ErrServerError)\n\t\t\t\tticker.Stop()\n\t\t\t\tlogger.Info()'
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
        'return fmt.Errorf("handle find match: %w", err)',
        'return nil'
      )
    },
    {
      ...value,
      sourceWebsocketHandler: value.sourceWebsocketHandler.replace(
        'if errors.Is(err, mmerrors.ErrInvalidOperation) {',
        'if false {'
      )
    },
    {
      ...value,
      sourceConfig: value.sourceConfig.replace(
        'cfg.MatchMaker.AuthenticationTimeout = secondsToDuration(cfg.MatchMaker.AuthenticationTimeoutSeconds)',
        'cfg.MatchMaker.AuthenticationTimeout = time.Hour'
      )
    },
    {
      ...value,
      sourceComposeConfig: value.sourceComposeConfig.replace(
        'authentication_timeout_seconds = 10.0',
        'authentication_timeout_seconds = 5.0'
      )
    },
    {
      ...value,
      sourceClientConnection: value.sourceClientConnection.replace(
        'readTimeout = time.Second * 120',
        'readTimeout = time.Second * 60'
      )
    },
    {
      ...value,
      sourceClientConnection: value.sourceClientConnection.replace(
        'c.ws.SetReadDeadline(time.Now().Add(readTimeout))',
        'c.ws.SetReadDeadline(time.Now().Add(time.Hour))'
      )
    },
    {
      ...value,
      sourceMessageReceiver: value.sourceMessageReceiver.replace(
        'return nil, messages.EmptyMessageType, client.Close()',
        'return nil, messages.EmptyMessageType, nil'
      )
    },
    {
      ...value,
      sourceBrowserSocket: value.sourceBrowserSocket.replace(
        'const KEEPALIVE_INTERVAL = 3000',
        'const KEEPALIVE_INTERVAL = 30000'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'env.AUTHENTICATION_TIMEOUT_MS,',
        'undefined,'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'env.AUTHENTICATION_TIMEOUT_MS,\n      10_000,',
        'env.AUTHENTICATION_TIMEOUT_MS,\n      5_000,'
      )
    },
    {
      ...value,
      workerWrangler: value.workerWrangler.replace(
        '"AUTHENTICATION_TIMEOUT_MS": "10000"',
        '"AUTHENTICATION_TIMEOUT_MS": "5000"'
      )
    },
    {
      ...value,
      workerTestWrangler: value.workerTestWrangler.replace(
        '"AUTHENTICATION_TIMEOUT_MS": "10000"',
        '"AUTHENTICATION_TIMEOUT_MS": "5000"'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'MATCHMAKER_READ_TIMEOUT_MS = 120_000',
        'MATCHMAKER_READ_TIMEOUT_MS = 60_000'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'lastMessageAtMs?: number',
        'lastMessageAtMs: number'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'lastMessageAtMs: Date.now(),',
        'lastMessageAtMs: undefined,'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'attachment.lastMessageAtMs = Date.now()',
        'attachment.lastMessageAtMs = attachment.connectedAtMs'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'this.expireIdleSockets(now)',
        'this.ignoreIdleSockets(now)'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        '!attachment ||\n        attachment.subscribed === false',
        '!attachment ||\n        attachment.subscribed === true'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'lastMessageAtMs + MATCHMAKER_READ_TIMEOUT_MS > now',
        'lastMessageAtMs + MATCHMAKER_READ_TIMEOUT_MS <= now'
      )
    },
    {
      ...value,
      worker: value.worker.replace('subscribed: false', 'subscribed: true')
    },
    {
      ...value,
      worker: value.worker.replace(
        'this.state.acceptWebSocket(server, [attachment.principal])',
        "this.state.acceptWebSocket(server, [attachment.principal])\n    this.safeSend(server, errorMessage('DUPLICATE_CONNECTION'))"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'await this.scheduleAlarmAt(',
        'await Promise.resolve('
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'this.expireUnauthenticatedSockets(now)',
        'this.ignoreUnauthenticatedSockets(now)'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'attachment?.subscribed !== false',
        'attachment?.subscribed !== true'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'socket.close()\n      } catch {',
        "socket.close(1008, 'Authentication timeout')\n      } catch {"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'socket.close()\n      } catch {',
        "this.safeSend(socket, errorMessage('SERVER_ERROR'))\n        socket.close()\n      } catch {"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'if (attachment.subscribed === false) {\n        candidates.push(',
        'if (attachment.subscribed === true) {\n        candidates.push('
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'this.socketLastMessageAtMs(socket, attachment, now) +\n            MATCHMAKER_READ_TIMEOUT_MS',
        'attachment.connectedAtMs + MATCHMAKER_READ_TIMEOUT_MS'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'socket.close()\n      } catch {\n        // A close/error event may race the Durable Object alarm.\n      }\n    }\n  }\n\n  private socketLastMessageAtMs',
        "socket.close(1008, 'Read timeout')\n      } catch {\n        // A close/error event may race the Durable Object alarm.\n      }\n    }\n  }\n\n  private socketLastMessageAtMs"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'attachment.lastMessageAtMs = now\n    socket.serializeAttachment(attachment)\n    return now',
        'attachment.lastMessageAtMs = now\n    return now'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'lastMessageAtMs <= now',
        'lastMessageAtMs <= Number.MAX_SAFE_INTEGER'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'resets the source read timeout when the browser sends PING',
        'does not reset the source read timeout'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        '.toEqual([0, 0])',
        '.toEqual([1, 1])'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'if (current === null || deadline < current) {',
        'if (current !== null && deadline > current) {'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'if (attachment.subscribed) return',
        'if (false) return'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "case 'accept_match':\n          if (attachment.subscribed === false) {",
        "case 'accept_match':\n          if (false) {"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "case 'decline_match':\n          if (attachment.subscribed === false) {",
        "case 'decline_match':\n          if (false) {"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "command.type === 'decline_match'",
        "command.type === 'accept_match'"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "this.safeSend(webSocket, errorMessage('INVALID_OPERATION'))",
        'this.safeSend(webSocket, errorMessage(error.reason, error.message))'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))\n      webSocket.close()",
        "this.safeSend(webSocket, errorMessage('SERVER_ERROR'))\n      webSocket.close(1008, 'Handler failed')"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "throw new ProtocolError('INVALID_OPERATION', 'match proposal is not set')",
        "this.sendToPrincipal(principal, errorMessage('INVALID_OPERATION'))\n      return"
      )
    },
    {
      ...value,
      worker: value.worker.replace('if (!pendingProposalId) {', 'if (false) {')
    },
    {
      ...value,
      worker: value.worker.replace(
        'proposal.expiresAtMs < Date.now()',
        'proposal.expiresAtMs <= Date.now()'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "this.sendToPrincipal(principal, { type: 'timed_out' })",
        "this.broadcastProposal(proposal, { type: 'timed_out' })"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "this.sendToPrincipal(principal, { type: 'timed_out' })",
        "await this.expireProposal(proposal)\n      this.sendToPrincipal(principal, { type: 'timed_out' })"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'proposal.expiresAtMs >= Date.now()',
        'proposal.expiresAtMs <= Date.now()'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "'conquest cannot be declined'",
        "'conquest decline was ignored'"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'keeps the channel open only for decline invalid-operation errors',
        'closes every decline invalid-operation error'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "reason: 'SERVER_ERROR',\n  message: 'SERVER_ERROR'",
        "reason: 'OUTDATED_CLIENT',\n  message: 'OUTDATED_CLIENT'"
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'sends the source generic error and closes when find-match handling fails',
        'keeps find-match failures open'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'sends the source generic error and closes when accept-match handling fails',
        'keeps accept-match failures open'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'notifies only the accepter before the timeout alarm expires the proposal',
        'expires the proposal inside the accept command'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        'reports a referenced missing proposal as timed out before closing',
        'reports a referenced missing proposal as absent'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'this.notifyDuplicateSubscribers(webSocket, attachment.principal)',
        'this.notifyDuplicateSubscribersBeforeValidation(webSocket, attachment.principal)'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "this.safeSend(socket, errorMessage('DUPLICATE_CONNECTION'))",
        "this.safeSend(socket, errorMessage('DUPLICATE_CONNECTION'))\n      socket.close(4001, 'Duplicate connection')"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        '.filter(socket => this.isSubscribedSocket(socket))',
        '.filter(() => true)'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'attachment.subscribed !== false',
        'attachment.subscribed === true'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'this.hasSubscribedSocket(attachment.principal)',
        'this.state.getWebSockets(attachment.principal).length > 0'
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        "this.safeSend(webSocket, {\n        type: 'match_refusal_cooldown'",
        "this.sendToPrincipal(attachment.principal, {\n        type: 'match_refusal_cooldown'"
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
          ].replace('pnpm check:cloudflare:matchmaker-session && ', '')
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
          ].replace('pnpm check:cloudflare:matchmaker-session && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(errorsFor(mutation), [], `mutation ${index + 1} passed`)
  }
})
