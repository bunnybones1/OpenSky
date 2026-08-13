import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { webappRouteAuditErrors } from './audit-cloudflare-webapp-routes.mjs'

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
    deckViewerSource,
    deckViewerFooterSource
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
    readFile('webapp/src/AppLayout/DeckViewer/DeckViewer.tsx', 'utf8'),
    readFile(
      'webapp/src/AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx',
      'utf8'
    )
  ])
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
      deckViewerSource,
      deckViewerFooterSource
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
    deckViewerSource,
    deckViewerFooterSource
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
    readFile('webapp/src/AppLayout/DeckViewer/DeckViewer.tsx', 'utf8'),
    readFile(
      'webapp/src/AppLayout/DeckViewer/DeckViewerFooter/DeckViewerFooter.tsx',
      'utf8'
    )
  ])
  const errors = webappRouteAuditErrors({
    legacySource: legacySource.replace(
      'path={ROUTES_CONFIG.routes.HOME.path}',
      'path={ROUTES_CONFIG.routes.NEW_PRODUCT.path}'
    ),
    identitySource: identitySource
      .replace('path={ROUTES_CONFIG.routes.DELETED_ACCOUNT.path}', '')
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
    deckViewerSource: deckViewerSource.replace(
      "useBanners(env.AUTH_MODE !== 'google')",
      'useBanners()'
    ),
    deckViewerFooterSource: deckViewerFooterSource.replace(
      "env.AUTH_MODE !== 'google' && !isFullyUnlocked && !isDeckClassLocked",
      '!isFullyUnlocked && !isDeckClassLocked'
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
  assert.ok(errors.some(error => error.includes('suppresses')))
  assert.ok(errors.some(error => error.includes('absent banner query')))
  assert.ok(errors.some(error => error.includes('market-cart control')))
})
