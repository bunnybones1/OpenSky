import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchInfoErrors } from './check-cloudflare-match-info.mjs'

const fixtures = async () => {
  const [
    sourceRegistry,
    sourceBrowserWorker,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile('server/src/services/RegistryService.ts', 'utf8'),
    readFile('game/src/state/worker/multiplayerWorkerState.ts', 'utf8'),
    readFile('cloudflare/src/multiplayer-gateway.ts', 'utf8'),
    readFile('cloudflare/test/multiplayer-gateway.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceRegistry,
    sourceBrowserWorker,
    workerGateway,
    workerRuntimeTest,
    rootPackage
  }
}

const replaceAfter = (source, marker, search, replacement) => {
  const markerIndex = source.indexOf(marker)
  const searchIndex = source.indexOf(search, markerIndex)
  assert.ok(markerIndex >= 0 && searchIndex >= markerIndex)
  return `${source.slice(0, searchIndex)}${replacement}${source.slice(
    searchIndex + search.length
  )}`
}

test('pins the source and Worker initializing-match retry lifecycle', async () => {
  assert.deepEqual(matchInfoErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, runtime-test, and build requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceRegistry: replaceAfter(
        value.sourceRegistry,
        '  registerMatch(\n    matchID:',
        'initialized: false',
        'initialized: true'
      )
    },
    {
      ...value,
      sourceRegistry: replaceAfter(
        value.sourceRegistry,
        '  registerMatch(\n    p1address:',
        'initialized: true',
        'initialized: false'
      )
    },
    {
      ...value,
      sourceBrowserWorker: replaceAfter(
        value.sourceBrowserWorker,
        "case 'in_progress_match_info':",
        '}, 3000)',
        '}, 0)'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        "WHERE (status = 'creating'",
        "WHERE (status = 'active'"
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        "const initialized = row.status === 'active'",
        'const initialized = true'
      )
    },
    {
      ...value,
      workerGateway: value.workerGateway.replace(
        "pendingAddress.protocol === 'https:' ? 'wss:' : 'ws:'",
        "pendingAddress.protocol === 'https:' ? 'https:' : 'http:'"
      )
    },
    {
      ...value,
      workerRuntimeTest: replaceAfter(
        value.workerRuntimeTest,
        "it('preserves source initializing match info for the client retry loop'",
        'initialized: false',
        'initialized: true'
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
          ].replace('pnpm check:cloudflare:match-info && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchInfoErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
