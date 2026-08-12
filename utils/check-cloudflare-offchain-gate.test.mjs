import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { offchainGateErrors } from './check-cloudflare-offchain-gate.mjs'

const validInput = () => ({
  webappConfig: { AUTH_MODE: 'google', AUTO_REGISTER_WALLET: false },
  identityRoutes: 'export const IdentityApp = () => <Routes />',
  appSource: "env.AUTH_MODE === 'google' ? <IdentityApp /> : <LegacyApp />",
  policySource:
    'D1 inventory is the canonical authority. ' +
    'No game flow asks a player to mint a reward. ' +
    'Apply the inventory change and fulfillment receipt in one D1 transaction.'
})

test('current Cloudflare identity routing satisfies the off-chain gate', async () => {
  const [configSource, identityRoutes, appSource, policySource] =
    await Promise.all([
      readFile('webapp/config/webapp.cloudflare.json', 'utf8'),
      readFile('webapp/src/IdentitySession/IdentityApp.tsx', 'utf8'),
      readFile('webapp/src/App.tsx', 'utf8'),
      readFile('docs/OFFCHAIN_REWARD_POLICY.md', 'utf8')
    ])
  assert.deepEqual(
    offchainGateErrors({
      webappConfig: JSON.parse(configSource),
      identityRoutes,
      appSource,
      policySource
    }),
    []
  )
})

test('rejects wallet auth and automatic wallet registration', () => {
  const input = validInput()
  input.webappConfig = {
    AUTH_MODE: 'legacy-wallet',
    AUTO_REGISTER_WALLET: true
  }
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('AUTH_MODE')))
  assert.ok(errors.some(error => error.includes('auto-register')))
})

test('rejects a legacy purchase or transaction path in IdentityApp', () => {
  const input = validInput()
  input.identityRoutes = `
    import { SkyPassPurchasePage } from '../SkyPassPurchasePage'
    APIClient.opensky.prepareOnChainTransaction()
    wallet.sendTransaction([])
  `
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('SkyPassPurchasePage')))
  assert.ok(errors.some(error => error.includes('prepareOnChain')))
  assert.ok(errors.some(error => error.includes('sendTransaction')))
})

test('rejects removal of an off-chain grant invariant', () => {
  const input = validInput()
  input.policySource = 'D1 inventory is the canonical authority.'
  assert.ok(
    offchainGateErrors(input).some(error => error.includes('fulfillment receipt'))
  )
})
