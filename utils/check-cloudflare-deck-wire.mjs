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

export const deckWireErrors = (
  generatedSource,
  protoTypesSource,
  decksRPCSource,
  decksIntegrationSource,
  deckWire,
  playerRPC,
  api
) => {
  const errors = []
  const fields = [
    'uuid',
    'name',
    'class',
    'deckString',
    'cardIds',
    'art',
    'createdAt',
    'updatedAt',
    'isFavorite',
    'favoritedAt',
    'deckType',
    'isNew',
    'conquestV2Points'
  ]
  const nullableFields = ['createdAt', 'updatedAt', 'favoritedAt']
  const sourceFields = jsonFields(structBody(generatedSource, 'Deck'))
  const publicFields = sourceFields.filter(field => field.json !== '-')

  if (
    JSON.stringify(publicFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push('source Deck JSON field contract changed')
  }
  if (publicFields.some(field => field.omitEmpty)) {
    errors.push('source Deck unexpectedly omits a public JSON field')
  }
  const nullable = publicFields
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)
  if (JSON.stringify(nullable) !== JSON.stringify(nullableFields)) {
    errors.push('source Deck nullable pointer contract changed')
  }
  const privateFields = sourceFields
    .filter(field => field.json === '-')
    .map(field => field.name)
  if (
    JSON.stringify(privateFields) !== JSON.stringify(['AccountID', 'Cursor'])
  ) {
    errors.push('source Deck private-field contract changed')
  }

  for (const token of [
    'func (d *Deck) MarshalJSON()',
    'if d.FavoritedAt != nil {',
    'd.IsFavorite = true',
    'return json.Marshal(*d)'
  ]) {
    if (!protoTypesSource.includes(token)) {
      errors.push(`source Deck favorite projection changed: ${token}`)
    }
  }
  for (const method of [
    'ListDecks',
    'SearchDecks',
    'CreateDeck',
    'UpdateDeck',
    'GetDeck',
    'ToggleDeckFavorite'
  ]) {
    if (!decksRPCSource.includes(`func (s *Server) ${method}`)) {
      errors.push(`source Deck RPC boundary changed: ${method}`)
    }
  }
  for (const token of [
    'assert.True(t, deck1.IsFavorite)',
    'assert.NotNil(t, deck1.FavoritedAt)',
    'assert.False(t, deck2.IsFavorite)',
    'assert.Nil(t, deck2.FavoritedAt)'
  ]) {
    if (!decksIntegrationSource.includes(token)) {
      errors.push(`source Deck favorite regression changed: ${token}`)
    }
  }

  const compactWire = deckWire.replace(/\s+/g, ' ')
  for (const field of fields) {
    const token = nullableFields.includes(field)
      ? `${field}: deck.${field} ?? null`
      : `${field}: deck.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker Deck wire is missing: ${token}`)
    }
  }

  if (!playerRPC.includes("import { sourceDeckWire } from './deck-wire'")) {
    errors.push('player Deck projection does not import its wire helper')
  }
  const listProjection = section(
    playerRPC,
    'async listDecks(',
    'async listDeckPage('
  ).replace(/\s+/g, ' ')
  for (const token of [
    'sourceDeckWire({',
    'isFavorite: row.favorited_at !== null',
    'favoritedAt: row.favorited_at',
    'conquestV2Points: row.conquest_v2_points'
  ]) {
    if (!listProjection.includes(token)) {
      errors.push(`player Deck row projection is missing: ${token}`)
    }
  }
  if (listProjection.includes("favoritedAt: row.favorited_at || ''")) {
    errors.push('player Deck row projection converts nil favorite time to text')
  }
  for (const token of [
    'return pagedDecks(await this.listDecks(userId)',
    'const decks = (await this.listDecks(userId))',
    'const decks = await this.listDecks(userId)'
  ]) {
    if (!playerRPC.includes(token)) {
      errors.push(`player Deck shared projection boundary changed: ${token}`)
    }
  }
  for (const method of [
    'ListDecks',
    'SearchDecks',
    'CreateDeck',
    'GetDeck',
    'UpdateDeck'
  ]) {
    if (!api.includes(`case '${method}':`)) {
      errors.push(`main Worker Deck boundary is missing: ${method}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'proto', 'types.go'],
      ['api', 'rpc', 'decks.go'],
      ['api', 'rpc', 'decks_integration_test.go'],
      ['cloudflare', 'src', 'deck-wire.ts'],
      ['cloudflare', 'src', 'player-rpc.ts'],
      ['cloudflare', 'src', 'api.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = deckWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Deck projections preserve the generated Go JSON wire')
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
