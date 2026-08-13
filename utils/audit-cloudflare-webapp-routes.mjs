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
  CACHE_INFO: { disposition: 'legacy-diagnostic', mounted: false },
  SHOP: { disposition: 'legacy-secret-shop', mounted: false },
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
    disposition: 'walletconnect-capability-placeholder',
    mounted: true
  },
  ITEMS: { disposition: 'preserved-identity-inventory', mounted: true },
  DECK_BUILDER: { disposition: 'preserved-original-page', mounted: true },
  QUESTS: { disposition: 'preserved-offchain-rewards', mounted: true },
  CREATE_DECK: { disposition: 'preserved-original-page', mounted: true },
  ACCOUNT: { disposition: 'preserved-google-identity', mounted: true },
  ADMIN: { disposition: 'operator-ui-review-pending', mounted: false },
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
  identityApiSource
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
    'element={<FourOhFourPage />}',
    'element={<DeletedAccountPage />}',
    'path={ROUTES_CONFIG.routes.DELETED_ACCOUNT.path}'
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
    identityApiSource
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
    readFile(path.join(root, 'cloudflare/src/identity-api.ts'), 'utf8')
  ])
  const errors = webappRouteAuditErrors({
    legacySource,
    identitySource,
    policySource,
    authenticationClientSource,
    identityApiSource
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
