import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CLOUD_WEASEL_LOCALE_KEYS,
  auditConquestDormantRewardCopy,
  auditHomeConquestRewardCopy,
  auditLocaleResources,
  auditStringPluralCounts
} from './audit-cloudflare-locales.mjs'

const english = {
  auth: { body: 'Save {{ count }} items in Cloud Weasel.' },
  reward: { body: 'Delivered to <white>{{ name }}</white>.' }
}

test('the reviewed Cloud Weasel locale contract remains explicit', () => {
  assert.equal(CLOUD_WEASEL_LOCALE_KEYS.length, 72)
  assert.equal(new Set(CLOUD_WEASEL_LOCALE_KEYS).size, 72)
})

test('accepts complete locale resources with preserved structural tokens', () => {
  const resources = {
    en: english,
    fr: {
      auth: { body: 'Enregistrez {{ count }} objets dans Cloud Weasel.' },
      reward: { body: 'Livré à <white>{{ name }}</white>.' }
    }
  }
  assert.deepEqual(
    auditLocaleResources(resources, ['auth.body', 'reward.body'], ['en', 'fr']),
    []
  )
})

test('rejects a new identity or off-chain key outside the reviewed contract', () => {
  const resources = {
    en: { identityAuth: { futureProvider: 'Sign in another way' } }
  }
  assert.deepEqual(auditLocaleResources(resources, [], ['en']), [
    'unreviewed Cloud Weasel locale key: identityAuth.futureProvider'
  ])
})

test('rejects a missing translation instead of allowing English fallback', () => {
  const resources = { en: english, fr: { auth: english.auth } }
  assert.deepEqual(
    auditLocaleResources(resources, ['auth.body', 'reward.body'], ['en', 'fr']),
    ['fr is missing Cloud Weasel locale key: reward.body']
  )
})

test('rejects changed interpolation and markup tokens', () => {
  const resources = {
    en: english,
    fr: {
      auth: english.auth,
      reward: { body: 'Livré à <strong>{{ player }}</strong>.' }
    }
  }
  assert.match(
    auditLocaleResources(
      resources,
      ['auth.body', 'reward.body'],
      ['en', 'fr']
    )[0],
    /changed interpolation\/markup tokens/
  )
})

test('rejects translations that drop the product name', () => {
  const resources = {
    en: english,
    fr: {
      auth: { body: 'Enregistrez {{ count }} objets dans votre inventaire.' },
      reward: english.reward
    }
  }
  assert.deepEqual(
    auditLocaleResources(resources, ['auth.body'], ['en', 'fr']),
    ['fr.auth.body dropped the Cloud Weasel product name']
  )
})

test('rejects non-numeric literals used to select an i18next plural', () => {
  assert.deepEqual(
    auditStringPluralCounts({
      'ConquestInfo.tsx': "t('play.rewards.points', { count: '25%' })"
    }),
    [
      'ConquestInfo.tsx passes non-numeric plural count "25%" to unsuffixed key play.rewards.points'
    ]
  )
})

test('allows numeric plural selectors and explicit plural interpolation', () => {
  assert.deepEqual(
    auditStringPluralCounts({
      'ConquestInfo.tsx': [
        "t('play.rewards.points', { count: '25' })",
        "t('play.rewards.points_other', { count: '25%' })"
      ].join('\n')
    }),
    []
  )
})

const safeConquestRewardCopy = `
  {!displayConquestCards && (
    <Text>{t('play.conquestRewardsInactive')}</Text>
  )}
  {displayConquestCards && (
    <>
      <GoldMintWarning>{t('play.over100Golds')}</GoldMintWarning>
      <InnerContainer>{t('play.silversAvailable')}</InnerContainer>
    </>
  )}
`

test('accepts pool-specific Conquest copy only behind active-pool authority', () => {
  assert.deepEqual(auditConquestDormantRewardCopy(safeConquestRewardCopy), [])
})

test('rejects dormant Conquest UI that advertises an unapproved card pool', () => {
  assert.deepEqual(
    auditConquestDormantRewardCopy(
      safeConquestRewardCopy.replace('{displayConquestCards && (', '{(')
    ),
    [
      'Conquest pool-specific Gold/Silver claims are not gated by an active pool'
    ]
  )
})

const safeHomeConquestRewardCopy = `
  const { data: conquestRewards } = useConquestRewards()
  const hasActiveConquestRewards =
    !!conquestRewards?.rewards.weeklyGolds.length
  const title = hasActiveConquestRewards
    ? 'home.mainFeatureConquest.title'
    : 'play.conquestRewardsInactive'
`

test('accepts the Home Conquest claim behind active-pool authority', () => {
  assert.deepEqual(
    auditHomeConquestRewardCopy(safeHomeConquestRewardCopy),
    []
  )
})

test('rejects a Home Conquest claim while the reward pool is dormant', () => {
  assert.deepEqual(
    auditHomeConquestRewardCopy(
      safeHomeConquestRewardCopy.replace(
        "hasActiveConquestRewards\n    ? 'home.mainFeatureConquest.title'\n    : 'play.conquestRewardsInactive'",
        "'home.mainFeatureConquest.title'"
      )
    ),
    ['Home Conquest reward claim is not replaced by inactive-pool copy']
  )
})
