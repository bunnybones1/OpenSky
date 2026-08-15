import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { deckEquipmentWireErrors } from './check-cloudflare-deck-equipment-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/items.go',
  'api/rpc/items_integration_test.go',
  'api/data/item_equipped.go',
  'api/data/hero_skin.go',
  'api/data/schema/migrations/30000000000181_create_hero_skins_table.sql',
  'cloudflare/src/deck-equipment-wire.ts',
  'cloudflare/src/player-rpc.ts',
  'cloudflare/src/api.ts',
  'package.json'
]

const fixtures = async () =>
  Promise.all(fixtureFiles.map(file => readFile(file, 'utf8')))

const errorsFor = values => deckEquipmentWireErrors(...values)

const mutate = (values, file, from, to) => {
  const result = [...values]
  const index = fixtureFiles.indexOf(file)
  assert.notEqual(index, -1)
  assert.ok(result[index].includes(from), `${file} mutation anchor is present`)
  result[index] = result[index].replace(from, to)
  return result
}

const mutateAll = (values, file, from, to) => {
  const result = [...values]
  const index = fixtureFiles.indexOf(file)
  assert.notEqual(index, -1)
  assert.ok(result[index].includes(from), `${file} mutation anchor is present`)
  result[index] = result[index].replaceAll(from, to)
  return result
}

test('derives and enforces the complete Go DeckEquipment wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source, selection, null, route, and gate drift', async () => {
  const values = await fixtures()
  const mutations = [
    mutate(
      values,
      'api/proto/api.gen.go',
      'json:"heroSkin"',
      'json:"heroSkin,omitempty"'
    ),
    mutate(
      values,
      'api/proto/api.gen.go',
      'Stickers []uint64 `json:"stickers"`',
      'Stickers *[]uint64 `json:"stickers"`'
    ),
    mutate(
      values,
      'api/rpc/items.go',
      'deckEquipment := &proto.DeckEquipment{}',
      'deckEquipment := &proto.DeckEquipment{Stickers: []uint64{}}'
    ),
    mutate(
      values,
      'api/rpc/items.go',
      'deckEquipment.Stickers = append(',
      'deckEquipment.Stickers = nil // append('
    ),
    mutate(values, 'api/rpc/items.go', 'rand.Intn(len(cardBacks))', '0'),
    mutate(
      values,
      'api/rpc/items.go',
      'deckEquipment.HeroSkin = &heroSkinID',
      'deckEquipment.HeroSkin = nil'
    ),
    mutate(
      values,
      'api/data/item_equipped.go',
      'var itemsEquipped []*ItemEquipped',
      'itemsEquipped := make([]*ItemEquipped, 0)'
    ),
    mutate(values, 'api/data/hero_skin.go', 'heroSkin.ID)', 'uint64(hero))'),
    mutate(
      values,
      'api/data/schema/migrations/30000000000181_create_hero_skins_table.sql',
      'VALUES (15, 15);',
      'VALUES (15, 1);'
    ),
    mutate(
      values,
      'cloudflare/src/deck-equipment-wire.ts',
      'stickers: equipment.stickers?.length ? [...equipment.stickers] : null',
      'stickers: equipment.stickers ?? []'
    ),
    mutate(
      values,
      'cloudflare/src/deck-equipment-wire.ts',
      'heroSkin: equipment.heroSkin ?? null',
      'heroSkin: equipment.heroSkin'
    ),
    mutateAll(
      values,
      'cloudflare/src/player-rpc.ts',
      'WHERE equipped.user_id = ? AND item.balance > 0',
      'WHERE equipped.user_id = ?'
    ),
    mutate(
      values,
      'cloudflare/src/api.ts',
      'deckEquipment: sourceDeckEquipmentWire(',
      'deckEquipment: ('
    ),
    mutate(
      values,
      'package.json',
      'pnpm check:cloudflare:deck-equipment-wire && ',
      ''
    )
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
