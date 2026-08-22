import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { bannerWireErrors } from './check-cloudflare-banner-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/data/banners_store.go',
  'cloudflare/src/banner-wire.ts',
  'cloudflare/src/api.ts',
  'package.json'
]

const fixtures = async () => {
  const values = await Promise.all(
    fixtureFiles.map(file => readFile(file, 'utf8'))
  )
  return Object.fromEntries(
    fixtureFiles.map((file, index) => [file, values[index]])
  )
}

const errorsFor = value => bannerWireErrors(...Object.values(value))

test('derives and enforces the complete banner wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects enum, pointer, omission, nil-list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'BannerType_EMERGENCY BannerType = 2',
      'BannerType_CRITICAL  BannerType = 2'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Type        *BannerType',
      'Type        BannerType'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"color" db:"color,omitempty"`',
      '`json:"color,omitempty" db:"color,omitempty"`'
    ),
    mutate('api/proto/api.gen.go', '`json:"link,omitempty"', '`json:"link"'),
    mutate(
      'api/data/banners_store.go',
      'var banners []*proto.Banner',
      'banners := make([]*proto.Banner, 0)'
    ),
    mutate(
      'cloudflare/src/banner-wire.ts',
      'type: banner.type ?? null',
      'type: banner.type'
    ),
    mutate(
      'cloudflare/src/banner-wire.ts',
      'color: banner.color ?? null',
      'color: banner.color'
    ),
    mutate(
      'cloudflare/src/banner-wire.ts',
      'banners.length ? banners.map(sourceBannerWire) : null',
      'banners.map(sourceBannerWire)'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'banners: sourceNullableBannerListWire(',
      'banners: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:banner-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
