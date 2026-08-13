import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LEGACY_TRANSACTION_SURFACES = [
  'SkyPassPurchasePage',
  'PurchaseConquestPage'
]

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
  skypassThumbnail: ["env.AUTH_MODE !== 'google'"]
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
  heroExchangeUi = '',
  googleRewardUi = {},
  googleRewardCopy = [],
  rewardSources = {},
  observationalSources = {},
  optionalWalletSource = ''
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
  const normalizedPolicySource = policySource.replace(/\s+/g, ' ')
  for (const required of [
    'D1 inventory is the canonical authority',
    'No game flow asks a player to mint a reward',
    'Every preserved source behavior that required minting grants an equivalent off-chain item or entitlement',
    'Apply the inventory change and fulfillment receipt in one D1 transaction',
    'Google-auth product copy describes these items'
  ]) {
    if (!normalizedPolicySource.includes(required)) {
      errors.push(`off-chain reward policy is missing: ${required}`)
    }
  }
  if (
    pendingGoldSources &&
    (!pendingGoldSources.includes("env.AUTH_MODE === 'google'") ||
      !pendingGoldSources.includes('Delivery in'))
  ) {
    errors.push('Google Pending Gold UI contains player-facing mint language')
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
        errors.push(`optional wallet integration is missing safeguard: ${token}`)
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
    silverTicketExchange,
    heroSkinExchange,
    operatorCardGrant,
    stripeCheckout,
    mobileStoreFulfillment,
    skypassAutoClaim,
    pendingGoldPage,
    pendingGoldCard,
    silverExchangeUi,
    heroExchangeUi,
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
    englishLocaleSource,
    analyticsWorker,
    walletContents,
    walletConnector,
    walletSettings
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
    )
  ])
  const englishLocale = JSON.parse(englishLocaleSource)
  const errors = offchainGateErrors({
    webappConfig: JSON.parse(configSource),
    identityRoutes,
    appSource,
    policySource,
    pendingGoldSources: `${pendingGoldPage}\n${pendingGoldCard}`,
    silverExchangeUi,
    heroExchangeUi,
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
      skypassThumbnail
    },
    googleRewardCopy: [
      englishLocale.generic.Collected,
      englishLocale.play.completedDeliverySpecificCard,
      englishLocale.play.completedDeliveryNumCards,
      englishLocale.play.conquestWeeklyGoldsOffchain,
      englishLocale.play.delayedGoldDelivery,
      englishLocale.play.delayedDelivery_one,
      englishLocale.play.delayedDelivery_other,
      englishLocale.play.rewards.levelWeeklyTreasureLineTwoOffchain,
      englishLocale.play.conquestDeckPointsTooltipMessageOffchain,
      englishLocale.play.treasureRewardsInactive,
      englishLocale.play.treasureToolTipHeaderOffchain,
      englishLocale.tooltip.conquestRulesLineSevenOffchain,
      englishLocale.tooltip.goldCardsExplainerLineOneOffchain,
      englishLocale.tooltip.goldCardsExplainerLineTwoOffchain,
      englishLocale.tooltip.progressionInfoOffchain,
      englishLocale.tooltip.silverCardsExplainerLineOneOffchain,
      englishLocale.tooltip.silverCardsExplainerLineTwoOffchain
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
    observationalSources: { analyticsWorker, walletContents },
    optionalWalletSource: `${walletConnector}\n${walletSettings}`
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
