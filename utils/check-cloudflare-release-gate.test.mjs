import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { releaseGateErrors } from './check-cloudflare-release-gate.mjs'

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
