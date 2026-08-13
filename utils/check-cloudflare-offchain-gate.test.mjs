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
    'Every preserved source behavior that required minting grants an equivalent off-chain item or entitlement. ' +
    'Apply the inventory change and fulfillment receipt in one D1 transaction. ' +
    'Google-auth product copy describes these items.',
  pendingGoldSources:
    'play.gameModes.CONQUEST.pendingGoldsOffchain; ' +
    'play.noDeliveriesPending; play.deliveryIn; play.deliveryInProgress',
  silverExchangeUi:
    "env.AUTH_MODE !== 'google'; if (env.AUTH_MODE === 'google') { " +
    'identityClient.exchangeSilverCardsForTickets(); return } ' +
    'AuthenticationClient.wallet',
  silverExchangeReview: {
    list: "env.AUTH_MODE === 'google'; play.exchangeRate; play.ticketsReceived",
    row:
      "env.AUTH_MODE === 'google' ? (play.silverExchangeRate) : " +
      "(<CardPrice />); env.AUTH_MODE === 'google' ? " +
      '(play.silverTicketsReceived) : (<CardPrice />)',
    total:
      "env.AUTH_MODE === 'google'; play.silverExchangeFinal; " +
      'play.silverExchangeFinalTooltip',
    confirm: "env.AUTH_MODE === 'google'; play.silverExchangeWarning",
    locale:
      'Exchange Rate; 1 Silver → 1 Ticket; Tickets Received; ' +
      'delivered immediately to your Cloud Weasel inventory'
  },
  heroExchangeUi:
    "if (env.AUTH_MODE === 'google') { " +
    'identityClient.exchangeGoldCardsForHeroSkins(); return } ' +
    'getHeroMintTxns()',
  identityCardDetails: {
    routes: {
      items: "inventoryOnly={env.AUTH_MODE === 'google'}",
      silverExchange: "inventoryOnly={env.AUTH_MODE === 'google'}",
      goldExchange: "inventoryOnly={env.AUTH_MODE === 'google'}"
    },
    controls:
      'const IdentityItemsCardDetailsControls = () => ' +
      'cardDetails.offchainInventory; IdentityItemsCardDetailsControls.displayName; ' +
      "export const ItemsCardDetailsControls = env.AUTH_MODE === 'google' ? " +
      'IdentityItemsCardDetailsControls : LegacyItemsCardDetailsControls',
    tokenInfo:
      'inventoryOnly?: boolean; cardDetails.inventoryBalance; !inventoryOnly',
    gradeRow:
      '!inventoryOnly && (<GradeRowPrices /><GradeRowSupply />' +
      '<GradeRowTotalSupply />)',
    gradeLabel: "${inventoryOnly ? 'Offchain' : ''}",
    locale:
      'cardDetails.offchainInventory; cardDetails.inventoryBalance; ' +
      'cardDetails.baseExplanationOffchain; ' +
      'cardDetails.goldExplanationOffchain; ' +
      'cardDetails.silverExplanationOffchain'
  },
  googleRewardUi: {
    conquestInfo:
      "env.AUTH_MODE === 'google'; play.delayedGoldDelivery; " +
      'tooltip.conquestRulesLineSevenOffchain; ' +
      'play.rewards.levelWeeklyTreasureLineTwoOffchain',
    weeklyGoldCard:
      "env.AUTH_MODE === 'google'; generic.Collected; " +
      'play.conquestWeeklyGoldsOffchain',
    rewardFeed:
      "env.AUTH_MODE === 'google'; play.delayedDelivery; " +
      'play.completedDeliveryNumCards; play.completedDeliverySpecificCard',
    goldCardTooltip:
      "env.AUTH_MODE === 'google'; " +
      'tooltip.goldCardsExplainerLineOneOffchain; ' +
      'tooltip.goldCardsExplainerLineTwoOffchain',
    silverCardTooltip:
      "env.AUTH_MODE === 'google'; " +
      'tooltip.silverCardsExplainerLineOneOffchain; ' +
      'tooltip.silverCardsExplainerLineTwoOffchain',
    conquestProgressTooltip:
      "env.AUTH_MODE === 'google'; tooltip.progressionInfoOffchain",
    conquestPointsExplanation:
      "env.AUTH_MODE === 'google'; play.conquestDeckPointsTooltipMessageOffchain",
    conquestTreasureTooltip:
      "env.AUTH_MODE === 'google'; play.treasureToolTipHeaderOffchain",
    conquestTreasureReward:
      "env.AUTH_MODE !== 'google'; play.treasureRewardsInactive",
    conquestNotifications: "env.AUTH_MODE === 'google'",
    conquestRewardFeed: "env.AUTH_MODE !== 'google'",
    tradableBadge: "if (env.AUTH_MODE === 'google') return null",
    skypassThumbnail: "env.AUTH_MODE !== 'google'",
    skypassClaim:
      "const onDialogClose = () => { if (env.AUTH_MODE === 'google') return; " +
      'openConversionDialog() }; ' +
      "else if (env.AUTH_MODE !== 'google' && reward) { " +
      'if (!!shouldSeeConversionDialog()) { openConversionDialog() } }'
  },
  googleRewardCopy: [
    'Collected',
    'Cards were delivered',
    'Collectible items are stored in Cloud Weasel inventory'
  ],
  rewardSources: {
    example:
      'INSERT INTO player_items; const delivery_token = crypto.randomUUID()'
  },
  questRewardSource:
    'player_quest_claim_batches; player_quest_claim_receipts; ' +
    "player_friend_points; 'SW_STICKER_POINTS'; status = 'COMPLETED'",
  questReceiptMigration:
    'PRIMARY KEY (user_id, quest_key); ' +
    'quest claim receipts are immutable; ' +
    'quest claim batch completion is invalid',
  matchRewardSource:
    'multiplayer_match_experience_players; settlement_token; ' +
    "player_friend_points; 'SW_STICKER_POINTS'",
  matchReceiptMigration:
    'match experience player receipts are immutable; ' +
    'match experience completion is invalid; ' +
    'match experience receipts are immutable',
  conquestPointSource:
    'multiplayer_match_conquest_point_players; settlement_token; POINTS_CAP',
  conquestPointMigration:
    'match Conquest point player receipts are immutable; ' +
    'match Conquest point completion is invalid; ' +
    'match Conquest point receipts are immutable',
  observationalSources: {
    analytics: 'INSERT INTO multiplayer_match_analytics'
  },
  optionalWalletSource:
    "methods: ['personal_sign']; swaps: false; onramp: false; " +
    'receive: false; send: false; analytics: false'
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

test('rejects quest XP without an immutable exactly-once receipt', () => {
  const input = validInput()
  input.questRewardSource = 'UPDATE player_profiles SET xp = xp + 100'
  input.questReceiptMigration = 'CREATE TABLE claims (id TEXT)'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('grant is missing')))
  assert.ok(errors.some(error => error.includes('schema is missing')))
})

test('rejects a chain effect from the quest XP grant', () => {
  const input = validInput()
  input.questRewardSource += '; sendTransaction()'
  assert.ok(
    offchainGateErrors(input).some(error => error.includes('chain effect'))
  )
})

test('rejects match XP without atomic immutable player receipts', () => {
  const input = validInput()
  input.matchRewardSource = 'UPDATE player_profiles SET xp = xp + 50'
  input.matchReceiptMigration = 'CREATE TABLE match_rewards (id TEXT)'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('match XP grant is missing')))
  assert.ok(errors.some(error => error.includes('match XP receipt schema')))
})

test('rejects a chain effect from the match XP grant', () => {
  const input = validInput()
  input.matchRewardSource += '; sendTransaction()'
  assert.ok(
    offchainGateErrors(input).some(error =>
      error.includes('match XP grant contains a legacy chain effect')
    )
  )
})

test('rejects Conquest points without capped immutable player receipts', () => {
  const input = validInput()
  input.conquestPointSource =
    'UPDATE player_conquest_points SET current_points = current_points + 4'
  input.conquestPointMigration = 'CREATE TABLE point_rewards (id TEXT)'
  const errors = offchainGateErrors(input)
  assert.ok(
    errors.some(error => error.includes('Conquest point grant is missing'))
  )
  assert.ok(
    errors.some(error => error.includes('Conquest point receipt schema'))
  )
})

test('rejects player inventory writes from an observational pipeline', () => {
  const input = validInput()
  input.observationalSources = {
    analytics: 'INSERT INTO player_items; wallet.sendTransaction([])'
  }
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('mutate player rewards')))
  assert.ok(errors.some(error => error.includes('transaction code')))
})

test('rejects transaction capabilities from the optional wallet integration', () => {
  const input = validInput()
  input.optionalWalletSource =
    "methods: ['personal_sign', 'eth_sendTransaction']; swaps: true; " +
    'onramp: false; receive: false; send: true; analytics: true; ' +
    'wallet_sendCalls()'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('swaps: false')))
  assert.ok(errors.some(error => error.includes('send: false')))
  assert.ok(errors.some(error => error.includes('eth_sendTransaction')))
  assert.ok(errors.some(error => error.includes('wallet_sendCalls')))
})

test('rejects player-facing mint language from Google Pending Gold UI', () => {
  const input = validInput()
  input.pendingGoldSources += "; t('shop.MintingIn')"
  assert.ok(
    offchainGateErrors(input).some(error => error.includes('Pending Gold'))
  )
})

test('requires all Pending Gold delivery copy to stay off-chain', () => {
  const input = validInput()
  input.pendingGoldSources = 'play.deliveryInProgress'
  assert.ok(
    offchainGateErrors(input).some(error =>
      error.includes('missing off-chain delivery copy')
    )
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

test('rejects wallet-market language from the Google Silver review', () => {
  const input = validInput()
  input.silverExchangeReview = {
    list: 'generic.UnitPrice; generic.Subtotal',
    row: '<CardPrice />',
    total: 'shop.salesAreFinal',
    confirm: 'play.convertSilverWarning',
    locale: 'A legacy transaction'
  }
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('review list')))
  assert.ok(errors.some(error => error.includes('review row')))
  assert.ok(errors.some(error => error.includes('review total')))
  assert.ok(errors.some(error => error.includes('review confirm')))
  assert.ok(errors.some(error => error.includes('review locale')))
  assert.ok(errors.some(error => error.includes('legacy CardPrice branches')))
  assert.ok(errors.some(error => error.includes('wallet market pricing')))
})

test('rejects a Google Hero exchange that can fall through to a wallet', () => {
  const input = validInput()
  input.heroExchangeUi =
    "if (env.AUTH_MODE === 'google') { " +
    'identityClient.exchangeGoldCardsForHeroSkins() } getHeroMintTxns()'
  assert.ok(
    offchainGateErrors(input).some(error => error.includes('Hero exchange'))
  )
})

test('rejects market queries from Google inventory card details', () => {
  const input = validInput()
  input.identityCardDetails.routes.items = '<CardDetailsPage />'
  input.identityCardDetails.controls =
    'const IdentityItemsCardDetailsControls = () => useTokenPriceAndSupply(); ' +
    'IdentityItemsCardDetailsControls.displayName; ' +
    "export const ItemsCardDetailsControls = env.AUTH_MODE === 'google' ? " +
    'IdentityItemsCardDetailsControls : LegacyItemsCardDetailsControls'
  input.identityCardDetails.gradeRow = '<GradeRowPrices />'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('route items')))
  assert.ok(errors.some(error => error.includes('market control')))
  assert.ok(errors.some(error => error.includes('price or supply queries')))
})

test('requires off-chain card-detail tooltips and copy', () => {
  const input = validInput()
  input.identityCardDetails.gradeLabel = 'cardDetails.goldExplanation'
  input.identityCardDetails.locale = 'cardDetails.inventoryBalance'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('off-chain copy')))
  assert.ok(errors.some(error => error.includes('offchainInventory')))
})

test('rejects legacy ownership language from Google reward surfaces', () => {
  const input = validInput()
  input.googleRewardUi.tradableBadge = 'return <TradableBadge />'
  input.googleRewardCopy = ['This reward is minted to your blockchain wallet']
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('tradableBadge')))
  assert.ok(errors.some(error => error.includes('ownership language')))
})

test('rejects a SkyPass claim that can prompt Google identities for wallet conversion', () => {
  const input = validInput()
  input.googleRewardUi.skypassClaim = 'openConversionDialog()'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('skypassClaim')))
  assert.ok(errors.some(error => error.includes('card dialog')))
  assert.ok(errors.some(error => error.includes('item claim')))
})

test('requires both SkyPass wallet-conversion exits to stay Google-guarded', () => {
  const input = validInput()
  input.googleRewardUi.skypassClaim =
    "const onDialogClose = () => { if (env.AUTH_MODE === 'google') return; " +
    'openConversionDialog() }; ' +
    'else if (reward) { if (!!shouldSeeConversionDialog()) { ' +
    'openConversionDialog() } }'
  let errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('item claim')))
  assert.ok(!errors.some(error => error.includes('card dialog')))

  input.googleRewardUi.skypassClaim =
    'const onDialogClose = () => { openConversionDialog() }; ' +
    "else if (env.AUTH_MODE !== 'google' && reward) { " +
    'if (!!shouldSeeConversionDialog()) { openConversionDialog() } }'
  errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('card dialog')))
  assert.ok(!errors.some(error => error.includes('item claim')))
})
