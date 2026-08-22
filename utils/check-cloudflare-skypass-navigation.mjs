import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const skypassNavigationErrors = ({
  linkSectionSource,
  skyPassLinkSource,
  levelSource,
  claimRewardSource,
  identityAppSource,
  skypassConstantsSource
}) => {
  const errors = []

  for (const token of [
    "import { SkyPassLink } from './components/SkyPassLink'",
    '<SkyPassLink isHorizontal={isHorizontal} />'
  ]) {
    if (!linkSectionSource.includes(token)) {
      errors.push(`original navbar is missing SkyPass integration: ${token}`)
    }
  }

  for (const token of [
    'ROUTES_CONFIG.routes.SKY_PASS.directPath',
    'isSkypassRouteSelector',
    "t('navigation.skypass')",
    'icon="sky-pass"',
    'id="skypass"',
    'isHorizontal={isHorizontal}'
  ]) {
    if (!skyPassLinkSource.includes(token)) {
      errors.push(`SkyPass navbar link is missing behavior: ${token}`)
    }
  }

  const skyPassPosition = linkSectionSource.indexOf(
    '<SkyPassLink isHorizontal={isHorizontal} />'
  )
  const playPosition = linkSectionSource.indexOf(
    '<PlayLink isHorizontal={isHorizontal} />'
  )
  if (skyPassPosition < 0 || playPosition < 0 || skyPassPosition > playPosition) {
    errors.push('SkyPass must remain visible before the primary Play action')
  }

  if (!skypassConstantsSource.includes('IS_PREMIUM_SKYPASS_AVAILABLE = false')) {
    errors.push('Premium SkyPass upgrades must remain disabled by default')
  }

  if (
    !levelSource.includes(
      'const premiumSkyPassVisible = IS_PREMIUM_SKYPASS_AVAILABLE'
    ) ||
    levelSource.includes("env.AUTH_MODE === 'google' || IS_PREMIUM_SKYPASS_AVAILABLE")
  ) {
    errors.push('SkyPass level upgrade link is not guarded by the availability flag')
  }

  for (const token of [
    'const premiumUpgradeAvailable = IS_PREMIUM_SKYPASS_AVAILABLE',
    '!premiumUpgradeAvailable',
    'premiumUpgradeAvailable &&'
  ]) {
    if (!claimRewardSource.includes(token)) {
      errors.push(`SkyPass reward upgrade action is not safely disabled: ${token}`)
    }
  }

  const identityPurchaseRoute = identityAppSource.indexOf(
    'path={ROUTES_CONFIG.routes.SKY_PASS_PURCHASE.path}'
  )
  const identityPurchaseGuard = identityAppSource.lastIndexOf(
    'IS_PREMIUM_SKYPASS_AVAILABLE &&',
    identityPurchaseRoute
  )
  if (
    identityPurchaseRoute < 0 ||
    identityPurchaseGuard < 0 ||
    identityPurchaseRoute - identityPurchaseGuard > 250
  ) {
    errors.push('Google-auth SkyPass purchase route is not availability guarded')
  }

  return errors
}

export const checkSkypassNavigation = async () => {
  const [
    linkSectionSource,
    skyPassLinkSource,
    levelSource,
    claimRewardSource,
    identityAppSource,
    skypassConstantsSource
  ] = await Promise.all([
    readFile('webapp/src/AppLayout/NavBar/LinkSection/LinkSection.tsx', 'utf8'),
    readFile(
      'webapp/src/AppLayout/NavBar/LinkSection/components/SkyPassLink.tsx',
      'utf8'
    ),
    readFile('webapp/src/SkyPassPage/SkyPassForeground/Level/Level.tsx', 'utf8'),
    readFile(
      'webapp/src/SkyPassPage/SkyPassForeground/SkyPassClaimReward/SkyPassClaimReward.tsx',
      'utf8'
    ),
    readFile('webapp/src/IdentitySession/IdentityApp.tsx', 'utf8'),
    readFile('webapp/src/shared/constants/skypass.ts', 'utf8')
  ])
  const errors = skypassNavigationErrors({
    linkSectionSource,
    skyPassLinkSource,
    levelSource,
    claimRewardSource,
    identityAppSource,
    skypassConstantsSource
  })
  if (errors.length > 0) {
    throw new Error(`SkyPass navigation check failed:\n- ${errors.join('\n- ')}`)
  }
  return 'SkyPass navigation check passed.'
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  checkSkypassNavigation()
    .then(message => console.log(message))
    .catch(error => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
