import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const REVIEWED_LEGACY_ROUTES = {
  SECRET_DEBUG: { disposition: 'legacy-diagnostic', mounted: false },
  HOME: { disposition: 'preserved-original-page', mounted: true },
  PLAYGROUND: { disposition: 'local-development-only', mounted: false },
  PLAY: { disposition: 'preserved-original-page', mounted: true },
  PURCHASE_CONQUEST: {
    disposition: 'offchain-exchange-substitution',
    mounted: true
  },
  PENDING_GOLDS: {
    disposition: 'preserved-offchain-copy',
    mounted: true
  },
  SELECT_SILVERS: {
    disposition: 'preserved-offchain-controls',
    mounted: true
  },
  SKY_PASS: { disposition: 'preserved-offchain-rewards', mounted: true },
  SKY_PASS_PURCHASE: {
    disposition: 'preserved-identity-commerce',
    mounted: true
  },
  CACHE_INFO: { disposition: 'preserved-browser-diagnostic', mounted: true },
  SHOP: { disposition: 'unreleased-source-mock', mounted: false },
  HERO_FEATURE: {
    disposition: 'preserved-offchain-controls',
    mounted: true
  },
  SELECT_GOLDS: {
    disposition: 'preserved-offchain-controls',
    mounted: true
  },
  LEADERBOARD: { disposition: 'preserved-original-page', mounted: true },
  MARKET: {
    disposition: 'preserved-read-only-market',
    mounted: true
  },
  ITEMS: { disposition: 'preserved-identity-inventory', mounted: true },
  DECK_BUILDER: { disposition: 'preserved-original-page', mounted: true },
  QUESTS: { disposition: 'preserved-offchain-rewards', mounted: true },
  CREATE_DECK: { disposition: 'preserved-original-page', mounted: true },
  ACCOUNT: { disposition: 'preserved-google-identity', mounted: true },
  ADMIN: { disposition: 'preserved-identity-rbac', mounted: true },
  SANCTIONS_LIST: {
    disposition: 'superseded-wallet-era-policy-copy',
    mounted: false
  },
  DELETED_ACCOUNT: { disposition: 'preserved-original-page', mounted: true }
}

const REVIEWED_IDENTITY_ADDITIONS = new Set(['INVITE_FRIENDS'])

const routeNames = source =>
  new Set(
    [...source.matchAll(/path=\{ROUTES_CONFIG\.routes\.([A-Z_]+)/g)].map(
      match => match[1]
    )
  )

export const webappRouteAuditErrors = ({
  legacySource,
  identitySource,
  policySource,
  authenticationClientSource,
  identityApiSource,
  identityShellSource,
  accountSettingsSource,
  pageOffsetSource,
  bannerQuerySource,
  cookieDialogSource,
  cookieDisclaimerSource,
  cookieRepositorySource,
  cookieMigrationSource,
  appLayoutSource,
  navBarSource,
  deckViewerSource,
  deckViewerFooterSource,
  adminPageSource,
  staffRepositorySource,
  shopPrototypeSource,
  identityMarketSource,
  marketDeckSource,
  marketNavSource,
  marketSubNavSource,
  marketCardsListSource,
  marketCardSource,
  marketCardBalanceSource,
  marketCardsSearchSource,
  marketCardDetailsSource,
  marketStickersListSource,
  marketStickerSource,
  marketStickersSearchSource,
  marketStickerFeatureSource,
  marketCardBacksListSource,
  marketCardBackSource,
  marketCardBacksSearchSource,
  marketCardBackFeatureSource,
  marketHeroesListSource,
  marketHeroListHookSource,
  marketHeroSource,
  marketHeroesSearchSource,
  heroMintCostSource,
  cartQuerySource
}) => {
  const errors = []
  const legacyRoutes = routeNames(legacySource)
  const identityRoutes = routeNames(identitySource)
  const reviewedRoutes = new Set(Object.keys(REVIEWED_LEGACY_ROUTES))

  for (const route of legacyRoutes) {
    if (!reviewedRoutes.has(route)) {
      errors.push(`unreviewed legacy webapp route: ${route}`)
    }
  }
  for (const route of reviewedRoutes) {
    if (!legacyRoutes.has(route)) {
      errors.push(`reviewed legacy webapp route disappeared: ${route}`)
    }
  }
  for (const [route, review] of Object.entries(REVIEWED_LEGACY_ROUTES)) {
    if (identityRoutes.has(route) !== review.mounted) {
      errors.push(
        `${route} identity mount does not match ${review.disposition}: expected ${review.mounted}`
      )
    }
    const policyRow = policySource
      .split('\n')
      .find(line => line.includes(`\`${route}\``))
    if (!policyRow?.includes(`\`${review.disposition}\``)) {
      errors.push(`webapp route policy is missing: ${route}`)
    }
  }
  for (const route of identityRoutes) {
    if (!reviewedRoutes.has(route) && !REVIEWED_IDENTITY_ADDITIONS.has(route)) {
      errors.push(`unreviewed identity-only webapp route: ${route}`)
    }
  }
  for (const route of REVIEWED_IDENTITY_ADDITIONS) {
    if (!identityRoutes.has(route)) {
      errors.push(`reviewed identity-only webapp route disappeared: ${route}`)
    }
  }
  for (const token of [
    'MOCK_SHOP_ITEMS',
    'Lorem ipsum dolor sit amet',
    "import noop from 'lodash-es/noop'",
    'onClick={noop}'
  ]) {
    if (!shopPrototypeSource.includes(token)) {
      errors.push(
        `unreleased Shop prototype changed and requires product review: ${token}`
      )
    }
  }
  for (const token of [
    'element={<FourOhFourPage />}',
    'element={<DeletedAccountPage />}',
    'path={ROUTES_CONFIG.routes.DELETED_ACCOUNT.path}',
    'useIdentityAppShell()',
    '{ErrorDialog}',
    '{CookieSettingsDialog}',
    '{OfflineDialog}'
  ]) {
    if (!identitySource.includes(token)) {
      errors.push(`Google identity route fidelity is missing: ${token}`)
    }
  }
  if (
    /path=["']\*["'][\s\S]{0,200}<Navigate[\s\S]{0,200}HOME/.test(
      identitySource
    )
  ) {
    errors.push(
      'Google identity wildcard silently redirects missing pages home'
    )
  }
  for (const token of [
    "env.AUTH_MODE === 'google'",
    'identityClient.startAccountDeletion(',
    'account.name'
  ]) {
    if (!authenticationClientSource.includes(token)) {
      errors.push(`Google account-deletion handoff is missing: ${token}`)
    }
  }
  for (const token of [
    "result === 'scheduled' ? '/deleted-account' : returnTo",
    'clearCookie(IDENTITY_SESSION_COOKIE',
    "accountDeletionRedirect(request, returnTo, 'scheduled')"
  ]) {
    if (!identityApiSource.includes(token)) {
      errors.push(`Google account-deletion completion is missing: ${token}`)
    }
  }
  for (const token of [
    'Element: ErrorDialog',
    'Element: CookieSettingsDialog',
    'Element: OfflineDialog',
    'useAnalytics()',
    'useUserPilot()',
    'useUpdatePageOffsets()',
    'analytics.trackView()'
  ]) {
    if (!identityShellSource.includes(token)) {
      errors.push(`Google app-shell fidelity is missing: ${token}`)
    }
  }
  for (const forbidden of [
    'SequenceConfirmSignatureDialog',
    'ConvertToSequenceWalletDialog',
    'RenameBurnerAccountDialog'
  ]) {
    if (identityShellSource.includes(forbidden)) {
      errors.push(`Google app shell mounts wallet-only behavior: ${forbidden}`)
    }
  }
  const cookieButton = accountSettingsSource.indexOf(
    'onClick={openCookieSettingsDialog}'
  )
  const legacyGuard = accountSettingsSource.indexOf(
    "env.AUTH_MODE !== 'google'"
  )
  if (cookieButton < 0 || (legacyGuard >= 0 && cookieButton > legacyGuard)) {
    errors.push('Google account settings do not expose cookie controls')
  }
  if (!pageOffsetSource.includes('useBanners(includeBanners)')) {
    errors.push('Google page offsets do not disable the absent banner query')
  }
  if (!bannerQuerySource.includes('enabled: enabled && !!userAddress')) {
    errors.push('disabled banner queries can still reach the API')
  }
  for (const token of [
    'const COOKIE_OPTIONS =',
    "cookie.id === 'AUTHENTICATION' || cookie.id === 'PRODUCT_ANALYTICS'",
    'No analytics provider is configured in the current',
    'Keeps your Google sign-in and essential Cloud Weasel app preferences working.'
  ]) {
    if (!cookieDialogSource.includes(token)) {
      errors.push(`Google cookie dialog policy is missing: ${token}`)
    }
  }
  for (const token of [
    "env.AUTH_MODE === 'google' ? IDENTITY_COOKIE_POLICY_ALL : COOKIE_POLICY_ALL",
    'Cloud Weasel uses essential session storage'
  ]) {
    if (!cookieDisclaimerSource.includes(token)) {
      errors.push(`Google cookie disclaimer policy is missing: ${token}`)
    }
  }
  for (const token of [
    "principalKind === 'identity'",
    '? identityPolicy(options)',
    'PRODUCT_ANALYTICS: options.PRODUCT_ANALYTICS === true'
  ]) {
    if (!cookieRepositorySource.includes(token)) {
      errors.push(`Google cookie persistence policy is missing: ${token}`)
    }
  }
  for (const token of [
    'CREATE TABLE cookie_policies_next',
    'CREATE TRIGGER identity_cookie_policy_insert_guard',
    'CREATE TRIGGER accounts_cookie_policy_delete',
    'CREATE TRIGGER users_cookie_policy_delete'
  ]) {
    if (!cookieMigrationSource.includes(token)) {
      errors.push(`Google cookie schema guard is missing: ${token}`)
    }
  }
  if (!appLayoutSource.includes('<DeckViewer />')) {
    errors.push('Google app layout does not mount the original Deck Viewer')
  }
  for (const token of [
    "lazy(() => import('~/CacheInfoPage/CacheInfoPage'))",
    'path={ROUTES_CONFIG.routes.CACHE_INFO.path}',
    '<CacheInfoPage />'
  ]) {
    if (!identitySource.includes(token)) {
      errors.push(`Google cache diagnostics are missing: ${token}`)
    }
  }
  if (!navBarSource.includes('<Banners />')) {
    errors.push('Google navigation does not mount the original banner strip')
  }
  if (/AUTH_MODE[^\n]*<Banners\s*\/>/.test(navBarSource)) {
    errors.push('Google navigation still suppresses the original banner strip')
  }
  if (appLayoutSource.includes('!isIdentityMode && <DeckViewer />')) {
    errors.push('Google app layout still suppresses the original Deck Viewer')
  }
  if (!deckViewerSource.includes("useBanners(env.AUTH_MODE !== 'google')")) {
    errors.push('Google Deck Viewer can still issue the absent banner query')
  }
  if (
    !deckViewerFooterSource.includes(
      "env.AUTH_MODE !== 'google' && !isFullyUnlocked && !isDeckClassLocked"
    )
  ) {
    errors.push('Google Deck Viewer exposes the legacy market-cart control')
  }
  for (const token of [
    'path={ROUTES_CONFIG.routes.ADMIN.path}',
    'path={ROUTES_CONFIG.routes.ADMIN.routes.USERS.path}',
    'path={ROUTES_CONFIG.routes.ADMIN.routes.USER.path}',
    'path={ROUTES_CONFIG.routes.ADMIN.routes.MATCHES.path}',
    'path={ROUTES_CONFIG.routes.ADMIN.routes.SIGNALS.path}',
    'path={ROUTES_CONFIG.routes.ADMIN.routes.PENDING_GOLDS.path}',
    'path={ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.path}'
  ]) {
    if (!identitySource.includes(token)) {
      errors.push(`Google admin route fidelity is missing: ${token}`)
    }
  }
  const adminLoadingBarrier = adminPageSource.indexOf(
    'if (loading || isAdmin === undefined) return <AuthenticatedPageLoader />'
  )
  const adminOutlet = adminPageSource.indexOf('<Outlet />')
  if (
    adminLoadingBarrier < 0 ||
    adminOutlet < 0 ||
    adminLoadingBarrier > adminOutlet
  ) {
    errors.push('Google admin child routes can mount before role confirmation')
  }
  for (const token of [
    "WHERE user_id = ? AND role = 'ADMIN'",
    "permission = 'CONTENT_WRITE'"
  ]) {
    if (!staffRepositorySource.includes(token)) {
      errors.push(`Google admin server authorization is missing: ${token}`)
    }
  }
  for (const token of [
    '<MarketPageSubNav />',
    '<MarketDecks />',
    'ROUTES_CONFIG.routes.MARKET.routes.DECKS.path',
    '<MarketCards />',
    '<MarketCardDetails />',
    'ROUTES_CONFIG.routes.MARKET.routes.CARDS.path',
    'ROUTES_CONFIG.routes.MARKET.routes.CARD.path',
    '<MarketStickers inventoryOnly />',
    '<MarketStickerFeature inventoryOnly />',
    'ROUTES_CONFIG.routes.MARKET.routes.STICKERS.path',
    'ROUTES_CONFIG.routes.MARKET.routes.STICKER.path',
    '<MarketCardBacks inventoryOnly />',
    '<MarketCardBackFeature inventoryOnly />',
    'ROUTES_CONFIG.routes.MARKET.routes.CARDBACKS.path',
    'ROUTES_CONFIG.routes.MARKET.routes.CARDBACK.path',
    '<MarketHeroes inventoryOnly />',
    'ROUTES_CONFIG.routes.MARKET.routes.HEROES.path'
  ]) {
    if (!identityMarketSource.includes(token)) {
      errors.push(`Google read-only Market fidelity is missing: ${token}`)
    }
  }
  for (const forbidden of ['ViewOrderButton', '<MarketHeroes />']) {
    if (identityMarketSource.includes(forbidden)) {
      errors.push(
        `Google read-only Market mounts legacy trading UI: ${forbidden}`
      )
    }
  }
  if (
    !marketDeckSource.includes("env.AUTH_MODE !== 'google' && (") ||
    !marketDeckSource.includes('<MarketDeckBalanceAndPriceInfo')
  ) {
    errors.push('Google read-only Market does not suppress legacy deck prices')
  }
  for (const token of [
    'makeMarketCardsRoute()',
    'makeNavigateToMarketDecksRoute()',
    'makeMarketHeroSkinsRoute()',
    'makeMarketStickersRoute()',
    'makeMarketCardBacksRoute()'
  ]) {
    if (!marketSubNavSource.includes(token)) {
      errors.push(`Google read-only Market subnav is missing: ${token}`)
    }
  }
  for (const token of [
    'disabled: isIdentityMarket',
    'const sortedCards = isIdentityMarket ? cards : priceSortedCards',
    'useFilteredCardsList('
  ]) {
    if (!marketCardsListSource.includes(token)) {
      errors.push(`Google card catalog sorting guard is missing: ${token}`)
    }
  }
  for (const token of [
    'useMarketStickersList(inventoryOnly)',
    'ItemComponent={inventoryOnly ? IdentityMarketSticker : MarketSticker}'
  ]) {
    if (!marketStickersListSource.includes(token)) {
      errors.push(`Google sticker catalog adapter is missing: ${token}`)
    }
  }
  for (const token of [
    'isDisabled: inventoryOnly',
    'useCartItem(id, mode, !inventoryOnly)',
    'if (inventoryOnly) {'
  ]) {
    if (!marketStickerSource.includes(token)) {
      errors.push(
        `Google sticker catalog transaction guard is missing: ${token}`
      )
    }
  }
  for (const token of [
    '<IdentityMarketStickersOwnershipFilter />',
    '<MarketStickersSortSelect inventoryOnly={inventoryOnly} />'
  ]) {
    if (!marketStickersSearchSource.includes(token)) {
      errors.push(
        `Google sticker catalog filter substitution is missing: ${token}`
      )
    }
  }
  for (const token of [
    'ShopControls={inventoryOnly ? undefined : ShopControls}',
    'EquipControls={inventoryOnly ? InventoryEquipControls : EquipControls}'
  ]) {
    if (!marketStickerFeatureSource.includes(token)) {
      errors.push(`Google sticker detail substitution is missing: ${token}`)
    }
  }
  for (const token of [
    'useMarketCardBacksList(inventoryOnly)',
    'ItemComponent={inventoryOnly ? IdentityMarketCardBack : MarketCardBack}'
  ]) {
    if (!marketCardBacksListSource.includes(token)) {
      errors.push(`Google card-back catalog adapter is missing: ${token}`)
    }
  }
  for (const token of [
    'isDisabled: inventoryOnly',
    'useCartItem(id, mode, !inventoryOnly)',
    'if (inventoryOnly) {'
  ]) {
    if (!marketCardBackSource.includes(token)) {
      errors.push(
        `Google card-back catalog transaction guard is missing: ${token}`
      )
    }
  }
  for (const token of [
    '<IdentityMarketCardBacksOwnershipFilter />',
    '<MarketCardBacksSortSelect inventoryOnly={inventoryOnly} />'
  ]) {
    if (!marketCardBacksSearchSource.includes(token)) {
      errors.push(
        `Google card-back catalog filter substitution is missing: ${token}`
      )
    }
  }
  for (const token of [
    'ShopControls={inventoryOnly ? undefined : ShopControls}',
    'EquipControls={inventoryOnly ? InventoryEquipControls : EquipControls}'
  ]) {
    if (!marketCardBackFeatureSource.includes(token)) {
      errors.push(`Google card-back detail substitution is missing: ${token}`)
    }
  }
  for (const token of [
    'useMarketHeroesList(inventoryOnly)',
    'ItemComponent={inventoryOnly ? IdentityMarketHero : MarketHero}'
  ]) {
    if (!marketHeroesListSource.includes(token)) {
      errors.push(`Google hero catalog adapter is missing: ${token}`)
    }
  }
  for (const token of [
    'useHeroSkinMintCosts(inventoryOnly)',
    'useTokenBalances(ItemType.SW_HERO_SKINS)',
    'if (inventoryOnly) {',
    '!inventoryOnly &&'
  ]) {
    if (!marketHeroListHookSource.includes(token)) {
      errors.push(`Google hero catalog price guard is missing: ${token}`)
    }
  }
  for (const token of [
    'IdentityMarketHeroBalance',
    'inventoryOnly ? IdentityMarketHeroBalance : MarketHeroBalance'
  ]) {
    if (!marketHeroSource.includes(token)) {
      errors.push(`Google hero catalog balance adapter is missing: ${token}`)
    }
  }
  const identityHeroBalanceSource = marketHeroSource.slice(
    marketHeroSource.indexOf('const IdentityMarketHeroBalance'),
    marketHeroSource.indexOf(
      "IdentityMarketHeroBalance.displayName = 'IdentityMarketHeroBalance'"
    )
  )
  if (
    identityHeroBalanceSource.includes('useHeroSkinMintCost') ||
    identityHeroBalanceSource.includes('prices=')
  ) {
    errors.push('Google hero catalog balance adapter restores mint pricing')
  }
  if (
    !marketHeroesSearchSource.includes(
      '<MarketHeroesSortSelect inventoryOnly={inventoryOnly} />'
    )
  ) {
    errors.push('Google hero catalog quantity sorting substitution is missing')
  }
  for (const token of ['!isDisabled &&', "env.AUTH_MODE !== 'google'"]) {
    if (!heroMintCostSource.includes(token)) {
      errors.push(`Google hero mint-cost query guard is missing: ${token}`)
    }
  }
  for (const token of [
    'useCartItem(id, mode, !isIdentityMarket)',
    '!isIdentityMarket && ('
  ]) {
    if (!marketCardSource.includes(token)) {
      errors.push(`Google card catalog cart guard is missing: ${token}`)
    }
  }
  for (const token of [
    'isDisabled: isIdentityMarket',
    'if (isIdentityMarket) return <CardBalance id={id} grade={grade} />'
  ]) {
    if (!marketCardBalanceSource.includes(token)) {
      errors.push(`Google card catalog balance guard is missing: ${token}`)
    }
  }
  for (const token of [
    '<IdentityMarketCardsOwnershipFilter />',
    '<MarketCardsSideSwitcher />'
  ]) {
    if (!marketCardsSearchSource.includes(token)) {
      errors.push(
        `Google card catalog filter substitution is missing: ${token}`
      )
    }
  }
  for (const token of [
    'IdentityItemsCardDetailsControls',
    "inventoryOnly={env.AUTH_MODE === 'google'}"
  ]) {
    if (!marketCardDetailsSource.includes(token)) {
      errors.push(
        `Google card catalog detail substitution is missing: ${token}`
      )
    }
  }
  if (!cartQuerySource.includes('enabled: enabled && !!userAddress')) {
    errors.push(
      'disabled Google card catalog cart queries can still reach the API'
    )
  }
  for (const token of [
    "const isIdentityMarket = env.AUTH_MODE === 'google'",
    'useCart(!isIdentityMarket)',
    'makeMarketCardsRoute()',
    'isIdentityMarket || isSecretShopVisible ? undefined : cartCount'
  ]) {
    if (!marketNavSource.includes(token)) {
      errors.push(`Google read-only Market navigation is missing: ${token}`)
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
    legacySource,
    identitySource,
    policySource,
    authenticationClientSource,
    identityApiSource,
    identityShellSource,
    accountSettingsSource,
    pageOffsetSource,
    bannerQuerySource,
    cookieDialogSource,
    cookieDisclaimerSource,
    cookieRepositorySource,
    cookieMigrationSource,
    appLayoutSource,
    navBarSource,
    deckViewerSource,
    deckViewerFooterSource,
    adminPageSource,
    staffRepositorySource,
    shopPrototypeSource,
    identityMarketSource,
    marketDeckSource,
    marketNavSource,
    marketSubNavSource,
    marketCardsListSource,
    marketCardSource,
    marketCardBalanceSource,
    marketCardsSearchSource,
    marketCardDetailsSource,
    marketStickersListSource,
    marketStickerSource,
    marketStickersSearchSource,
    marketStickerFeatureSource,
    marketCardBacksListSource,
    marketCardBackSource,
    marketCardBacksSearchSource,
    marketCardBackFeatureSource,
    marketHeroesListSource,
    marketHeroListHookSource,
    marketHeroSource,
    marketHeroesSearchSource,
    heroMintCostSource,
    cartQuerySource
  ] = await Promise.all([
    readFile(path.join(root, 'webapp/src/App.tsx'), 'utf8'),
    readFile(
      path.join(root, 'webapp/src/IdentitySession/IdentityApp.tsx'),
      'utf8'
    ),
    readFile(path.join(root, 'docs/CLOUDFLARE_WEBAPP_ROUTE_AUDIT.md'), 'utf8'),
    readFile(
      path.join(
        root,
        'webapp/src/clients/AuthenticationClient/AuthenticationClient.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/identity-api.ts'), 'utf8'),
    readFile(
      path.join(root, 'webapp/src/IdentitySession/useIdentityAppShell.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/components/AccountSettingsControls.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'webapp/src/hooks/useUpdatePageOffset.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'webapp/src/shared/queries/useBanners.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/hooks/useAppDialogs/components/CookieSettingsDialog.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'webapp/src/AppLayout/components/CookieDisclaimer.tsx'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/cookie-policies.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/migrations/0092_identity_cookie_policy.sql'),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/src/AppLayout/AppLayout.tsx'), 'utf8'),
    readFile(path.join(root, 'webapp/src/AppLayout/NavBar/NavBar.tsx'), 'utf8'),
    readFile(
      path.join(root, 'webapp/src/AppLayout/DeckViewer/DeckViewer.tsx'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/src/AdminPage/AdminPage.tsx'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
    Promise.all([
      readFile(
        path.join(root, 'webapp/src/ShopPage/shared/queries/mock-data.ts'),
        'utf8'
      ),
      readFile(
        path.join(root, 'webapp/src/ShopPage/ShopSection/ShopSection.tsx'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'webapp/src/ShopPage/ShopSection/ShopBox/components/PriceButton.tsx'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    readFile(
      path.join(root, 'webapp/src/MarketPage/IdentityMarketPage.tsx'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketDecks/MarketDecksList/MarketDeck/MarketDeck.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/AppLayout/NavBar/LinkSection/components/MarketLink.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'webapp/src/MarketPage/components/MarketPageSubNav.tsx'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCards/MarketCardsList/MarketCardsList.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCards/MarketCardsList/MarketCard/MarketCard.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCards/MarketCardsList/MarketCard/MarketCardBalance/MarketCardBalance.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCards/MarketCardsSearchBar/MarketCardsSearchBar.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCardDetails/MarketCardDetails.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketStickers/MarketStickersList/MarketStickersList.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketStickers/MarketStickersList/MarketSticker/MarketSticker.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketStickers/MarketStickersSearchBar/MarketStickersSearchBar.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketStickerFeature/MarketStickerFeature.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCardBacks/MarketCardBacksList/MarketCardBacksList.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCardBacks/MarketCardBacksList/MarketCardBack/MarketCardBack.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCardBacks/MarketCardBacksSearchBar/MarketCardBacksSearchBar.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketCardBackFeature/MarketCardBackFeature.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketHeroes/MarketHeroesList/MarketHeroesList.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketHeroes/MarketHeroesList/hooks/useMarketHeroesList.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketHeroes/MarketHeroesList/components/MarketHero.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/MarketPage/MarketHeroes/MarketHeroesSearchBar/MarketHeroesSearchBar.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp/src/shared/queries/hero-skins/useHeroSkinMintCost.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'webapp/src/shared/queries/useCart.ts'), 'utf8')
  ])
  const errors = webappRouteAuditErrors({
    legacySource,
    identitySource,
    policySource,
    authenticationClientSource,
    identityApiSource,
    identityShellSource,
    accountSettingsSource,
    pageOffsetSource,
    bannerQuerySource,
    cookieDialogSource,
    cookieDisclaimerSource,
    cookieRepositorySource,
    cookieMigrationSource,
    appLayoutSource,
    navBarSource,
    deckViewerSource,
    deckViewerFooterSource,
    adminPageSource,
    staffRepositorySource,
    shopPrototypeSource,
    identityMarketSource,
    marketDeckSource,
    marketNavSource,
    marketSubNavSource,
    marketCardsListSource,
    marketCardSource,
    marketCardBalanceSource,
    marketCardsSearchSource,
    marketCardDetailsSource,
    marketStickersListSource,
    marketStickerSource,
    marketStickersSearchSource,
    marketStickerFeatureSource,
    marketCardBacksListSource,
    marketCardBackSource,
    marketCardBacksSearchSource,
    marketCardBackFeatureSource,
    marketHeroesListSource,
    marketHeroListHookSource,
    marketHeroSource,
    marketHeroesSearchSource,
    heroMintCostSource,
    cartQuerySource
  })
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Webapp route audit: ${error}\n`)
    process.exitCode = 1
    return
  }
  const mounted = Object.values(REVIEWED_LEGACY_ROUTES).filter(
    review => review.mounted
  ).length
  process.stdout.write(
    `All ${Object.keys(REVIEWED_LEGACY_ROUTES).length} legacy webapp routes have reviewed Cloudflare dispositions; ${mounted} mount in Google mode\n`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
