import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CLOUD_WEASEL_LOCALE_KEYS,
  auditLocaleResources
} from './audit-cloudflare-locales.mjs'

const english = {
  auth: { body: 'Save {{ count }} items in Cloud Weasel.' },
  reward: { body: 'Delivered to <white>{{ name }}</white>.' }
}

test('the reviewed Cloud Weasel locale contract remains explicit', () => {
  assert.equal(CLOUD_WEASEL_LOCALE_KEYS.length, 70)
  assert.equal(new Set(CLOUD_WEASEL_LOCALE_KEYS).size, 70)
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
