import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { openExistingCache } from '../webapp/src/AppLayout/Widgets/GameCacheWidget/utils/openExistingCache.ts'
import { reportCachePrune } from '../webapp/src/AppLayout/Widgets/GameCacheWidget/utils/reportCachePrune.ts'

test('treats a missing optional browser cache as a normal no-op', async () => {
  let openCalls = 0
  const cache = await openExistingCache(
    {
      has: async cacheName => {
        assert.equal(cacheName, 'webapp-images')
        return false
      },
      open: async () => {
        openCalls += 1
        return {}
      }
    },
    'webapp-images'
  )

  assert.equal(cache, undefined)
  assert.equal(openCalls, 0)
})

test('opens an existing browser cache for the preserved pruning pass', async () => {
  const expectedCache = { name: 'game-resources' }
  const calls = []
  const cache = await openExistingCache(
    {
      has: async cacheName => {
        calls.push(`has:${cacheName}`)
        return true
      },
      open: async cacheName => {
        calls.push(`open:${cacheName}`)
        return expectedCache
      }
    },
    'game-resources'
  )

  assert.equal(cache, expectedCache)
  assert.deepEqual(calls, ['has:game-resources', 'open:game-resources'])
})

test('does not warn when an existing cache has nothing to prune', () => {
  const warnings = []

  reportCachePrune(0, 'game-resources assets', message =>
    warnings.push(message)
  )

  assert.deepEqual(warnings, [])
})

test('preserves the warning when stale cache entries are pruned', () => {
  const warnings = []

  reportCachePrune(2, 'asset manifests', message => warnings.push(message))

  assert.deepEqual(warnings, ['Found 2 asset manifests to prune.'])
})

test('both pruning paths use the tested existing-cache boundary', async () => {
  const source = await readFile(
    'webapp/src/AppLayout/Widgets/GameCacheWidget/utils/pruneOutdatedFromCache.ts',
    'utf8'
  )

  assert.equal(
    source.match(/openExistingCache\(window\.caches, cacheName\)/g)?.length,
    2
  )
  assert.equal(source.match(/reportCachePrune\(numPruned,/g)?.length, 2)
  assert.doesNotMatch(source, /No cache named/)
  assert.doesNotMatch(source, /window\.caches\.open\(cacheName\)/)
  assert.doesNotMatch(source, /console\.warn\(`Found \$\{numPruned\}/)
})
