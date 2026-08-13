import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LEGACY_TRANSACTION_SURFACES = ['PurchaseConquestPage']

const TRANSACTION_PATTERNS = [
  /prepareOnChain/i,
  /prepareTransferAssets/i,
  /sendTransaction/i,
  /MintHero/i,
  /PurchaseWithUSDC/i,
  /ProcessSPUSDC/i
]

const GOOGLE_REWARD_UI_REQUIREMENTS = {
  conquestInfo: [
    "env.AUTH_MODE === 'google'",
    'play.delayedGoldDelivery',
    'tooltip.conquestRulesLineSevenOffchain',
    'play.rewards.levelWeeklyTreasureLineTwoOffchain'
  ],
  weeklyGoldCard: [
    "env.AUTH_MODE === 'google'",
    'generic.Collected',
    'play.conquestWeeklyGoldsOffchain'
  ],
  rewardFeed: [
    "env.AUTH_MODE === 'google'",
    'play.delayedDelivery',
    'play.completedDeliveryNumCards',
    'play.completedDeliverySpecificCard'
  ],
  goldCardTooltip: [
    "env.AUTH_MODE === 'google'",
    'tooltip.goldCardsExplainerLineOneOffchain',
    'tooltip.goldCardsExplainerLineTwoOffchain'
  ],
  silverCardTooltip: [
    "env.AUTH_MODE === 'google'",
    'tooltip.silverCardsExplainerLineOneOffchain',
    'tooltip.silverCardsExplainerLineTwoOffchain'
  ],
  conquestProgressTooltip: [
    "env.AUTH_MODE === 'google'",
    'tooltip.progressionInfoOffchain'
  ],
  conquestPointsExplanation: [
    "env.AUTH_MODE === 'google'",
    'play.conquestDeckPointsTooltipMessageOffchain'
  ],
  conquestTreasureTooltip: [
    "env.AUTH_MODE === 'google'",
    'play.treasureToolTipHeaderOffchain'
  ],
  conquestTreasureReward: [
    "env.AUTH_MODE !== 'google'",
    'play.treasureRewardsInactive'
  ],
  conquestNotifications: ["env.AUTH_MODE === 'google'"],
  conquestRewardFeed: ["env.AUTH_MODE !== 'google'"],
  tradableBadge: ["env.AUTH_MODE === 'google') return null"],
  skypassThumbnail: ["env.AUTH_MODE !== 'google'"],
  skypassClaim: [
    "env.AUTH_MODE === 'google') return",
    "env.AUTH_MODE !== 'google'",
    'openConversionDialog'
  ],
  skypassPurchaseInfo: [
    "env.AUTH_MODE === 'google'",
    'skypass.premiumDescOffchain'
  ],
  skypassCardBackDetail: [
    "env.AUTH_MODE !== 'google'",
    'skypass.detailsDescsOffchain.CardBack'
  ],
  skypassExpansionDetail: ["env.AUTH_MODE !== 'google'"],
  skypassStickerDetail: [
    "env.AUTH_MODE !== 'google'",
    'skypass.detailsDescsOffchain.NewSticker'
  ],
  skypassSilverDetail: [
    "env.AUTH_MODE !== 'google'",
    'skypass.detailsDescsOffchain.SilverCard'
  ]
}

const OPTIONAL_WALLET_REQUIREMENTS = [
  "methods: ['personal_sign']",
  'swaps: false',
  'onramp: false',
  'receive: false',
  'send: false',
  'analytics: false'
]

const OPTIONAL_WALLET_FORBIDDEN_PATTERNS = [
  /eth_sendTransaction/i,
  /eth_signTransaction/i,
  /wallet_sendCalls/i,
  /sendTransaction/i,
  /AuthenticationClient/,
  /useSendTransactions/
]

export const offchainGateErrors = ({
  webappConfig,
  identityRoutes,
  appSource,
  policySource,
  pendingGoldSources = '',
  silverExchangeUi = '',
  silverExchangeReview = {},
  heroExchangeUi = '',
  identityCardDetails = {},
  googleRewardUi = {},
  googleRewardCopy = [],
  rewardSources = {},
  questRewardSource = '',
  questReceiptMigration = '',
  matchRewardSource = '',
  matchReceiptMigration = '',
  conquestPointSource = '',
  conquestPointMigration = '',
  referralStickerSource = '',
  referralStickerContentSource = '',
  referralStickerScheduleMigration = '',
  leaderboardRewardSource = '',
  leaderboardRewardPolicySource = '',
  leaderboardRewardPolicyMigration = '',
  conquestV2RewardSource = '',
  conquestV2RewardPolicySource = '',
  conquestV2RewardPolicyMigration = '',
  skypassRewardSource = '',
  skypassRewardPolicySource = '',
  skypassRewardPolicyMigration = '',
  observationalSources = {},
  optionalWalletSource = '',
  skypassCommerce = {}
}) => {
  const errors = []
  if (webappConfig?.AUTH_MODE !== 'google') {
    errors.push('Cloudflare webapp AUTH_MODE must remain google')
  }
  if (webappConfig?.AUTO_REGISTER_WALLET !== false) {
    errors.push('Cloudflare webapp must not auto-register a wallet')
  }
  if (
    !/env\.AUTH_MODE\s*===\s*['"]google['"]\s*\?\s*<IdentityApp\s*\/>/.test(
      appSource
    )
  ) {
    errors.push('App must route Google auth through IdentityApp')
  }
  for (const surface of LEGACY_TRANSACTION_SURFACES) {
    if (identityRoutes.includes(surface)) {
      errors.push(`IdentityApp must not import or render ${surface}`)
    }
  }
  for (const pattern of TRANSACTION_PATTERNS) {
    if (pattern.test(identityRoutes)) {
      errors.push(
        `IdentityApp contains legacy transaction code: ${pattern.source}`
      )
    }
  }
  if (identityRoutes.includes('SkyPassPurchasePage')) {
    const required = {
      controls: [
        "env.AUTH_MODE === 'google'",
        'IdentitySkyPassPurchaseButtons',
        'LegacySkyPassPurchaseButtons'
      ],
      identityControls: [
        'identityClient.createPremiumSkyPassCheckout',
        'purchaseSkypass.unavailable'
      ],
      playerApi: [
        '/api/player/commerce/capabilities',
        '/api/player/commerce/skypass/checkout',
        'premiumSkypassCommerceCapability'
      ],
      stripe: [
        'amountTotal: 1_495',
        "currency: 'usd'",
        'Stripe Checkout Session price does not match product policy',
        'Stripe payment price does not match product policy'
      ],
      priceMigration: [
        'Stripe payment product policy is invalid',
        'Stripe payment price policy is invalid',
        'NEW.amount_total = 1495',
        'NEW.amount_total = 150'
      ],
      purchaseInfo: [
        "env.AUTH_MODE === 'google'",
        'skypass.premiumDescOffchain'
      ],
      locale: [
        'premiumDescOffchain',
        'detailsDescsOffchain',
        'Cloud Weasel inventory'
      ]
    }
    for (const [name, tokens] of Object.entries(required)) {
      const source = skypassCommerce[name] || ''
      for (const token of tokens) {
        if (!source.includes(token)) {
          errors.push(`Google SkyPass commerce ${name} is missing: ${token}`)
        }
      }
    }
    for (const pattern of TRANSACTION_PATTERNS) {
      if (pattern.test(skypassCommerce.identityControls || '')) {
        errors.push(
          `Google SkyPass commerce contains legacy transaction code: ${pattern.source}`
        )
      }
    }
  }
  const normalizedPolicySource = policySource.replace(/\s+/g, ' ')
  for (const required of [
    'D1 inventory is the canonical authority',
    'No game flow asks a player to mint a reward',
    'Every preserved source behavior that required minting grants an equivalent off-chain item or entitlement',
    'No original earning, purchase, or reward behavior may be retired because its fulfillment used minting',
    'Apply the inventory change and fulfillment receipt in one D1 transaction',
    'Google-auth product copy describes these items'
  ]) {
    if (!normalizedPolicySource.includes(required)) {
      errors.push(`off-chain reward policy is missing: ${required}`)
    }
  }
  if (
    pendingGoldSources &&
    [
      'play.gameModes.CONQUEST.pendingGoldsOffchain',
      'play.noDeliveriesPending',
      'play.deliveryIn',
      'play.deliveryInProgress'
    ].some(token => !pendingGoldSources.includes(token))
  ) {
    errors.push('Google Pending Gold UI is missing off-chain delivery copy')
  }
  for (const pattern of [
    /t\(['"]play\.gameModes\.CONQUEST\.pendingGolds['"]\)/,
    /t\(['"]play\.noMintsPending['"]\)/,
    /t\(['"]shop\.MintingIn(?:Prog)?['"]/
  ]) {
    if (pattern.test(pendingGoldSources)) {
      errors.push('Google Pending Gold UI contains player-facing mint language')
    }
  }
  if (silverExchangeUi) {
    const googleGuard = silverExchangeUi.indexOf("env.AUTH_MODE === 'google'")
    const offchainExchange = silverExchangeUi.indexOf(
      'identityClient.exchangeSilverCardsForTickets',
      googleGuard
    )
    const googleReturn = silverExchangeUi.indexOf('return', offchainExchange)
    const legacyWallet = silverExchangeUi.indexOf('AuthenticationClient.wallet')
    if (
      googleGuard < 0 ||
      offchainExchange < googleGuard ||
      googleReturn < offchainExchange ||
      legacyWallet < googleReturn
    ) {
      errors.push('Google Silver exchange can reach the legacy wallet path')
    }
    if (!silverExchangeUi.includes("env.AUTH_MODE !== 'google'")) {
      errors.push(
        'Google Silver exchange still loads the legacy payment catalog'
      )
    }
  }
  if (Object.keys(silverExchangeReview).length) {
    const requiredTokens = {
      list: [
        "env.AUTH_MODE === 'google'",
        'play.exchangeRate',
        'play.ticketsReceived'
      ],
      row: [
        "env.AUTH_MODE === 'google'",
        'play.silverExchangeRate',
        'play.silverTicketsReceived'
      ],
      total: [
        "env.AUTH_MODE === 'google'",
        'play.silverExchangeFinal',
        'play.silverExchangeFinalTooltip'
      ],
      confirm: ["env.AUTH_MODE === 'google'", 'play.silverExchangeWarning'],
      locale: [
        'Exchange Rate',
        '1 Silver → 1 Ticket',
        'Tickets Received',
        'delivered immediately to your Cloud Weasel inventory'
      ]
    }
    for (const [surface, tokens] of Object.entries(requiredTokens)) {
      const source = silverExchangeReview[surface] ?? ''
      for (const token of tokens) {
        if (!source.includes(token)) {
          errors.push(
            `Google Silver review ${surface} is missing off-chain projection: ${token}`
          )
        }
      }
    }
    const row = silverExchangeReview.row ?? ''
    if ([...row.matchAll(/<CardPrice\b/g)].length !== 2) {
      errors.push(
        'Google Silver review row must retain exactly two legacy CardPrice branches'
      )
    }
    for (const token of [
      'play.silverExchangeRate',
      'play.silverTicketsReceived'
    ]) {
      const escaped = token.replaceAll('.', '\\.')
      const googleBeforeLegacyPrice = new RegExp(
        `env\\.AUTH_MODE\\s*===\\s*['"]google['"]\\s*\\?[\\s\\S]*?${escaped}[\\s\\S]*?\\)\\s*:\\s*\\(\\s*<CardPrice`
      )
      if (!googleBeforeLegacyPrice.test(row)) {
        errors.push(
          `Google Silver review can mount wallet market pricing before: ${token}`
        )
      }
    }
  }
  if (heroExchangeUi) {
    const googleGuard = heroExchangeUi.indexOf("env.AUTH_MODE === 'google'")
    const offchainExchange = heroExchangeUi.indexOf(
      'identityClient.exchangeGoldCardsForHeroSkins',
      googleGuard
    )
    const googleReturn = heroExchangeUi.indexOf('return', offchainExchange)
    const legacyWallet = heroExchangeUi.indexOf('getHeroMintTxns', googleReturn)
    if (
      googleGuard < 0 ||
      offchainExchange < googleGuard ||
      googleReturn < offchainExchange ||
      legacyWallet < googleReturn
    ) {
      errors.push('Google Hero exchange can reach the legacy wallet path')
    }
  }
  if (Object.keys(identityCardDetails).length) {
    for (const [name, source] of Object.entries(
      identityCardDetails.routes ?? {}
    )) {
      if (!source.includes("inventoryOnly={env.AUTH_MODE === 'google'}")) {
        errors.push(
          `Google card details route ${name} does not select inventory-only data`
        )
      }
    }

    if (
      /useEffect\(\s*\(\)\s*=>\s*window\.scrollTo\s*\(/.test(
        identityCardDetails.routes?.items ?? ''
      )
    ) {
      errors.push(
        'Google Items card details scroll effect can return a non-cleanup value'
      )
    }

    const controls = identityCardDetails.controls ?? ''
    const identityControls =
      identityCardDetails.identityControls ??
      controls.match(
        /const IdentityItemsCardDetailsControls[\s\S]*?IdentityItemsCardDetailsControls\.displayName/
      )?.[0]
    if (
      !/env\.AUTH_MODE\s*===\s*['"]google['"]\s*\?\s*IdentityItemsCardDetailsControls\s*:\s*LegacyItemsCardDetailsControls/.test(
        controls
      )
    ) {
      errors.push(
        'Google Items card details do not select the inventory-only controls'
      )
    }
    if (!identityControls?.includes('cardDetails.offchainInventory')) {
      errors.push('Google Items card details are missing inventory-only copy')
    }
    for (const pattern of [
      /useTokenPriceAndSupply/,
      /useAddToCart/,
      /useRemoveFromCart/,
      /useCartItem/,
      /formatUSDCBalance/
    ]) {
      if (identityControls && pattern.test(identityControls)) {
        errors.push(
          `Google Items card details mount a market control: ${pattern.source}`
        )
      }
    }

    const tokenInfo = identityCardDetails.tokenInfo ?? ''
    for (const token of [
      'inventoryOnly?: boolean',
      'cardDetails.inventoryBalance',
      '!inventoryOnly'
    ]) {
      if (!tokenInfo.includes(token)) {
        errors.push(
          `Google card grade table is missing inventory guard: ${token}`
        )
      }
    }

    const gradeRow = identityCardDetails.gradeRow ?? ''
    if (
      !/!inventoryOnly\s*&&\s*\([\s\S]*?<GradeRowPrices[\s\S]*?<GradeRowSupply[\s\S]*?<GradeRowTotalSupply/.test(
        gradeRow
      )
    ) {
      errors.push(
        'Google card grade table can mount market price or supply queries'
      )
    }
    if (
      !(identityCardDetails.gradeLabel ?? '').includes(
        "${inventoryOnly ? 'Offchain' : ''}"
      )
    ) {
      errors.push('Google card grade tooltip does not select off-chain copy')
    }

    const locale = identityCardDetails.locale ?? ''
    for (const token of [
      'cardDetails.offchainInventory',
      'cardDetails.inventoryBalance',
      'cardDetails.baseExplanationOffchain',
      'cardDetails.goldExplanationOffchain',
      'cardDetails.silverExplanationOffchain'
    ]) {
      if (!locale.includes(token)) {
        errors.push(`Google card details copy is missing: ${token}`)
      }
    }
  }
  if (Object.keys(googleRewardUi).length) {
    for (const [name, requiredTokens] of Object.entries(
      GOOGLE_REWARD_UI_REQUIREMENTS
    )) {
      const source = googleRewardUi[name]
      if (!source) {
        errors.push(`Google reward UI source is missing: ${name}`)
        continue
      }
      for (const token of requiredTokens) {
        if (!source.includes(token)) {
          errors.push(`Google reward UI ${name} is missing guard: ${token}`)
        }
      }
    }
    const skypassClaim = googleRewardUi.skypassClaim
    if (
      skypassClaim &&
      !/const onDialogClose[\s\S]*?if\s*\(env\.AUTH_MODE === ['"]google['"]\)\s*return[\s\S]*?openConversionDialog\(\)/.test(
        skypassClaim
      )
    ) {
      errors.push(
        'Google SkyPass card dialog can open the legacy wallet-conversion prompt'
      )
    }
    if (
      skypassClaim &&
      !/else if\s*\(\s*env\.AUTH_MODE !== ['"]google['"][\s\S]*?\)\s*\{\s*if\s*\(!!shouldSeeConversionDialog\(\)\)\s*\{\s*openConversionDialog\(\)/.test(
        skypassClaim
      )
    ) {
      errors.push(
        'Google SkyPass item claim can open the legacy wallet-conversion prompt'
      )
    }
  }
  for (const copy of googleRewardCopy) {
    if (/\b(?:mint|minted|minting|tradable|blockchain|wallet)\b/i.test(copy)) {
      errors.push(
        `Google reward copy contains legacy ownership language: ${copy}`
      )
    }
  }
  for (const [name, source] of Object.entries(rewardSources)) {
    if (!/INSERT(?: OR IGNORE)? INTO player_items/.test(source)) {
      errors.push(`${name} does not grant canonical D1 inventory`)
    }
    if (!/(receipt|claims?|delivery_token|award_key)/i.test(source)) {
      errors.push(`${name} does not contain an idempotent receipt key`)
    }
    for (const pattern of TRANSACTION_PATTERNS) {
      if (pattern.test(source)) {
        errors.push(
          `${name} contains legacy transaction code: ${pattern.source}`
        )
      }
    }
  }
  if (questRewardSource || questReceiptMigration) {
    for (const token of [
      'player_quest_claim_batches',
      'player_quest_claim_receipts',
      'player_friend_points',
      "'SW_STICKER_POINTS'",
      "status = 'COMPLETED'"
    ]) {
      if (!questRewardSource.includes(token)) {
        errors.push(`quest XP grant is missing receipt safeguard: ${token}`)
      }
    }
    for (const token of [
      'PRIMARY KEY (user_id, quest_key)',
      'quest claim receipts are immutable',
      'quest claim batch completion is invalid'
    ]) {
      if (!questReceiptMigration.includes(token)) {
        errors.push(`quest XP receipt schema is missing safeguard: ${token}`)
      }
    }
    if (
      /\b(?:mint|sendTransaction|prepareOnChain)\b/i.test(questRewardSource)
    ) {
      errors.push('quest XP grant contains a legacy chain effect')
    }
  }
  if (matchRewardSource || matchReceiptMigration) {
    for (const token of [
      'multiplayer_match_experience_players',
      'settlement_token',
      'player_friend_points',
      "'SW_STICKER_POINTS'"
    ]) {
      if (!matchRewardSource.includes(token)) {
        errors.push(`match XP grant is missing receipt safeguard: ${token}`)
      }
    }
    for (const token of [
      'match experience player receipts are immutable',
      'match experience completion is invalid',
      'match experience receipts are immutable'
    ]) {
      if (!matchReceiptMigration.includes(token)) {
        errors.push(`match XP receipt schema is missing safeguard: ${token}`)
      }
    }
    if (
      /\b(?:mint|sendTransaction|prepareOnChain)\b/i.test(matchRewardSource)
    ) {
      errors.push('match XP grant contains a legacy chain effect')
    }
  }
  if (conquestPointSource || conquestPointMigration) {
    for (const token of [
      'multiplayer_match_conquest_point_players',
      'settlement_token',
      'POINTS_CAP'
    ]) {
      if (!conquestPointSource.includes(token)) {
        errors.push(
          `Conquest point grant is missing receipt safeguard: ${token}`
        )
      }
    }
    for (const token of [
      'match Conquest point player receipts are immutable',
      'match Conquest point completion is invalid',
      'match Conquest point receipts are immutable'
    ]) {
      if (!conquestPointMigration.includes(token)) {
        errors.push(
          `Conquest point receipt schema is missing safeguard: ${token}`
        )
      }
    }
    if (
      /\b(?:mint|sendTransaction|prepareOnChain)\b/i.test(conquestPointSource)
    ) {
      errors.push('Conquest point grant contains a legacy chain effect')
    }
  }
  if (referralStickerSource || referralStickerScheduleMigration) {
    for (const token of [
      'referral_sticker_active_schedule_entries',
      'schedule.schedule_version',
      'referral_sticker_reward_batch_schedule_receipts',
      'INSERT INTO player_items'
    ]) {
      if (!referralStickerSource.includes(token)) {
        errors.push(
          `referral sticker reward is missing activation safeguard: ${token}`
        )
      }
    }
    if (
      !referralStickerContentSource.includes(
        'FROM referral_sticker_active_schedule_entries WHERE season = ?'
      )
    ) {
      errors.push(
        'referral sticker content can expose unactivated reward metadata'
      )
    }
    for (const token of [
      'referral_sticker_schedule_versions',
      "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE'))",
      'activated_by_user_id <> created_by_user_id',
      'length(trim(NEW.activated_by_user_id)) = 0',
      'schedule.activated_at <= batch_row.created_at',
      'referral sticker schedule activation is invalid',
      'active referral sticker schedule entries are immutable',
      'active referral sticker schedule receipt required'
    ]) {
      if (!referralStickerScheduleMigration.includes(token)) {
        errors.push(`referral sticker schedule is missing safeguard: ${token}`)
      }
    }
  }
  if (leaderboardRewardSource || leaderboardRewardPolicyMigration) {
    for (const token of [
      'leaderboard_reward_schedule_activations',
      'LEADERBOARD_REWARD_POLICY_VERSION',
      'LEADERBOARD_REWARD_POLICY_HASH',
      'leaderboard_reward_cycle_policy_receipts',
      'policy_activated_at <= now.toISOString()',
      "crypto.subtle.digest(\n      'SHA-256'",
      'encoder.encode(`${seed}:${index}`)',
      '% pool.length'
    ]) {
      if (!leaderboardRewardSource.includes(token)) {
        errors.push(`leaderboard reward is missing policy safeguard: ${token}`)
      }
    }
    for (const token of [
      'cloud-weasel-offchain-leaderboard-v1',
      'leaderboardRewardsForRank(index + 1)',
      "card.set !== 'HEXBOUND_INVASION'",
      "ticket: ['SW_CONQUEST_TICKET', 2, 1]",
      'calculatedLeaderboardRewardPolicyHash'
    ]) {
      if (!leaderboardRewardPolicySource.includes(token)) {
        errors.push(`leaderboard policy hash is missing source input: ${token}`)
      }
    }
    for (const token of [
      'leaderboard_reward_schedule_activations',
      "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE'))",
      'activated_by_user_id <> created_by_user_id',
      'leaderboard reward policy activation is invalid',
      'leaderboard_reward_policy_card_ranges',
      'leaderboard_reward_policy_cards',
      'json_array_length(NEW.eligible_card_ids_json)',
      "WHEN json_extract(mode.value, '$.rank') = 1 THEN 10",
      "WHEN json_extract(mode.value, '$.rank') BETWEEN 101 AND 250 THEN 1",
      'leaderboard reward cycle creation is invalid',
      'leaderboard reward snapshot is incomplete',
      'active leaderboard reward policy receipt required',
      'leaderboard reward cycle policy receipts are immutable'
    ]) {
      if (!leaderboardRewardPolicyMigration.includes(token)) {
        errors.push(`leaderboard policy schema is missing safeguard: ${token}`)
      }
    }
    const configuredHash = leaderboardRewardPolicySource.match(
      /LEADERBOARD_REWARD_POLICY_HASH\s*=\s*\n?\s*['"]([0-9a-f]{64})['"]/
    )?.[1]
    if (
      !configuredHash ||
      !leaderboardRewardPolicyMigration.includes(configuredHash)
    ) {
      errors.push(
        'leaderboard policy runtime hash is not pinned by the D1 activation schema'
      )
    }
  }
  if (conquestV2RewardSource || conquestV2RewardPolicyMigration) {
    for (const token of [
      'conquest_v2_reward_schedule_activations',
      'CONQUEST_V2_REWARD_POLICY_VERSION',
      'CONQUEST_V2_REWARD_POLICY_HASH',
      'conquest_v2_reward_cycle_policy_receipts',
      'schedule!.settings_version === schedule!.current_settings_version',
      'resumableSchedule(database, now)',
      'value !==\n          conquestV2SilverCardCount(',
      "crypto.subtle.digest(\n      'SHA-256'",
      'encoder.encode(`${seed}:${index}`)',
      '% pool.length'
    ]) {
      if (!conquestV2RewardSource.includes(token)) {
        errors.push(`Conquest V2 reward is missing policy safeguard: ${token}`)
      }
    }
    for (const token of [
      'cloud-weasel-offchain-conquest-v2-v1',
      'CONQUEST_V2_TREASURE_TOTAL_POINTS',
      'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS',
      'Math.fround',
      "inventory: ['SW_SILVER_CARDS', 'card-id', 1]",
      "legacyUsdc: 'audit-only; player inventory and notification value are zero'",
      'calculatedConquestV2RewardPolicyHash'
    ]) {
      if (!conquestV2RewardPolicySource.includes(token)) {
        errors.push(`Conquest V2 policy hash is missing source input: ${token}`)
      }
    }
    for (const token of [
      'conquest_v2_reward_schedule_activations',
      "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE'))",
      'activated_by_user_id <> created_by_user_id',
      'settings.mutation_id = NEW.settings_mutation_id',
      'NEW.silver_counts_json IS NOT OLD.silver_counts_json',
      'conquest_v2_reward_policy_cards',
      'conquest_v2_reward_cycle_policy_receipts',
      'Conquest V2 reward cycle creation is invalid',
      'Conquest V2 reward snapshot is incomplete',
      'json_array_length(NEW.silver_card_ids_json) = CAST(json_extract(',
      'active Conquest V2 reward policy receipt required',
      'Conquest V2 reward cycle policy receipts are immutable'
    ]) {
      if (!conquestV2RewardPolicyMigration.includes(token)) {
        errors.push(`Conquest V2 policy schema is missing safeguard: ${token}`)
      }
    }
    const configuredHash = conquestV2RewardPolicySource.match(
      /CONQUEST_V2_REWARD_POLICY_HASH\s*=\s*\n?\s*['"]([0-9a-f]{64})['"]/
    )?.[1]
    if (
      !configuredHash ||
      !conquestV2RewardPolicyMigration.includes(configuredHash)
    ) {
      errors.push(
        'Conquest V2 policy runtime hash is not pinned by the D1 activation schema'
      )
    }
  }
  if (skypassRewardSource || skypassRewardPolicyMigration) {
    for (const token of [
      'skypass_reward_active_rewards',
      'skypass_reward_active_policies',
      'SKYPASS_REWARD_POLICY_HASH',
      'reward_policy_version',
      'reward_policy_hash',
      'stableRewardIndex',
      'Math.imul(hash, 16777619)',
      'GMActivateSkypassRewards',
      'item type has no off-chain SkyPass fulfillment'
    ]) {
      if (!skypassRewardSource.includes(token)) {
        errors.push(`SkyPass reward is missing policy safeguard: ${token}`)
      }
    }
    for (const token of [
      'cloud-weasel-offchain-skypass-v1',
      'cardCatalog: cardLibrary.cards.map',
      'starterDecks: STARTER_DECKS.map',
      'fnv1a32(userId:rewardId:index)',
      "SW_BASE_CARDS: ['SW_BASE_CARDS', 'card-id', 'nonstackable']",
      "SW_CONQUEST_TICKET: ['SW_CONQUEST_TICKET', 2, 'stackable']",
      "SW_STICKERS: ['SW_STICKERS', 'token-id', 'stackable']",
      "chainEffects: 'none; every source mint queue is identity-owned D1 inventory'",
      'calculatedSkypassRewardPolicyHash'
    ]) {
      if (!skypassRewardPolicySource.includes(token)) {
        errors.push(`SkyPass policy hash is missing source input: ${token}`)
      }
    }
    for (const token of [
      'skypass_reward_policy_versions',
      "status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE'))",
      'activated_by_user_id <> created_by_user_id',
      'skypass_reward_active_policies',
      'skypass_reward_active_rewards',
      "SET status = 'ACTIVE'",
      'reward.item_type NOT IN (300, 302, 303, 401, 403, 405, 407, 500)',
      'Versioned SkyPass reward rows are immutable',
      'active SkyPass sticker metadata is immutable',
      'active SkyPass reward policy required',
      'SkyPass claim policy receipt is immutable'
    ]) {
      if (!skypassRewardPolicyMigration.includes(token)) {
        errors.push(`SkyPass policy schema is missing safeguard: ${token}`)
      }
    }
    const configuredHash = skypassRewardPolicySource.match(
      /SKYPASS_REWARD_POLICY_HASH\s*=\s*\n?\s*['"]([0-9a-f]{64})['"]/
    )?.[1]
    if (
      !configuredHash ||
      !skypassRewardPolicyMigration.includes(configuredHash)
    ) {
      errors.push(
        'SkyPass policy runtime hash is not pinned by the D1 activation schema'
      )
    }
  }
  for (const [name, source] of Object.entries(observationalSources)) {
    if (/\bplayer_items\b|INSERT(?: OR IGNORE)? INTO player_/i.test(source)) {
      errors.push(`${name} observational pipeline can mutate player rewards`)
    }
    for (const pattern of TRANSACTION_PATTERNS) {
      if (pattern.test(source)) {
        errors.push(
          `${name} observational pipeline contains transaction code: ${pattern.source}`
        )
      }
    }
  }
  if (optionalWalletSource) {
    for (const token of OPTIONAL_WALLET_REQUIREMENTS) {
      if (!optionalWalletSource.includes(token)) {
        errors.push(
          `optional wallet integration is missing safeguard: ${token}`
        )
      }
    }
    for (const pattern of OPTIONAL_WALLET_FORBIDDEN_PATTERNS) {
      if (pattern.test(optionalWalletSource)) {
        errors.push(
          `optional wallet integration contains transaction capability: ${pattern.source}`
        )
      }
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const [
    configSource,
    identityRoutes,
    appSource,
    policySource,
    conquestDelivery,
    conquestV2Rewards,
    leaderboardRewards,
    playerRpc,
    referralStickerRewards,
    contentSource,
    silverTicketExchange,
    heroSkinExchange,
    operatorCardGrant,
    stripeCheckout,
    mobileStoreFulfillment,
    skypassAutoClaim,
    pendingGoldPage,
    pendingGoldCard,
    pendingGoldHeader,
    silverExchangeList,
    silverExchangeRow,
    silverExchangeTotal,
    silverExchangeUi,
    heroExchangeUi,
    itemsCardDetails,
    selectSilverCardDetails,
    selectGoldCardDetails,
    itemsCardDetailsControls,
    identityItemsCardDetailsControls,
    tokenInfoSection,
    gradeRow,
    gradeRowGrade,
    conquestInfo,
    weeklyGoldCard,
    rewardFeed,
    goldCardTooltip,
    silverCardTooltip,
    conquestProgressTooltip,
    conquestPointsExplanation,
    conquestTreasureTooltip,
    conquestTreasureReward,
    conquestNotifications,
    conquestRewardFeed,
    tradableBadge,
    skypassThumbnail,
    skypassClaim,
    skypassPurchaseInfo,
    skypassCardBackDetail,
    skypassExpansionDetail,
    skypassStickerDetail,
    skypassSilverDetail,
    englishLocaleSource,
    analyticsWorker,
    walletContents,
    walletConnector,
    walletSettings,
    questReceiptMigration,
    matchExperienceSource,
    matchReceiptMigration,
    conquestPointSource,
    conquestPointMigration,
    referralStickerScheduleMigration,
    leaderboardRewardPolicySource,
    leaderboardRewardPolicyMigration,
    conquestV2RewardPolicySource,
    conquestV2RewardPolicyMigration,
    skypassRewardUpdateSource,
    skypassRewardPolicySource,
    skypassRewardPolicyMigration,
    apiSource,
    skypassPurchaseControls,
    identitySkypassPurchaseControls,
    playerApiSource,
    stripePricePolicyMigration
  ] = await Promise.all([
    readFile(path.join(root, 'webapp/config/webapp.cloudflare.json'), 'utf8'),
    readFile(
      path.join(root, 'webapp/src/IdentitySession/IdentityApp.tsx'),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/src/App.tsx'), 'utf8'),
    readFile(path.join(root, 'docs/OFFCHAIN_REWARD_POLICY.md'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/conquest-delivery.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/conquest-v2-reward-worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-worker.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/player-rpc.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/referral-sticker-rewards.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/content.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/silver-ticket-exchange.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/hero-skin-exchange.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/player-support.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/stripe-checkout.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/mobile-store-fulfillment.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/skypass-auto-claim.ts'), 'utf8'),
    readFile(
      path.join(root, 'webapp/src/PendingGoldsPage/PendingGoldsPage.tsx'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PendingGoldsPage/components/PendingGoldCard.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PendingGoldsPage/components/PendingGoldsHeader.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversList/BurnSilversList.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversList/BurnSilverListRow/BurnSilverListRow.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/components/BurnSilversTotalRow.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversControlsRow/components/ConfirmConvertSilverCardsDialog.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/useConfirmHeroMintOrder.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/ItemsPage/ItemsCardDetails/ItemsCardDetails.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SelectSilversPage/SelectSilversCardDetails/SelectSilversCardDetails.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SelectGoldCardsForSkinPage/SelectGoldsCardDetails/SelectGoldsCardDetails.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/ItemsPage/ItemsCardDetails/components/ItemsCardDetailsControls.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/ItemsPage/ItemsCardDetails/components/IdentityItemsCardDetailsControls.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/shared/components/CardDetailsPage/CardDetailsInfoSection/TokenInfoSection/TokenInfoSection.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/shared/components/CardDetailsPage/CardDetailsInfoSection/TokenInfoSection/GradeRow/GradeRow.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/shared/components/CardDetailsPage/CardDetailsInfoSection/TokenInfoSection/GradeRow/components/GradeRowGrade.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PlayPage/Conquest/ConquestInfo/ConquestInfo.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PlayPage/Conquest/ConquestInfo/components/WeeklyGoldCard.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AccountPage/AccountStats/RewardsFeed/FeedList/FeedRow/components/FeedRowText.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/WalletInfo/components/GoldCardTooltip.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/WalletInfo/components/SilverCardTooltip.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PlayPage/Conquest/ConquestProgressBar/components/ConquestProgressBarTooltip.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PlayPage/Conquest/components/ConquestPointsExplanation.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PlayPage/Conquest/ConquestProgressBar/ConquestTreasureImage/ConquestTreasureImage.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/PlayPage/Conquest/ConquestProgressBar/ConquestTreasureImage/components/TreasureImageTooltipSection.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/HomePage/NotificationsDialog/NotificationsDialog.tsx'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/src/shared/queries/useFeed.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'webapp/src/shared/components/TradableBadge/TradableBadge.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPage/SkyPassForeground/RewardsCarousel/shared/components/SkyPassThumbnail/SkyPassThumbnail.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPage/SkyPassForeground/SkyPassClaimReward/SkyPassClaimReward.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseInfo.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseDetails/components/CardBackDetail.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseDetails/components/ExpansionDetails.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseDetails/components/NewStickerDetail.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseDetails/components/SilverCardDetail.tsx'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/locales/en/webapp.json'), 'utf8'),
    readFile(path.join(root, 'game-analytics/src/cloudflareWorker.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/wallet-contents.ts'), 'utf8'),
    readFile(
      path.join(root, 'webapp/src/IdentitySession/walletconnect.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/DefaultSettingsList/WalletConnectionsSettings/WalletConnectionsSettings.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/migrations/0069_quest_claim_receipts.sql'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/src/progression.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0070_match_experience_receipts.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/src/conquest-points.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/migrations/0071_conquest_point_receipts.sql'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0087_referral_sticker_schedule_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-policy.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0088_leaderboard_reward_policy_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/conquest-v2-reward-policy.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0089_conquest_v2_reward_policy_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/skypass-reward-update.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/skypass-reward-policy.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0090_skypass_reward_policy_activation.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseButtons/SkyPassPurchaseButtons.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseButtons/IdentitySkyPassPurchaseButtons.tsx'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/player-api.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0091_stripe_product_price_policy.sql'
      ),
      'utf8'
    )
  ])
  const englishLocale = JSON.parse(englishLocaleSource)
  const errors = offchainGateErrors({
    webappConfig: JSON.parse(configSource),
    identityRoutes,
    appSource,
    policySource,
    pendingGoldSources: `${pendingGoldPage}\n${pendingGoldCard}\n${pendingGoldHeader}`,
    silverExchangeUi,
    silverExchangeReview: {
      list: silverExchangeList,
      row: silverExchangeRow,
      total: silverExchangeTotal,
      confirm: silverExchangeUi,
      locale: englishLocaleSource
    },
    heroExchangeUi,
    identityCardDetails: {
      routes: {
        items: itemsCardDetails,
        silverExchange: selectSilverCardDetails,
        goldExchange: selectGoldCardDetails
      },
      controls: itemsCardDetailsControls,
      identityControls: identityItemsCardDetailsControls,
      tokenInfo: tokenInfoSection,
      gradeRow,
      gradeLabel: gradeRowGrade,
      locale: [
        'cardDetails.offchainInventory',
        'cardDetails.inventoryBalance',
        'cardDetails.baseExplanationOffchain',
        'cardDetails.goldExplanationOffchain',
        'cardDetails.silverExplanationOffchain'
      ]
        .map(key => {
          const [, name] = key.split('.')
          return `${key}=${englishLocale.cardDetails[name]}`
        })
        .join('\n')
    },
    googleRewardUi: {
      conquestInfo,
      weeklyGoldCard,
      rewardFeed,
      goldCardTooltip,
      silverCardTooltip,
      conquestProgressTooltip,
      conquestPointsExplanation,
      conquestTreasureTooltip,
      conquestTreasureReward,
      conquestNotifications,
      conquestRewardFeed,
      tradableBadge,
      skypassThumbnail,
      skypassClaim,
      skypassPurchaseInfo,
      skypassCardBackDetail,
      skypassExpansionDetail,
      skypassStickerDetail,
      skypassSilverDetail
    },
    googleRewardCopy: [
      englishLocale.generic.Collected,
      englishLocale.play.completedDeliverySpecificCard,
      englishLocale.play.completedDeliveryNumCards,
      englishLocale.play.conquestWeeklyGoldsOffchain,
      englishLocale.play.delayedGoldDelivery,
      englishLocale.play.deliveryIn,
      englishLocale.play.deliveryInProgress,
      englishLocale.play.delayedDelivery_one,
      englishLocale.play.delayedDelivery_other,
      englishLocale.play.gameModes.CONQUEST.pendingGoldsOffchain,
      englishLocale.play.noDeliveriesPending,
      englishLocale.play.rewards.levelWeeklyTreasureLineTwoOffchain,
      englishLocale.play.conquestDeckPointsTooltipMessageOffchain,
      englishLocale.play.treasureRewardsInactive,
      englishLocale.play.treasureToolTipHeaderOffchain,
      englishLocale.tooltip.conquestRulesLineSevenOffchain,
      englishLocale.tooltip.goldCardsExplainerLineOneOffchain,
      englishLocale.tooltip.goldCardsExplainerLineTwoOffchain,
      englishLocale.tooltip.progressionInfoOffchain,
      englishLocale.tooltip.silverCardsExplainerLineOneOffchain,
      englishLocale.tooltip.silverCardsExplainerLineTwoOffchain,
      englishLocale.play.exchangeRate,
      englishLocale.play.ticketsReceived,
      englishLocale.play.silverExchangeFinal,
      englishLocale.play.silverExchangeFinalTooltip,
      englishLocale.play.silverExchangeRate,
      englishLocale.play.silverExchangeWarning,
      englishLocale.play.silverTicketsReceived_one,
      englishLocale.play.silverTicketsReceived_other,
      englishLocale.cardDetails.offchainInventory,
      englishLocale.cardDetails.inventoryBalance,
      englishLocale.cardDetails.baseExplanationOffchain,
      englishLocale.cardDetails.goldExplanationOffchain,
      englishLocale.cardDetails.silverExplanationOffchain,
      englishLocale.skypass.premiumDescOffchain,
      englishLocale.skypass.detailsDescsOffchain.CardBack,
      englishLocale.skypass.detailsDescsOffchain.ConquestTickets,
      englishLocale.skypass.detailsDescsOffchain.NewSticker,
      englishLocale.skypass.detailsDescsOffchain.SilverCard,
      englishLocale.skypass.detailsDescsOffchain.StickerPoints
    ],
    rewardSources: {
      conquestDelivery,
      conquestV2Rewards,
      leaderboardRewards,
      playerRpc,
      referralStickerRewards,
      silverTicketExchange,
      heroSkinExchange,
      operatorCardGrant,
      stripeCheckout,
      mobileStoreFulfillment,
      skypassAutoClaim: `${skypassAutoClaim}\n${playerRpc}`
    },
    questRewardSource: playerRpc,
    questReceiptMigration,
    matchRewardSource: matchExperienceSource,
    matchReceiptMigration,
    conquestPointSource,
    conquestPointMigration,
    referralStickerSource: referralStickerRewards,
    referralStickerContentSource: contentSource,
    referralStickerScheduleMigration,
    leaderboardRewardSource: leaderboardRewards,
    leaderboardRewardPolicySource,
    leaderboardRewardPolicyMigration,
    conquestV2RewardSource: conquestV2Rewards,
    conquestV2RewardPolicySource,
    conquestV2RewardPolicyMigration,
    skypassRewardSource: [
      playerRpc,
      skypassAutoClaim,
      skypassRewardUpdateSource,
      apiSource
    ].join('\n'),
    skypassRewardPolicySource,
    skypassRewardPolicyMigration,
    observationalSources: { analyticsWorker, walletContents },
    optionalWalletSource: `${walletConnector}\n${walletSettings}`,
    skypassCommerce: {
      controls: skypassPurchaseControls,
      identityControls: identitySkypassPurchaseControls,
      playerApi: playerApiSource,
      stripe: stripeCheckout,
      priceMigration: stripePricePolicyMigration,
      purchaseInfo: skypassPurchaseInfo,
      locale: englishLocaleSource
    }
  })
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Off-chain gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Cloudflare identity routes exclude legacy mint transactions; D1 rewards remain canonical\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
