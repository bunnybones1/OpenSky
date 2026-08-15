import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const compact = source => source.replace(/\s+/g, ' ')

export const deckEquipmentWireErrors = (
  generatedSource,
  itemsSource,
  itemsIntegrationSource,
  itemEquippedSource,
  heroSkinSource,
  heroSkinMigrationSource,
  wireSource,
  playerSource,
  apiSource,
  packageSource
) => {
  const errors = []
  const fields = jsonFields(structBody(generatedSource, 'DeckEquipment'))
  if (
    JSON.stringify(fields.map(field => [field.json, field.type])) !==
    JSON.stringify([
      ['stickers', '[]uint64'],
      ['heroSkin', '*uint64'],
      ['cardBack', '*uint64']
    ])
  ) {
    errors.push('source DeckEquipment JSON field or pointer contract changed')
  }
  if (fields.some(field => field.omitEmpty)) {
    errors.push('source DeckEquipment unexpectedly omits a JSON field')
  }

  const handler = compact(
    section(
      itemsSource,
      'func (s *Server) GetDeckEquipmentByDeckString(',
      'type HeroSkinFinder interface'
    )
  )
  for (const token of [
    'deckEquipment := &proto.DeckEquipment{}',
    'deckEquipment.Stickers = append(deckEquipment.Stickers, itemEquipped.TokenID)',
    'var cardBacks []*data.ItemEquipped',
    'cardBacks[rand.Intn(len(cardBacks))].TokenID',
    'deckEquipment.CardBack = &cardBackTokenID',
    's.HeroSkinFinder.HasFromDeckString(ctx, accountID, deckString)',
    'heroSkinID := uint64(data.DeckClassHero(deckClass))',
    'deckEquipment.HeroSkin = &heroSkinID',
    'return deckEquipment, nil'
  ]) {
    if (!handler.includes(token)) {
      errors.push(`source DeckEquipment handler changed: ${token}`)
    }
  }
  for (const token of [
    'assert.Contains(t, deckEquipment.Stickers, sticker.TokenID)',
    'assert.Equal(t, heroSkin.TokenID, *deckEquipment.HeroSkin)',
    'assert.Contains(t, cardBackTokenIDs, *deckEquipment.CardBack)'
  ]) {
    if (!itemsIntegrationSource.includes(token)) {
      errors.push(`source DeckEquipment integration proof changed: ${token}`)
    }
  }
  for (const token of [
    'var itemsEquipped []*ItemEquipped',
    's.Find(cond).All(&itemsEquipped)',
    'return itemsEquipped, nil'
  ]) {
    if (!itemEquippedSource.includes(token)) {
      errors.push(`source equipped-item list changed: ${token}`)
    }
  }
  for (const token of [
    'DB.HeroSkins(nil).Find(db.Cond{"hero": hero}).One(&heroSkin)',
    'FindAccountItem(accountID, proto.ItemType_SW_HERO_SKINS, heroSkin.ID)',
    'if item.Balance.Equals(prototyp.NewBigInt(0).Int())'
  ]) {
    if (!heroSkinSource.includes(token)) {
      errors.push(`source hero-skin lookup changed: ${token}`)
    }
  }
  for (let id = 1; id <= 15; id += 1) {
    const token = `INSERT INTO hero_skins (id, hero) VALUES (${id}, ${id});`
    if (!heroSkinMigrationSource.includes(token)) {
      errors.push(`source hero-skin identity mapping changed: ${token}`)
    }
  }

  const wire = compact(wireSource)
  for (const token of [
    'stickers: equipment.stickers?.length ? [...equipment.stickers] : null',
    'heroSkin: equipment.heroSkin ?? null',
    'cardBack: equipment.cardBack ?? null'
  ]) {
    if (!wire.includes(token)) {
      errors.push(`Worker DeckEquipment wire is missing: ${token}`)
    }
  }

  const repository = compact(
    section(playerSource, 'async deckEquipment(', 'async markItemsNotNew(')
  )
  for (const token of [
    'item.balance > 0',
    "item.item_type === ('SW_STICKERS' as ItemType)",
    "item.item_type === ('SW_CARD_BACKS' as ItemType)",
    'crypto.getRandomValues(new Uint32Array(1))[0]',
    "this.ownedItem( userId, 'SW_HERO_SKINS' as ItemType, heroId )"
  ]) {
    if (!repository.includes(token)) {
      errors.push(`Worker DeckEquipment repository changed: ${token}`)
    }
  }
  if (
    !apiSource.includes(
      "import { sourceDeckEquipmentWire } from './deck-equipment-wire'"
    )
  ) {
    errors.push('main Worker does not import the DeckEquipment wire helper')
  }
  const route = compact(
    section(
      apiSource,
      "case 'GetDeckEquipmentByDeckString':",
      "case 'GetCardOwnership':"
    )
  )
  for (const token of [
    'deckEquipment: sourceDeckEquipmentWire(',
    'await playerRpc.deckEquipment(principal.userId, body.deckString)'
  ]) {
    if (!route.includes(token)) {
      errors.push(`main Worker DeckEquipment route changed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:deck-equipment-wire'
    )
  ) {
    errors.push('complete Cloudflare build omits the DeckEquipment wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
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
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = deckEquipmentWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'DeckEquipment preserves generated nulls and source item selection'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
