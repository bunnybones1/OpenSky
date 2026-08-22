import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { skypassNavigationErrors } from './check-cloudflare-skypass-navigation.mjs'

const readCurrentSources = async () => ({
  linkSectionSource: await readFile(
    'webapp/src/AppLayout/NavBar/LinkSection/LinkSection.tsx',
    'utf8'
  ),
  skyPassLinkSource: await readFile(
    'webapp/src/AppLayout/NavBar/LinkSection/components/SkyPassLink.tsx',
    'utf8'
  ),
  levelSource: await readFile(
    'webapp/src/SkyPassPage/SkyPassForeground/Level/Level.tsx',
    'utf8'
  ),
  claimRewardSource: await readFile(
    'webapp/src/SkyPassPage/SkyPassForeground/SkyPassClaimReward/SkyPassClaimReward.tsx',
    'utf8'
  ),
  identityAppSource: await readFile(
    'webapp/src/IdentitySession/IdentityApp.tsx',
    'utf8'
  ),
  skypassConstantsSource: await readFile(
    'webapp/src/shared/constants/skypass.ts',
    'utf8'
  )
})

test('accepts the original-style SkyPass navbar entry', async () => {
  assert.deepEqual(skypassNavigationErrors(await readCurrentSources()), [])
})

test('rejects a navbar that hides the SkyPass entry', async () => {
  const sources = await readCurrentSources()
  sources.linkSectionSource = sources.linkSectionSource.replace(
    '<SkyPassLink isHorizontal={isHorizontal} />',
    ''
  )

  assert.ok(
    skypassNavigationErrors(sources).some(error =>
      error.includes('original navbar is missing SkyPass integration')
    )
  )
})

test('rejects a SkyPass link that loses route-aware behavior', async () => {
  const sources = await readCurrentSources()
  sources.skyPassLinkSource = sources.skyPassLinkSource.replaceAll(
    'isSkypassRouteSelector',
    'removedSelector'
  )

  assert.ok(
    skypassNavigationErrors(sources).some(error =>
      error.includes('isSkypassRouteSelector')
    )
  )
})

test('rejects premium upgrade links that bypass the availability flag', async () => {
  const sources = await readCurrentSources()
  sources.levelSource = sources.levelSource.replace(
    'const premiumSkyPassVisible = IS_PREMIUM_SKYPASS_AVAILABLE',
    "const premiumSkyPassVisible = env.AUTH_MODE === 'google'"
  )
  sources.claimRewardSource = sources.claimRewardSource.replace(
    'premiumUpgradeAvailable &&',
    'true &&'
  )
  sources.identityAppSource = sources.identityAppSource.replace(
    'IS_PREMIUM_SKYPASS_AVAILABLE &&',
    'true &&'
  )

  const errors = skypassNavigationErrors(sources)
  assert.ok(errors.some(error => error.includes('level upgrade link')))
  assert.ok(errors.some(error => error.includes('reward upgrade action')))
  assert.ok(errors.some(error => error.includes('purchase route')))
})

test('rejects enabling premium upgrades by default', async () => {
  const sources = await readCurrentSources()
  sources.skypassConstantsSource = sources.skypassConstantsSource.replace(
    'IS_PREMIUM_SKYPASS_AVAILABLE = false',
    'IS_PREMIUM_SKYPASS_AVAILABLE = true'
  )

  assert.ok(
    skypassNavigationErrors(sources).some(error =>
      error.includes('disabled by default')
    )
  )
})
