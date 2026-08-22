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
