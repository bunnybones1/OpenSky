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
    'Apply the inventory change and fulfillment receipt in one D1 transaction.',
  pendingGoldSources: "env.AUTH_MODE === 'google'; Delivery in progress",
  silverExchangeUi:
    "env.AUTH_MODE !== 'google'; if (env.AUTH_MODE === 'google') { " +
    'identityClient.exchangeSilverCardsForTickets(); return } ' +
    'AuthenticationClient.wallet',
  rewardSources: {
    example:
      'INSERT INTO player_items; const delivery_token = crypto.randomUUID()'
  }
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
    offchainGateErrors(input).some(error =>
      error.includes('fulfillment receipt')
    )
  )
})

test('rejects a reward producer without D1 inventory and a receipt key', () => {
  const input = validInput()
  input.rewardSources = { unsafe: 'wallet.sendTransaction([])' }
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('canonical D1 inventory')))
  assert.ok(errors.some(error => error.includes('idempotent receipt key')))
  assert.ok(errors.some(error => error.includes('legacy transaction code')))
})

test('rejects player-facing mint language from Google Pending Gold UI', () => {
  const input = validInput()
  input.pendingGoldSources = "t('shop.Minting In')"
  assert.ok(
    offchainGateErrors(input).some(error => error.includes('Pending Gold'))
  )
})

test('rejects a Google Silver exchange that can fall through to a wallet', () => {
  const input = validInput()
  input.silverExchangeUi =
    "if (env.AUTH_MODE === 'google') { " +
    'identityClient.exchangeSilverCardsForTickets() } AuthenticationClient.wallet'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('legacy wallet path')))
  assert.ok(errors.some(error => error.includes('legacy payment catalog')))
})
