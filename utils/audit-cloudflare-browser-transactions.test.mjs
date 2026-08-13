import assert from 'node:assert/strict'
import test from 'node:test'

import { browserTransactionAuditErrors } from './audit-cloudflare-browser-transactions.mjs'

const silverFile =
  'SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversControlsRow/components/ConfirmConvertSilverCardsDialog.tsx'

const reviewedSources = {
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/useConfirmHeroMintOrder.ts':
    "if (env.AUTH_MODE === 'google') { identityClient.exchangeGoldCardsForHeroSkins(); return } getHeroMintTxns(); useSendTransactions()",
  'MarketPage/ViewOrderButton/CartDialog/components/CartControlsRow.tsx':
    'wallet.sendTransaction()',
  'PurchaseConquestPage/PurchaseWithUSDCDialog/hooks/useProcessConquestUSDCOrder.ts':
    'prepareOnChainInItemsTransaction(); wallet.sendTransaction(); prepareOnChainInCurrencyTransaction(); wallet.sendTransaction()',
  [silverFile]:
    "if (env.AUTH_MODE === 'google') { identityClient.exchangeSilverCardsForTickets(); return } AuthenticationClient.wallet; prepareOnChainInItemsTransaction(); wallet.sendTransaction()",
  'SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseButtons/hooks/useProcessSPUSDCOrder.ts':
    'prepareOnChainInItemsTransaction(); wallet.sendTransaction(); prepareOnChainInCurrencyTransaction(); wallet.sendTransaction()',
  'clients/AuthenticationClient/AuthenticationClient.ts':
    'prepareTransferAssetsFromBurnerTransaction(); wallet.sendTransaction()',
  'clients/AuthenticationClient/Wallet/Wallet.ts':
    'signer.sendTransaction(); burnerWallet.sendTransaction()',
  'shared/components/BasketDialog/BasketDialog.tsx': 'wallet.sendTransaction()',
  'shared/hooks/market/useSendTransactions.ts': 'wallet.sendTransaction()'
}

test('accepts the complete reviewed browser transaction map', () => {
  assert.deepEqual(
    browserTransactionAuditErrors({
      sources: reviewedSources,
      identityRoutes: 'export const IdentityApp = () => <Routes />',
      skypassPurchaseControls: ''
    }),
    []
  )
})

test('rejects new, expanded, and Google-routable transaction surfaces', () => {
  const sources = {
    ...reviewedSources,
    'NewRewardPage.tsx': 'wallet.sendTransaction()'
  }
  sources[
    'MarketPage/ViewOrderButton/CartDialog/components/CartControlsRow.tsx'
  ] += '; wallet.sendTransaction()'
  sources[silverFile] =
    "if (env.AUTH_MODE === 'google') { identityClient.exchangeSilverCardsForTickets() } AuthenticationClient.wallet; prepareOnChainInItemsTransaction(); wallet.sendTransaction()"
  sources[
    'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/useConfirmHeroMintOrder.ts'
  ] =
    "if (env.AUTH_MODE === 'google') { identityClient.exchangeGoldCardsForHeroSkins() } getHeroMintTxns(); useSendTransactions()"
  const errors = browserTransactionAuditErrors({
    sources,
    identityRoutes: 'import { MarketPage } from "~/MarketPage/MarketPage"',
    skypassPurchaseControls: ''
  })
  assert.ok(errors.some(error => error.includes('unreviewed browser')))
  assert.ok(errors.some(error => error.includes('reviewed count')))
  assert.ok(errors.some(error => error.includes('MarketPage')))
  assert.ok(errors.some(error => error.includes('exits through D1 first')))
  assert.ok(errors.some(error => error.includes('Hero callsite')))
})

test('allows SkyPass page only with an identity control substitution', () => {
  const identityRoutes =
    'import { SkyPassPurchasePage } from "~/SkyPassPurchasePage/SkyPassPurchasePage"'
  assert.deepEqual(
    browserTransactionAuditErrors({
      sources: reviewedSources,
      identityRoutes,
      skypassPurchaseControls:
        "env.AUTH_MODE === 'google' ? IdentitySkyPassPurchaseButtons : LegacySkyPassPurchaseButtons"
    }),
    []
  )
  assert.ok(
    browserTransactionAuditErrors({
      sources: reviewedSources,
      identityRoutes,
      skypassPurchaseControls: 'LegacySkyPassPurchaseButtons'
    }).some(error => error.includes('control substitution'))
  )
})
