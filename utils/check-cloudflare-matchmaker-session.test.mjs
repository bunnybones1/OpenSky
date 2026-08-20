import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerSessionErrors } from './check-cloudflare-matchmaker-session.mjs'

const fixtures = async () => {
  const [
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceNotifier,
    sourceFactory,
    sourceBrowserClient,
    sourceWebsocketHandler,
    sourceConfig,
    sourceComposeConfig,
    worker,
    workerWrangler,
    workerTestWrangler,
    rootPackage
  ] = await Promise.all([
    readFile('matchmaker/lib/frontend/findmatch/handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/acceptmatch/handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/declinematch/handler.go', 'utf8'),
    readFile('matchmaker/lib/playerchannel/notifier.go', 'utf8'),
    readFile('matchmaker/lib/playerchannel/factory.go', 'utf8'),
    readFile('webapp/src/clients/MatchMakerClient/MatchMakerClient.ts', 'utf8'),
    readFile('matchmaker/lib/frontend/websocket_handler.go', 'utf8'),
    readFile('matchmaker/config/config.go', 'utf8'),
    readFile('matchmaker/etc/matchmaker.compose.conf', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/wrangler.jsonc', 'utf8'),
    readFile('matchmaker-ts/wrangler.test.jsonc', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceHandler,
    sourceAcceptHandler,
    sourceDeclineHandler,
    sourceNotifier,
    sourceFactory,
    sourceBrowserClient,
    sourceWebsocketHandler,
    sourceConfig,
    sourceComposeConfig,
    worker,
    workerWrangler,
    workerTestWrangler,
    rootPackage
  }
}

const errorsFor = value =>
  matchmakerSessionErrors(
    value.sourceHandler,
    value.sourceAcceptHandler,
    value.sourceDeclineHandler,
    value.sourceNotifier,
    value.sourceFactory,
    value.sourceBrowserClient,
    value.sourceWebsocketHandler,
    value.sourceConfig,
    value.sourceComposeConfig,
    value.worker,
    value.workerWrangler,
    value.workerTestWrangler,
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
        'attachment?.subscribed === false',
        'attachment?.subscribed === true'
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
