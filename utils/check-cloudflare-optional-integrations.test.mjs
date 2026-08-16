import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  LEGACY_CREATOR_PROGRAM_URL,
  OPTIONAL_TWITCH_QUERY_RETRY,
  creatorProgramUrl,
  hasLiveTwitchStreams
} from '../webapp/src/shared/components/LiveTwitchChannels/twitchAvailability.ts'
import {
  CLOUD_WEASEL_REPOSITORY_URL,
  LEGACY_OPENSKY_REPOSITORY_URL,
  sourceRepositoryUrl
} from '../webapp/src/shared/components/Footer/sourceRepository.ts'

test('renders the optional Twitch surface only after live streams exist', () => {
  assert.equal(hasLiveTwitchStreams(undefined), false)
  assert.equal(hasLiveTwitchStreams(null), false)
  assert.equal(hasLiveTwitchStreams([]), false)
  assert.equal(hasLiveTwitchStreams([{ id: 'stream-1' }]), true)
  assert.equal(OPTIONAL_TWITCH_QUERY_RETRY, false)
})

test('requires an explicit HTTPS creator-program destination', () => {
  assert.equal(creatorProgramUrl(undefined), undefined)
  assert.equal(creatorProgramUrl(''), undefined)
  assert.equal(creatorProgramUrl('not a URL'), undefined)
  assert.equal(creatorProgramUrl('http://example.test/program'), undefined)
  assert.equal(
    creatorProgramUrl(LEGACY_CREATOR_PROGRAM_URL),
    LEGACY_CREATOR_PROGRAM_URL
  )
})

test('requires an explicit HTTPS source-repository destination', () => {
  assert.equal(sourceRepositoryUrl(undefined), undefined)
  assert.equal(sourceRepositoryUrl(''), undefined)
  assert.equal(sourceRepositoryUrl('not a URL'), undefined)
  assert.equal(sourceRepositoryUrl('http://example.test/source'), undefined)
  assert.equal(
    sourceRepositoryUrl(CLOUD_WEASEL_REPOSITORY_URL),
    CLOUD_WEASEL_REPOSITORY_URL
  )
})

test('binds the tested fail-closed policy to the preserved browser component', async () => {
  const [component, query, footer, cloudflareConfig, composeConfig, localConfig] =
    await Promise.all([
      readFile(
        'webapp/src/shared/components/LiveTwitchChannels/LiveTwitchChannels.tsx',
        'utf8'
      ),
      readFile(
        'webapp/src/shared/components/LiveTwitchChannels/queries/useTwitchStreams.ts',
        'utf8'
      ),
      readFile('webapp/src/shared/components/Footer/Footer.tsx', 'utf8'),
      readFile('webapp/config/webapp.cloudflare.json', 'utf8').then(JSON.parse),
      readFile('webapp/config/webapp.compose.json', 'utf8').then(JSON.parse),
      readFile('webapp/config/webapp.local.json', 'utf8').then(JSON.parse)
    ])

  assert.match(component, /if \(!hasLiveTwitchStreams\(streams\)\) return null/)
  assert.match(component, /creatorProgramUrl\(env\.CREATOR_PROGRAM_URL\)/)
  assert.doesNotMatch(component, /Skeleton|skyweaver\.net\/community/)
  assert.match(query, /retry: OPTIONAL_TWITCH_QUERY_RETRY/)
  assert.match(footer, /sourceRepositoryUrl\(env\.SOURCE_REPOSITORY_URL\)/)
  assert.doesNotMatch(footer, /github\.com\/horizon-games\/OpenSky/)
  assert.equal(cloudflareConfig.CREATOR_PROGRAM_URL, '')
  assert.equal(composeConfig.CREATOR_PROGRAM_URL, LEGACY_CREATOR_PROGRAM_URL)
  assert.equal(localConfig.CREATOR_PROGRAM_URL, LEGACY_CREATOR_PROGRAM_URL)
  assert.equal(
    cloudflareConfig.SOURCE_REPOSITORY_URL,
    CLOUD_WEASEL_REPOSITORY_URL
  )
  assert.equal(
    composeConfig.SOURCE_REPOSITORY_URL,
    LEGACY_OPENSKY_REPOSITORY_URL
  )
  assert.equal(
    localConfig.SOURCE_REPOSITORY_URL,
    LEGACY_OPENSKY_REPOSITORY_URL
  )
})
