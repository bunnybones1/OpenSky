import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Every environment branch in the preserved browser is reviewed here. The
// exact file/count inventory makes a new hide-only adaptation fail the build
// until its product disposition is explicit.
export const EXPECTED_AUTH_MODE_FILES = {
  'AccountPage/AccountIdentity/ExpandedBattleTag/ExpandedBattleTag.tsx': [1, 'identity-inventory-adapter'],
  'AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/DefaultSettingsList/DefaultSettingsList.tsx': [1, 'identity-settings-adapter'],
  'AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/DefaultSettingsList/DeleteAccountSettings/components/DeleteAccountDialog.tsx': [1, 'identity-deletion-adapter'],
  'AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/components/AccountSettingsControls.tsx': [2, 'identity-session-adapter'],
  'AccountPage/AccountIdentity/ExpandedBattleTag/WalletInfo/components/GoldCardTooltip.tsx': [2, 'offchain-reward-copy'],
  'AccountPage/AccountIdentity/ExpandedBattleTag/WalletInfo/components/SilverCardTooltip.tsx': [2, 'offchain-reward-copy'],
  'AccountPage/AccountStats/RewardsFeed/FeedList/FeedRow/components/FeedRowText.tsx': [3, 'offchain-reward-copy'],
  'App.tsx': [1, 'identity-root-adapter'],
  'AppLayout/AppLayout.tsx': [1, 'wallet-only-shell-guard'],
  'AppLayout/DeckViewer/DeckViewer.tsx': [1, 'identity-banner-query-deduplication'],
  'AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx': [1, 'wallet-market-control-guard'],
  'AppLayout/NavBar/LinkSection/LinkSection.tsx': [1, 'wallet-market-capability-adapter'],
  'AppLayout/components/CookieDisclaimer.tsx': [2, 'identity-cookie-policy'],
  'HeroFeaturePage/HeroFeatureCarousel/HeroSkinControls/components/MintHeroSkinButton.tsx': [1, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/HeroesToMintList/components/HeroToMintRow.tsx': [2, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesDialog.tsx': [2, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/MintHeroesModalControls.tsx': [3, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/useConfirmHeroMintOrder.ts': [3, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/components/MintHeroesModalHeader.tsx': [3, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/components/MintHeroesModalTotal.tsx': [3, 'offchain-hero-exchange'],
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/shared/hooks/useMintHeroesTotal.ts': [3, 'offchain-hero-exchange'],
  'HomePage/NotificationsDialog/NotificationsDialog.tsx': [1, 'offchain-conquest-reward'],
  'IndexPage/AuthenticationPage/AuthenticationPage.tsx': [1, 'identity-authentication'],
  'IndexPage/IndexPage.tsx': [2, 'identity-authentication'],
  'InviteFriendsPage/InvitedBy/InvitedByInput/InvitedByInput.tsx': [2, 'identity-referral-reference'],
  'ItemsPage/ItemsCardDetails/ItemsCardDetails.tsx': [1, 'offchain-inventory-projection'],
  'ItemsPage/ItemsCardDetails/components/ItemsCardDetailsControls.tsx': [1, 'offchain-inventory-projection'],
  'ItemsPage/ItemsDecks/ItemsDecksList/hooks/useItemsDecksList.tsx': [1, 'wallet-market-control-guard'],
  'PlayPage/Conquest/ConquestInfo/ConquestInfo.tsx': [3, 'offchain-conquest-reward'],
  'PlayPage/Conquest/ConquestInfo/components/WeeklyGoldCard.tsx': [1, 'offchain-conquest-reward'],
  'PlayPage/Conquest/ConquestProgressBar/ConquestTreasureImage/ConquestTreasureImage.tsx': [1, 'offchain-conquest-reward'],
  'PlayPage/Conquest/ConquestProgressBar/ConquestTreasureImage/components/TreasureImageTooltipSection.tsx': [2, 'offchain-conquest-reward'],
  'PlayPage/Conquest/ConquestProgressBar/components/ConquestProgressBarTooltip.tsx': [1, 'offchain-conquest-reward'],
  'PlayPage/Conquest/components/ConquestPointsExplanation.tsx': [1, 'offchain-conquest-reward'],
  'SelectGoldCardsForSkinPage/SelectGoldsCardDetails/SelectGoldsCardDetails.tsx': [1, 'offchain-hero-exchange'],
  'SelectGoldCardsForSkinPage/SelectGoldsCards/SelectGoldsCardsList/SelectGoldCard/SelectGoldBalance/SelectGoldBalance.tsx': [1, 'offchain-hero-exchange'],
  'SelectGoldCardsForSkinPage/SelectGoldsCards/SelectGoldsCardsList/SelectGoldsCardsList.tsx': [2, 'offchain-hero-exchange'],
  'SelectGoldCardsForSkinPage/SelectGoldsCards/ViewSelectedCardsButton/ConfirmGoldsDialog/ConfirmGoldsList/ConfirmGoldsListRow/ConfirmGoldsListRow.tsx': [2, 'offchain-hero-exchange'],
  'SelectSilversPage/SelectSilversCardDetails/SelectSilversCardDetails.tsx': [1, 'offchain-silver-exchange'],
  'SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversControlsRow/components/ConfirmConvertSilverCardsDialog.tsx': [3, 'offchain-silver-exchange'],
  'SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversList/BurnSilverListRow/BurnSilverListRow.tsx': [2, 'offchain-silver-exchange'],
  'SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversList/BurnSilversList.tsx': [2, 'offchain-silver-exchange'],
  'SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/components/BurnSilversTotalRow.tsx': [2, 'offchain-silver-exchange'],
  'SelectSilversPage/SelectSilversCards/components/SelectSilversBanner.tsx': [1, 'offchain-silver-exchange'],
  'SkyPassPage/SkyPassForeground/Level/Level.tsx': [1, 'offchain-skypass-reward'],
  'SkyPassPage/SkyPassForeground/RewardsCarousel/shared/components/SkyPassThumbnail/SkyPassThumbnail.tsx': [1, 'offchain-skypass-reward'],
  'SkyPassPage/SkyPassForeground/SkyPassClaimReward/SkyPassClaimReward.tsx': [2, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseDetails/components/CardBackDetail.tsx': [2, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseDetails/components/ConquestDetail.tsx': [1, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseDetails/components/ExpansionDetails.tsx': [1, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseDetails/components/NewStickerDetail.tsx': [2, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseDetails/components/SilverCardDetail.tsx': [2, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseDetails/components/StickerPointDetails.tsx': [1, 'offchain-skypass-reward'],
  'SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseButtons/SkyPassPurchaseButtons.tsx': [1, 'offchain-skypass-commerce'],
  'SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseInfo.tsx': [1, 'offchain-skypass-commerce'],
  'clients/AuthenticationClient/AuthenticationClient.ts': [1, 'identity-deletion-adapter'],
  'clients/MatchMakerClient/MatchMakerClient.ts': [1, 'identity-match-certification'],
  'env.ts': [3, 'identity-runtime-configuration'],
  'hooks/useAppDialogs/components/CookieSettingsDialog.tsx': [4, 'identity-cookie-policy'],
  'shared/components/ProfileLink/ProfileLink.tsx': [1, 'identity-inventory-adapter'],
  'shared/components/TradableBadge/TradableBadge.tsx': [1, 'offchain-ownership-copy'],
  'shared/queries/hero-skins/useHeroSkinMintCost.ts': [4, 'offchain-hero-exchange'],
  'shared/queries/useCommerceCapabilities.ts': [1, 'offchain-skypass-commerce'],
  'shared/queries/useFeed.ts': [1, 'offchain-reward-projection'],
  'shared/queries/useSkyPassInfo.ts': [1, 'offchain-skypass-reward']
}

const sourceFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath]
    })
  )
  return nested.flat().filter(file => /\.tsx?$/.test(file))
}

const authModeCount = source => [...source.matchAll(/\bAUTH_MODE\b/g)].length

export const authModeAuditErrors = ({ sources, fidelity = {} }) => {
  const errors = []
  const actual = Object.entries(sources)
    .map(([file, source]) => [file, authModeCount(source)])
    .filter(([, count]) => count > 0)

  for (const [file, count] of actual) {
    const review = EXPECTED_AUTH_MODE_FILES[file]
    if (!review) {
      errors.push(`unreviewed AUTH_MODE file: ${file}`)
    } else if (review[0] !== count) {
      errors.push(`${file} has ${count} AUTH_MODE references; reviewed count is ${review[0]}`)
    }
  }
  for (const file of Object.keys(EXPECTED_AUTH_MODE_FILES)) {
    if (!actual.some(([actualFile]) => actualFile === file)) {
      errors.push(`reviewed AUTH_MODE file disappeared: ${file}`)
    }
  }

  const linkSection = fidelity.linkSection ?? ''
  const itemsLink = fidelity.itemsLink ?? ''
  for (const token of ['<ItemsLink isHorizontal={isHorizontal} />', '<RanksLink isHorizontal={isHorizontal} />']) {
    if (!linkSection.includes(token)) errors.push(`identity navigation lost original control: ${token}`)
  }
  if (!itemsLink.includes('to={makeItemsDecksRoute()}') || linkSection.includes('makeItemsCardsRoute')) {
    errors.push('identity Items navigation must preserve the original Decks destination')
  }

  const playLink = fidelity.playLink ?? ''
  for (const token of ['useStoredMatchInfo()', 'useIsTutorialCompleted()', 'authedAccount.level >= 15']) {
    if (!playLink.includes(token)) errors.push(`identity Play navigation lost source selection: ${token}`)
  }
  if (playLink.includes('AUTH_MODE')) errors.push('identity Play navigation still bypasses the source route selector')

  const identityInventorySources = {
    profile: {
      source: fidelity.profileInventory ?? '',
      required: [
        'identity-inventory-summary',
        'useTokenBalances',
        'useConquestAndUSDCBalances'
      ]
    },
    account: {
      source: fidelity.accountInventory ?? '',
      required: [
        'CLOUD WEASEL INVENTORY',
        'useCardBalanceOverview',
        'useConquestAndUSDCBalances'
      ]
    }
  }
  for (const [surface, { source, required }] of Object.entries(
    identityInventorySources
  )) {
    for (const token of required) {
      if (!source.includes(token)) errors.push(`${surface} identity inventory is missing: ${token}`)
    }
    for (const forbidden of ['AuthenticationClient', 'sendTransaction', 'openWallet', 'Blockchain', 'Tradable', 'SequenceButton', 'useWalletCardValues']) {
      if (source.includes(forbidden)) errors.push(`${surface} identity inventory contains wallet capability: ${forbidden}`)
    }
  }
  if (!/IdentityProfileLink[\s\S]*?<IdentityInventoryInfo\s*\/>/.test(fidelity.profileLink ?? '')) {
    errors.push('identity profile chrome does not mount its D1 inventory summary')
  }
  if (!(fidelity.expandedTag ?? '').includes("env.AUTH_MODE === 'google' ? <IdentityInventoryInfo /> : <WalletInfo />")) {
    errors.push('identity account chrome does not substitute its D1 inventory panel')
  }

  const feed = fidelity.feed ?? ''
  const playerRpc = fidelity.playerRpc ?? ''
  for (const token of ["event.type === FeedEventType.REWARD", 'getCardsFromTokenIds(_tokenIds)']) {
    if (!feed.includes(token)) errors.push(`identity reward feed lost generic card projection: ${token}`)
  }
  for (const token of ['player_conquest_v2_reward_feed_events', "type: 'REWARD'", 'tokenIds: parseJsonArray(row.token_ids_json).map(Number)']) {
    if (!playerRpc.includes(token)) errors.push(`Conquest V2 feed lost off-chain card evidence: ${token}`)
  }

  for (const token of [
    'Every preserved source behavior that required minting grants an equivalent off-chain item or entitlement',
    'Minting is never a reason to remove an earning flow, reward, or reward receipt from the identity product',
    'No original earning, purchase, or reward behavior may be retired because its fulfillment used minting'
  ]) {
    if (!(fidelity.policy ?? '').replace(/\s+/g, ' ').includes(token)) {
      errors.push(`off-chain equivalence policy is missing: ${token}`)
    }
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const sourceRoot = path.join(root, 'webapp/src')
  const files = await sourceFiles(sourceRoot)
  const sources = Object.fromEntries(
    await Promise.all(files.map(async file => [path.relative(sourceRoot, file), await readFile(file, 'utf8')]))
  )
  const read = relative => readFile(path.join(root, relative), 'utf8')
  const [linkSection, itemsLink, playLink, profileLink, profileInventory, expandedTag, accountInventory, feed, playerRpc, policy] = await Promise.all([
    read('webapp/src/AppLayout/NavBar/LinkSection/LinkSection.tsx'),
    read('webapp/src/AppLayout/NavBar/LinkSection/components/ItemsLink.tsx'),
    read('webapp/src/AppLayout/NavBar/LinkSection/PlayLink/hooks/usePlayLinkProps.ts'),
    read('webapp/src/shared/components/ProfileLink/ProfileLink.tsx'),
    read('webapp/src/shared/components/ProfileLink/IdentityInventoryInfo.tsx'),
    read('webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/ExpandedBattleTag.tsx'),
    read('webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/IdentityInventoryInfo.tsx'),
    read('webapp/src/shared/queries/useFeed.ts'),
    read('cloudflare/src/player-rpc.ts'),
    read('docs/OFFCHAIN_REWARD_POLICY.md')
  ])
  const errors = authModeAuditErrors({
    sources,
    fidelity: { linkSection, itemsLink, playLink, profileLink, profileInventory, expandedTag, accountInventory, feed, playerRpc, policy }
  })
  if (errors.length) {
    for (const error of errors) process.stderr.write(`AUTH_MODE audit: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('All 65 AUTH_MODE files and 107 references have reviewed identity dispositions\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
