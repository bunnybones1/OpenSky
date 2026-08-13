import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { webappRouteAuditErrors } from './audit-cloudflare-webapp-routes.mjs'

const readMarketFidelitySources = async () => {
  const [
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
    cartQuerySource
  ] = await Promise.all([
    readFile('webapp/src/MarketPage/components/MarketPageSubNav.tsx', 'utf8'),
    readFile(
      'webapp/src/MarketPage/MarketCards/MarketCardsList/MarketCardsList.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketCards/MarketCardsList/MarketCard/MarketCard.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketCards/MarketCardsList/MarketCard/MarketCardBalance/MarketCardBalance.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketCards/MarketCardsSearchBar/MarketCardsSearchBar.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketCardDetails/MarketCardDetails.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketStickers/MarketStickersList/MarketStickersList.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketStickers/MarketStickersList/MarketSticker/MarketSticker.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketStickers/MarketStickersSearchBar/MarketStickersSearchBar.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/MarketPage/MarketStickerFeature/MarketStickerFeature.tsx',
      'utf8'
    ),
    readFile('webapp/src/shared/queries/useCart.ts', 'utf8')
  ])
  return {
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
    cartQuerySource
  }
}

test('accepts the current reviewed legacy-to-identity route map', async () => {
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
    marketNavSource
  ] = await Promise.all([
    readFile('webapp/src/App.tsx', 'utf8'),
    readFile('webapp/src/IdentitySession/IdentityApp.tsx', 'utf8'),
    readFile('docs/CLOUDFLARE_WEBAPP_ROUTE_AUDIT.md', 'utf8'),
    readFile(
      'webapp/src/clients/AuthenticationClient/AuthenticationClient.ts',
      'utf8'
    ),
    readFile('cloudflare/src/identity-api.ts', 'utf8'),
    readFile('webapp/src/IdentitySession/useIdentityAppShell.ts', 'utf8'),
    readFile(
      'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/components/AccountSettingsControls.tsx',
      'utf8'
    ),
    readFile('webapp/src/hooks/useUpdatePageOffset.ts', 'utf8'),
    readFile('webapp/src/shared/queries/useBanners.ts', 'utf8'),
    readFile(
      'webapp/src/hooks/useAppDialogs/components/CookieSettingsDialog.tsx',
      'utf8'
    ),
    readFile('webapp/src/AppLayout/components/CookieDisclaimer.tsx', 'utf8'),
    readFile('cloudflare/src/cookie-policies.ts', 'utf8'),
    readFile('cloudflare/migrations/0092_identity_cookie_policy.sql', 'utf8'),
    readFile('webapp/src/AppLayout/AppLayout.tsx', 'utf8'),
    readFile('webapp/src/AppLayout/NavBar/NavBar.tsx', 'utf8'),
    readFile('webapp/src/AppLayout/DeckViewer/DeckViewer.tsx', 'utf8'),
    readFile(
      'webapp/src/AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx',
      'utf8'
    ),
    readFile('webapp/src/AdminPage/AdminPage.tsx', 'utf8'),
    readFile('cloudflare/src/staff.ts', 'utf8'),
    Promise.all([
      readFile('webapp/src/ShopPage/shared/queries/mock-data.ts', 'utf8'),
      readFile('webapp/src/ShopPage/ShopSection/ShopSection.tsx', 'utf8'),
      readFile(
        'webapp/src/ShopPage/ShopSection/ShopBox/components/PriceButton.tsx',
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    readFile('webapp/src/MarketPage/IdentityMarketPage.tsx', 'utf8'),
    readFile(
      'webapp/src/MarketPage/MarketDecks/MarketDecksList/MarketDeck/MarketDeck.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/AppLayout/NavBar/LinkSection/components/MarketLink.tsx',
      'utf8'
    )
  ])
  const marketFidelitySources = await readMarketFidelitySources()
  assert.deepEqual(
    webappRouteAuditErrors({
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
      ...marketFidelitySources
    }),
    []
  )
})

test('rejects unreviewed, lost, and silently redirected product routes', async () => {
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
    marketNavSource
  ] = await Promise.all([
    readFile('webapp/src/App.tsx', 'utf8'),
    readFile('webapp/src/IdentitySession/IdentityApp.tsx', 'utf8'),
    readFile('docs/CLOUDFLARE_WEBAPP_ROUTE_AUDIT.md', 'utf8'),
    readFile(
      'webapp/src/clients/AuthenticationClient/AuthenticationClient.ts',
      'utf8'
    ),
    readFile('cloudflare/src/identity-api.ts', 'utf8'),
    readFile('webapp/src/IdentitySession/useIdentityAppShell.ts', 'utf8'),
    readFile(
      'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/components/AccountSettingsControls.tsx',
      'utf8'
    ),
    readFile('webapp/src/hooks/useUpdatePageOffset.ts', 'utf8'),
    readFile('webapp/src/shared/queries/useBanners.ts', 'utf8'),
    readFile(
      'webapp/src/hooks/useAppDialogs/components/CookieSettingsDialog.tsx',
      'utf8'
    ),
    readFile('webapp/src/AppLayout/components/CookieDisclaimer.tsx', 'utf8'),
    readFile('cloudflare/src/cookie-policies.ts', 'utf8'),
    readFile('cloudflare/migrations/0092_identity_cookie_policy.sql', 'utf8'),
    readFile('webapp/src/AppLayout/AppLayout.tsx', 'utf8'),
    readFile('webapp/src/AppLayout/NavBar/NavBar.tsx', 'utf8'),
    readFile('webapp/src/AppLayout/DeckViewer/DeckViewer.tsx', 'utf8'),
    readFile(
      'webapp/src/AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx',
      'utf8'
    ),
    readFile('webapp/src/AdminPage/AdminPage.tsx', 'utf8'),
    readFile('cloudflare/src/staff.ts', 'utf8'),
    Promise.all([
      readFile('webapp/src/ShopPage/shared/queries/mock-data.ts', 'utf8'),
      readFile('webapp/src/ShopPage/ShopSection/ShopSection.tsx', 'utf8'),
      readFile(
        'webapp/src/ShopPage/ShopSection/ShopBox/components/PriceButton.tsx',
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    readFile('webapp/src/MarketPage/IdentityMarketPage.tsx', 'utf8'),
    readFile(
      'webapp/src/MarketPage/MarketDecks/MarketDecksList/MarketDeck/MarketDeck.tsx',
      'utf8'
    ),
    readFile(
      'webapp/src/AppLayout/NavBar/LinkSection/components/MarketLink.tsx',
      'utf8'
    )
  ])
  const marketFidelitySources = await readMarketFidelitySources()
  const errors = webappRouteAuditErrors({
    legacySource: legacySource.replace(
      'path={ROUTES_CONFIG.routes.HOME.path}',
      'path={ROUTES_CONFIG.routes.NEW_PRODUCT.path}'
    ),
    identitySource: identitySource
      .replace('path={ROUTES_CONFIG.routes.DELETED_ACCOUNT.path}', '')
      .replace('path={ROUTES_CONFIG.routes.CACHE_INFO.path}', '')
      .replace('useIdentityAppShell()', 'missingIdentityAppShell()')
      .replace(
        'element={<FourOhFourPage />}',
        'element={<Navigate to={ROUTES_CONFIG.routes.HOME.directPath} />}'
      ),
    policySource: policySource.replace('`preserved-original-page`', '`wrong`'),
    authenticationClientSource: authenticationClientSource.replace(
      'identityClient.startAccountDeletion(',
      'identityClient.missingAccountDeletion('
    ),
    identityApiSource: identityApiSource.replace(
      "result === 'scheduled' ? '/deleted-account' : returnTo",
      "result === 'scheduled' ? '/' : returnTo"
    ),
    identityShellSource: identityShellSource
      .replace('Element: ErrorDialog', 'Element: MissingErrorDialog')
      .replace(
        'useUpdatePageOffsets()',
        'useUpdatePageOffsets({ includeBanners: false })'
      )
      .concat('\nSequenceConfirmSignatureDialog'),
    accountSettingsSource: accountSettingsSource
      .replace(
        'onClick={openCookieSettingsDialog}',
        'onClick={missingCookieSettingsDialog}'
      )
      .concat(
        "\nenv.AUTH_MODE !== 'google' && onClick={openCookieSettingsDialog}"
      ),
    pageOffsetSource: pageOffsetSource.replace(
      'useBanners(includeBanners)',
      'useBanners()'
    ),
    bannerQuerySource: bannerQuerySource.replace(
      'enabled: enabled && !!userAddress',
      'enabled: !!userAddress'
    ),
    cookieDialogSource: cookieDialogSource.replace(
      "cookie.id === 'AUTHENTICATION' || cookie.id === 'PRODUCT_ANALYTICS'",
      "cookie.id === 'AUTHENTICATION' || cookie.id === 'MARKETPLACE'"
    ),
    cookieDisclaimerSource: cookieDisclaimerSource.replace(
      "env.AUTH_MODE === 'google' ? IDENTITY_COOKIE_POLICY_ALL : COOKIE_POLICY_ALL",
      'COOKIE_POLICY_ALL'
    ),
    cookieRepositorySource: cookieRepositorySource.replace(
      "principalKind === 'identity'",
      "principalKind === 'wallet'"
    ),
    cookieMigrationSource: cookieMigrationSource.replace(
      'CREATE TRIGGER users_cookie_policy_delete',
      'CREATE TRIGGER missing_users_cookie_policy_delete'
    ),
    appLayoutSource: appLayoutSource.replace(
      '<DeckViewer />',
      '{!isIdentityMode && <DeckViewer />}'
    ),
    navBarSource: navBarSource.replace(
      '<Banners />',
      "{env.AUTH_MODE !== 'google' && <Banners />}"
    ),
    deckViewerSource: deckViewerSource.replace(
      "useBanners(env.AUTH_MODE !== 'google')",
      'useBanners()'
    ),
    deckViewerFooterSource: deckViewerFooterSource.replace(
      "env.AUTH_MODE !== 'google' && !isFullyUnlocked && !isDeckClassLocked",
      '!isFullyUnlocked && !isDeckClassLocked'
    ),
    adminPageSource: adminPageSource.replace(
      'if (loading || isAdmin === undefined) return <AuthenticatedPageLoader />',
      'const missingAdminLoadingBarrier = true'
    ),
    staffRepositorySource: staffRepositorySource.replace(
      "permission = 'CONTENT_WRITE'",
      "permission = 'UNSAFE_WRITE'"
    ),
    shopPrototypeSource: shopPrototypeSource.replace(
      'onClick={noop}',
      'onClick={purchaseOffer}'
    ),
    identityMarketSource: identityMarketSource.concat('\n<ViewOrderButton />'),
    marketDeckSource,
    marketNavSource,
    ...marketFidelitySources,
    marketCardSource: marketFidelitySources.marketCardSource.replace(
      'useCartItem(id, mode, !isIdentityMarket)',
      'useCartItem(id, mode)'
    )
  })
  assert.ok(errors.some(error => error.includes('unreviewed legacy')))
  assert.ok(
    errors.some(error => error.includes('legacy webapp route disappeared'))
  )
  assert.ok(errors.some(error => error.includes('DELETED_ACCOUNT')))
  assert.ok(errors.some(error => error.includes('FourOhFourPage')))
  assert.ok(errors.some(error => error.includes('useIdentityAppShell')))
  assert.ok(errors.some(error => error.includes('silently redirects')))
  assert.ok(errors.some(error => error.includes('policy is missing: HOME')))
  assert.ok(errors.some(error => error.includes('deletion handoff')))
  assert.ok(errors.some(error => error.includes('deletion completion')))
  assert.ok(errors.some(error => error.includes('app-shell fidelity')))
  assert.ok(errors.some(error => error.includes('wallet-only behavior')))
  assert.ok(errors.some(error => error.includes('cookie controls')))
  assert.ok(errors.some(error => error.includes('absent banner query')))
  assert.ok(errors.some(error => error.includes('reach the API')))
  assert.ok(errors.some(error => error.includes('cookie dialog policy')))
  assert.ok(errors.some(error => error.includes('cookie disclaimer policy')))
  assert.ok(errors.some(error => error.includes('cookie persistence policy')))
  assert.ok(errors.some(error => error.includes('cookie schema guard')))
  assert.ok(errors.some(error => error.includes('cache diagnostics')))
  assert.ok(errors.some(error => error.includes('suppresses')))
  assert.ok(errors.some(error => error.includes('banner strip')))
  assert.ok(errors.some(error => error.includes('absent banner query')))
  assert.ok(errors.some(error => error.includes('market-cart control')))
  assert.ok(errors.some(error => error.includes('role confirmation')))
  assert.ok(errors.some(error => error.includes('server authorization')))
  assert.ok(errors.some(error => error.includes('Shop prototype changed')))
  assert.ok(errors.some(error => error.includes('legacy trading UI')))
  assert.ok(errors.some(error => error.includes('cart guard')))
})

test('rejects sticker catalog wallet controls in Google mode', async () => {
  const marketFidelitySources = await readMarketFidelitySources()
  const base = {
    legacySource: await readFile('webapp/src/App.tsx', 'utf8'),
    identitySource: await readFile(
      'webapp/src/IdentitySession/IdentityApp.tsx',
      'utf8'
    ),
    policySource: await readFile(
      'docs/CLOUDFLARE_WEBAPP_ROUTE_AUDIT.md',
      'utf8'
    ),
    authenticationClientSource: await readFile(
      'webapp/src/clients/AuthenticationClient/AuthenticationClient.ts',
      'utf8'
    ),
    identityApiSource: await readFile('cloudflare/src/identity-api.ts', 'utf8'),
    identityShellSource: await readFile(
      'webapp/src/IdentitySession/useIdentityAppShell.ts',
      'utf8'
    ),
    accountSettingsSource: await readFile(
      'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/SettingsButton/AccountSettingsDialog/components/AccountSettingsControls.tsx',
      'utf8'
    ),
    pageOffsetSource: await readFile(
      'webapp/src/hooks/useUpdatePageOffset.ts',
      'utf8'
    ),
    bannerQuerySource: await readFile(
      'webapp/src/shared/queries/useBanners.ts',
      'utf8'
    ),
    cookieDialogSource: await readFile(
      'webapp/src/hooks/useAppDialogs/components/CookieSettingsDialog.tsx',
      'utf8'
    ),
    cookieDisclaimerSource: await readFile(
      'webapp/src/AppLayout/components/CookieDisclaimer.tsx',
      'utf8'
    ),
    cookieRepositorySource: await readFile(
      'cloudflare/src/cookie-policies.ts',
      'utf8'
    ),
    cookieMigrationSource: await readFile(
      'cloudflare/migrations/0092_identity_cookie_policy.sql',
      'utf8'
    ),
    appLayoutSource: await readFile(
      'webapp/src/AppLayout/AppLayout.tsx',
      'utf8'
    ),
    navBarSource: await readFile(
      'webapp/src/AppLayout/NavBar/NavBar.tsx',
      'utf8'
    ),
    deckViewerSource: await readFile(
      'webapp/src/AppLayout/DeckViewer/DeckViewer.tsx',
      'utf8'
    ),
    deckViewerFooterSource: await readFile(
      'webapp/src/AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx',
      'utf8'
    ),
    adminPageSource: await readFile(
      'webapp/src/AdminPage/AdminPage.tsx',
      'utf8'
    ),
    staffRepositorySource: await readFile('cloudflare/src/staff.ts', 'utf8'),
    shopPrototypeSource: await Promise.all([
      readFile('webapp/src/ShopPage/shared/queries/mock-data.ts', 'utf8'),
      readFile('webapp/src/ShopPage/ShopSection/ShopSection.tsx', 'utf8'),
      readFile(
        'webapp/src/ShopPage/ShopSection/ShopBox/components/PriceButton.tsx',
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    identityMarketSource: await readFile(
      'webapp/src/MarketPage/IdentityMarketPage.tsx',
      'utf8'
    ),
    marketDeckSource: await readFile(
      'webapp/src/MarketPage/MarketDecks/MarketDecksList/MarketDeck/MarketDeck.tsx',
      'utf8'
    ),
    marketNavSource: await readFile(
      'webapp/src/AppLayout/NavBar/LinkSection/components/MarketLink.tsx',
      'utf8'
    ),
    ...marketFidelitySources
  }

  const errors = webappRouteAuditErrors({
    ...base,
    marketStickerSource: marketFidelitySources.marketStickerSource
      .replace('isDisabled: inventoryOnly', 'isDisabled: false')
      .replace(
        'useCartItem(id, mode, !inventoryOnly)',
        'useCartItem(id, mode)'
      ),
    marketStickersSearchSource:
      marketFidelitySources.marketStickersSearchSource.replace(
        '<IdentityMarketStickersOwnershipFilter />',
        '<MarketStickersSideSwitcher />'
      ),
    marketStickerFeatureSource:
      marketFidelitySources.marketStickerFeatureSource.replace(
        'ShopControls={inventoryOnly ? undefined : ShopControls}',
        'ShopControls={ShopControls}'
      )
  })

  assert.ok(errors.some(error => error.includes('transaction guard')))
  assert.ok(errors.some(error => error.includes('filter substitution')))
  assert.ok(errors.some(error => error.includes('detail substitution')))
})
