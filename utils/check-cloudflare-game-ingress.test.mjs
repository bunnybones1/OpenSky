import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { gameIngressErrors } from './check-cloudflare-game-ingress.mjs'

const fixtures = async () => {
  const [
    sourceServer,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile('server/src/Server.ts', 'utf8'),
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
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  }
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
