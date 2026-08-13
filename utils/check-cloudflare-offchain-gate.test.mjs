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
      items:
        "inventoryOnly={env.AUTH_MODE === 'google'}; " +
        'useEffect(() => { window.scrollTo({ top: 0 }) }, [id])',
      silverExchange: "inventoryOnly={env.AUTH_MODE === 'google'}",
      goldExchange: "inventoryOnly={env.AUTH_MODE === 'google'}"
    },
    controls:
      "export const ItemsCardDetailsControls = env.AUTH_MODE === 'google' ? " +
      'IdentityItemsCardDetailsControls : LegacyItemsCardDetailsControls',
    identityControls:
      'const IdentityItemsCardDetailsControls = () => ' +
      'cardDetails.offchainInventory; IdentityItemsCardDetailsControls.displayName',
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
  referralStickerSource:
    'referral_sticker_active_schedule_entries; schedule.schedule_version; ' +
    'referral_sticker_reward_batch_schedule_receipts; INSERT INTO player_items',
  referralStickerContentSource:
    'FROM referral_sticker_active_schedule_entries WHERE season = ?',
  referralStickerScheduleMigration:
    'referral_sticker_schedule_versions; ' +
    "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')); " +
    'activated_by_user_id <> created_by_user_id; ' +
    'length(trim(NEW.activated_by_user_id)) = 0; ' +
    'schedule.activated_at <= batch_row.created_at; ' +
    'referral sticker schedule activation is invalid; ' +
    'active referral sticker schedule entries are immutable; ' +
    'active referral sticker schedule receipt required',
  leaderboardRewardSource:
    'leaderboard_reward_schedule_activations; ' +
    'LEADERBOARD_REWARD_POLICY_VERSION; LEADERBOARD_REWARD_POLICY_HASH; ' +
    'leaderboard_reward_cycle_policy_receipts; ' +
    'policy_activated_at <= now.toISOString(); ' +
    "crypto.subtle.digest(\n      'SHA-256'; " +
    'encoder.encode(`${seed}:${index}`); % pool.length; ' +
    'INSERT INTO player_items; award_key',
  leaderboardRewardPolicySource:
    'cloud-weasel-offchain-leaderboard-v1; ' +
    'leaderboardRewardsForRank(index + 1); ' +
    "card.set !== 'HEXBOUND_INVASION'; " +
    "ticket: ['SW_CONQUEST_TICKET', 2, 1]; " +
    'calculatedLeaderboardRewardPolicyHash; ' +
    "LEADERBOARD_REWARD_POLICY_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'",
  leaderboardRewardPolicyMigration:
    'leaderboard_reward_schedule_activations; ' +
    "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')); " +
    'activated_by_user_id <> created_by_user_id; ' +
    'leaderboard reward policy activation is invalid; ' +
    'leaderboard_reward_policy_card_ranges; ' +
    'leaderboard_reward_policy_cards; ' +
    'json_array_length(NEW.eligible_card_ids_json); ' +
    "WHEN json_extract(mode.value, '$.rank') = 1 THEN 10; " +
    "WHEN json_extract(mode.value, '$.rank') BETWEEN 101 AND 250 THEN 1; " +
    'leaderboard reward cycle creation is invalid; ' +
    'leaderboard reward snapshot is incomplete; ' +
    'active leaderboard reward policy receipt required; ' +
    'leaderboard reward cycle policy receipts are immutable; ' +
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  conquestV2RewardSource:
    'conquest_v2_reward_schedule_activations; ' +
    'CONQUEST_V2_REWARD_POLICY_VERSION; CONQUEST_V2_REWARD_POLICY_HASH; ' +
    'conquest_v2_reward_cycle_policy_receipts; ' +
    'schedule!.settings_version === schedule!.current_settings_version; ' +
    'resumableSchedule(database, now); ' +
    'value !==\n          conquestV2SilverCardCount(; ' +
    "crypto.subtle.digest(\n      'SHA-256'; " +
    'encoder.encode(`${seed}:${index}`); % pool.length; ' +
    'INSERT INTO player_items; award_key',
  conquestV2RewardPolicySource:
    'cloud-weasel-offchain-conquest-v2-v1; ' +
    'CONQUEST_V2_TREASURE_TOTAL_POINTS; ' +
    'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS; Math.fround; ' +
    "inventory: ['SW_SILVER_CARDS', 'card-id', 1]; " +
    "legacyUsdc: 'audit-only; player inventory and notification value are zero'; " +
    'calculatedConquestV2RewardPolicyHash; ' +
    "CONQUEST_V2_REWARD_POLICY_HASH = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'",
  conquestV2RewardPolicyMigration:
    'conquest_v2_reward_schedule_activations; ' +
    "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')); " +
    'activated_by_user_id <> created_by_user_id; ' +
    'settings.mutation_id = NEW.settings_mutation_id; ' +
    'NEW.silver_counts_json IS NOT OLD.silver_counts_json; ' +
    'conquest_v2_reward_policy_cards; ' +
    'conquest_v2_reward_cycle_policy_receipts; ' +
    'Conquest V2 reward cycle creation is invalid; ' +
    'Conquest V2 reward snapshot is incomplete; ' +
    'json_array_length(NEW.silver_card_ids_json) = CAST(json_extract(; ' +
    'active Conquest V2 reward policy receipt required; ' +
    'Conquest V2 reward cycle policy receipts are immutable; ' +
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  skypassRewardSource:
    'skypass_reward_active_rewards; skypass_reward_active_policies; ' +
    'SKYPASS_REWARD_POLICY_HASH; reward_policy_version; reward_policy_hash; ' +
    'stableRewardIndex; Math.imul(hash, 16777619); ' +
    'GMActivateSkypassRewards; item type has no off-chain SkyPass fulfillment',
  skypassRewardPolicySource:
    'cloud-weasel-offchain-skypass-v1; cardCatalog: cardLibrary.cards.map; ' +
    'starterDecks: STARTER_DECKS.map; fnv1a32(userId:rewardId:index); ' +
    "SW_BASE_CARDS: ['SW_BASE_CARDS', 'card-id', 'nonstackable']; " +
    "SW_CONQUEST_TICKET: ['SW_CONQUEST_TICKET', 2, 'stackable']; " +
    "SW_STICKERS: ['SW_STICKERS', 'token-id', 'stackable']; " +
    "chainEffects: 'none; every source mint queue is identity-owned D1 inventory'; " +
    'calculatedSkypassRewardPolicyHash; ' +
    "SKYPASS_REWARD_POLICY_HASH = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'",
  skypassRewardPolicyMigration:
    'skypass_reward_policy_versions; ' +
    "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')); " +
    'activated_by_user_id <> created_by_user_id; ' +
    'skypass_reward_active_policies; skypass_reward_active_rewards; ' +
    "SET status = 'ACTIVE'; " +
    'reward.item_type NOT IN (300, 302, 303, 401, 403, 405, 407, 500); ' +
    'Versioned SkyPass reward rows are immutable; ' +
    'active SkyPass sticker metadata is immutable; ' +
    'active SkyPass reward policy required; ' +
    'SkyPass claim policy receipt is immutable; ' +
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
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

test('rejects referral sticker fulfillment without reviewed schedule activation', () => {
  const input = validInput()
  input.referralStickerScheduleMigration =
    'referral_sticker_schedule_versions'
  input.referralStickerContentSource = 'FROM content_stickers WHERE season = ?'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('activated_by_user_id')))
  assert.ok(
    errors.some(error => error.includes('active referral sticker schedule'))
  )
  assert.ok(errors.some(error => error.includes('unactivated reward metadata')))
})

test('rejects leaderboard fulfillment without an approved exact policy', () => {
  const input = validInput()
  input.leaderboardRewardSource =
    'leaderboard_reward_schedule_activations; INSERT INTO player_items; award_key'
  input.leaderboardRewardPolicyMigration =
    'leaderboard_reward_schedule_activations'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('LEADERBOARD_REWARD_POLICY_HASH')))
  assert.ok(errors.some(error => error.includes('two') || error.includes('activated_by_user_id')))
  assert.ok(errors.some(error => error.includes('cycle policy receipts')))
})

test('rejects Conquest V2 fulfillment without approved settings and exact policy', () => {
  const input = validInput()
  input.conquestV2RewardSource =
    'conquest_v2_reward_schedule_activations; INSERT INTO player_items; award_key'
  input.conquestV2RewardPolicyMigration =
    'conquest_v2_reward_schedule_activations'
  const errors = offchainGateErrors(input)
  assert.ok(
    errors.some(error => error.includes('CONQUEST_V2_REWARD_POLICY_HASH'))
  )
  assert.ok(errors.some(error => error.includes('settings.mutation_id')))
  assert.ok(errors.some(error => error.includes('cycle policy receipts')))
})

test('rejects SkyPass fulfillment without an approved exact off-chain policy', () => {
  const input = validInput()
  input.skypassRewardSource = 'INSERT INTO player_items; delivery_key'
  input.skypassRewardPolicyMigration = 'skypass_reward_policy_versions'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('SKYPASS_REWARD_POLICY_HASH')))
  assert.ok(errors.some(error => error.includes('activated_by_user_id')))
  assert.ok(errors.some(error => error.includes('claim policy receipt')))
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
  input.identityCardDetails.identityControls =
    'const IdentityItemsCardDetailsControls = () => useTokenPriceAndSupply(); ' +
    'IdentityItemsCardDetailsControls.displayName'
  input.identityCardDetails.gradeRow = '<GradeRowPrices />'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('route items')))
  assert.ok(errors.some(error => error.includes('market control')))
  assert.ok(errors.some(error => error.includes('price or supply queries')))
})

test('rejects an Items card scroll effect that returns the browser result', () => {
  const input = validInput()
  input.identityCardDetails.routes.items =
    "inventoryOnly={env.AUTH_MODE === 'google'}; " +
    'useEffect(() => window.scrollTo({ top: 0 }), [id])'
  const errors = offchainGateErrors(input)
  assert.ok(errors.some(error => error.includes('non-cleanup value')))
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
