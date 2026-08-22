import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  assetCachePolicyErrors,
  releaseGateErrors
} from './check-cloudflare-release-gate.mjs'

test('production browser and matchmaker use the same release', async () => {
  const config = JSON.parse(
    await readFile('matchmaker-ts/wrangler.jsonc', 'utf8')
  )
  assert.deepEqual(releaseGateErrors(config), [])
})

test('fails closed when a custom browser release differs from matchmaker', () => {
  const errors = releaseGateErrors(
    { vars: { EXPECTED_RELEASE_VERSION: 'cloudflare' } },
    { RELEASE_VERSION: 'new-release' }
  )
  assert.match(errors[0], /does not match/)
})

test('compares the embedded GITCOMMIT used by queue messages', () => {
  assert.deepEqual(
    releaseGateErrors(
      { vars: { EXPECTED_RELEASE_VERSION: 'release-42' } },
      { RELEASE_VERSION: 'asset-path', GITCOMMIT: 'RELEASE-42' }
    ),
    []
  )
})

test('rejects a missing or unsafe matchmaker release', () => {
  assert.match(releaseGateErrors({ vars: {} })[0], /must be/)
  assert.match(
    releaseGateErrors({ vars: { EXPECTED_RELEASE_VERSION: '../unsafe' } })[0],
    /must be/
  )
})

test('accepts the release-safe static asset cache boundary', async () => {
  const [workerConfig, workerSource, cachePolicySource] = await Promise.all([
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('cloudflare/src/asset-cache.ts', 'utf8')
  ])

  assert.deepEqual(
    assetCachePolicyErrors(workerConfig, workerSource, cachePolicySource),
    []
  )
})

test('rejects cache policy bypasses and cacheable HTML or locales', async () => {
  const [workerConfig, workerSource, cachePolicySource] = await Promise.all([
    readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
    readFile('cloudflare/src/index.ts', 'utf8'),
    readFile('cloudflare/src/asset-cache.ts', 'utf8')
  ])
  const errors = assetCachePolicyErrors(
    {
      ...workerConfig,
      assets: { ...workerConfig.assets, run_worker_first: ['/api/*'] }
    },
    workerSource.replace(
      'applyAssetCachePolicy(request, await env.ASSETS.fetch(request))',
      'env.ASSETS.fetch(request)'
    ),
    cachePolicySource
      .replaceAll("'no-store'", "'public, max-age=60'")
      .replace("startsWith('/locales/')", "startsWith('/translations/')")
  )

  assert.ok(errors.some(error => error.includes('run through the Worker')))
  assert.ok(errors.some(error => error.includes('bypass')))
  assert.ok(errors.some(error => error.includes("'no-store'")))
  assert.ok(errors.some(error => error.includes("startsWith('/locales/')")))
})
