import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deploymentVerificationErrors,
  extractEntryPath,
  verifyDeploymentWithRetries
} from './verify-cloudflare-deployment.mjs'

const html = entry => `<script type="module" src="${entry}"></script>`
const noStoreHeaders = {
  'cache-control': 'no-store',
  'cloudflare-cdn-cache-control': 'no-store'
}
const immutableHeaders = {
  'cache-control': 'public, max-age=31536000, immutable',
  'cloudflare-cdn-cache-control': 'public, max-age=31536000, immutable'
}
const localeBody = '{"identityAuth":{"continueWithGoogle":"Continue"}}\n'

const valid = () => ({
  localWebHtml: html('/assets/index-11111111.js'),
  localGameHtml: html('/game/cloudflare/assets/index-22222222.js'),
  remoteWeb: {
    status: 200,
    headers: noStoreHeaders,
    body: html('/assets/index-11111111.js')
  },
  remoteGame: {
    status: 200,
    headers: noStoreHeaders,
    body: html('/game/cloudflare/assets/index-22222222.js')
  },
  remoteWebAsset: { status: 200, headers: immutableHeaders },
  remoteGameAsset: { status: 200, headers: immutableHeaders },
  localLocales: { en: localeBody },
  remoteLocales: {
    en: { status: 200, headers: noStoreHeaders, body: localeBody }
  }
})

test('extracts web and nested game entry assets', () => {
  assert.equal(
    extractEntryPath(html('/assets/index-abcdef12.js')),
    '/assets/index-abcdef12.js'
  )
  assert.equal(
    extractEntryPath(html('/game/cloudflare/assets/index-12345678.js')),
    '/game/cloudflare/assets/index-12345678.js'
  )
})

test('accepts the exact tested deployment and cache policy', () => {
  assert.deepEqual(deploymentVerificationErrors(valid()).errors, [])
})

test('rejects stale manifests, cacheable HTML, and unhashed asset policy', () => {
  const input = valid()
  input.remoteWeb.body = html('/assets/index-33333333.js')
  input.remoteGame.status = 404
  input.remoteGame.headers = { 'cache-control': 'max-age=60' }
  input.remoteWebAsset.headers = { 'cache-control': 'max-age=0' }
  input.remoteGameAsset.status = 500
  input.remoteLocales.en = {
    status: 200,
    headers: { 'cache-control': 'max-age=60' },
    body: `${localeBody}stale`
  }

  const errors = deploymentVerificationErrors(input).errors
  assert.ok(errors.some(error => error.includes('does not match tested')))
  assert.ok(errors.some(error => error.includes('returned HTTP 404')))
  assert.ok(errors.some(error => error.includes('not browser no-store')))
  assert.ok(
    errors.some(error => error.includes('not Cloudflare edge no-store'))
  )
  assert.ok(errors.some(error => error.includes('not browser immutable')))
  assert.ok(errors.some(error => error.includes('returned HTTP 500')))
  assert.ok(errors.some(error => error.includes('locale does not match')))
  assert.ok(
    errors.some(error => error.includes('locale is not browser no-store'))
  )
  assert.ok(
    errors.some(error =>
      error.includes('locale is not Cloudflare edge no-store')
    )
  )
})

test('retries a transient edge propagation mismatch and then succeeds', async () => {
  let verificationCalls = 0
  let sleepCalls = 0
  const stale = { errors: ['production game entry is stale'] }
  const current = { errors: [], localWebEntry: 'web', localGameEntry: 'game' }

  const verification = await verifyDeploymentWithRetries({
    verify: async () => (++verificationCalls < 3 ? stale : current),
    maxAttempts: 4,
    retryDelayMs: 1,
    sleep: async delay => {
      assert.equal(delay, 1)
      sleepCalls += 1
    }
  })

  assert.equal(verification.attempts, 3)
  assert.equal(verification.result, current)
  assert.equal(sleepCalls, 2)
})

test('remains fail-closed when production never converges', async () => {
  const stale = { errors: ['production game entry is stale'] }
  let verificationCalls = 0

  const verification = await verifyDeploymentWithRetries({
    verify: async () => {
      verificationCalls += 1
      return stale
    },
    maxAttempts: 3,
    retryDelayMs: 0,
    sleep: async () => undefined
  })

  assert.equal(verification.attempts, 3)
  assert.equal(verificationCalls, 3)
  assert.equal(verification.result, stale)
})
