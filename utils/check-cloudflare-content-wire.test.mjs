import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { contentWireErrors } from './check-cloudflare-content-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/stickers.go',
  'api/rpc/social_info.go',
  'api/data/twitch_featured_streamers_store.go',
  'cloudflare/src/content-wire.ts',
  'cloudflare/src/content.ts',
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

const errorsFor = value => contentWireErrors(...Object.values(value))

test('derives and enforces content response wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects field, pointer, allocation, projection, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'RequiredPoints uint64 `json:"requiredPoints"',
      'RequiredPoints uint32 `json:"requiredPoints"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'IsNew   *bool           `json:"isNew"',
      'IsNew   bool            `json:"isNew"'
    ),
    mutate(
      'api/rpc/stickers.go',
      'response.StickerBalances = make(map[uint64]*proto.BalanceTuple)',
      'response.StickerBalances = nil'
    ),
    mutate(
      'api/rpc/stickers.go',
      '&proto.BalanceTuple{Balance: b.Balance}',
      '&proto.BalanceTuple{Balance: b.Balance, IsNew: ptr(true)}'
    ),
    mutate(
      'api/data/twitch_featured_streamers_store.go',
      'var streamers []*proto.TwitchFeaturedStreamer',
      'streamers := make([]*proto.TwitchFeaturedStreamer, 0)'
    ),
    mutate(
      'cloudflare/src/content-wire.ts',
      "username: streamer.username ?? ''",
      "username: streamer.username ?? '',\n  internalID: 1"
    ),
    mutate(
      'cloudflare/src/content-wire.ts',
      'requiredPoints: sticker.requiredPoints ?? 0',
      'requiredPoints: sticker.requiredPoints'
    ),
    mutate(
      'cloudflare/src/content-wire.ts',
      'tuple == null ? null : sourceBalanceTupleWire(tuple)',
      'sourceBalanceTupleWire(tuple ?? { balance: "0" })'
    ),
    mutate(
      'cloudflare/src/content.ts',
      '{ balance: String(row.balance), isNew: null }',
      '{ balance: String(row.balance), isNew: false }'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'streamers: sourceTwitchFeaturedStreamerListWire(',
      'streamers: ('
    ),
    mutate(
      'cloudflare/src/api.ts',
      'res: sourceStickerOwnershipWire(',
      'res: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:content-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
