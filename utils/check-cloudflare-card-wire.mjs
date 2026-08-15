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

export const cardWireErrors = (
  generatedSource,
  cardsRPCSource,
  cardWire,
  cardBalanceWire,
  api,
  playerRPC
) => {
  const errors = []
  const fields = [
    'id',
    'name',
    'description',
    'asset',
    'class',
    'element',
    'type',
    'manaCost',
    'power',
    'health',
    'attachedSpellID',
    'keywords',
    'status',
    'set',
    'imageURL',
    'itemType',
    'isNew',
    'silverCardTokenId',
    'goldCardTokenId'
  ]
  const pointerFields = [
    'attachedSpellID',
    'imageURL',
    'isNew',
    'silverCardTokenId',
    'goldCardTokenId'
  ]
  const sourceFields = jsonFields(structBody(generatedSource, 'Card'))
  const publicFields = sourceFields.filter(field => field.json !== '-')

  if (
    JSON.stringify(publicFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push('source Card JSON field contract changed')
  }
  if (publicFields.some(field => field.omitEmpty)) {
    errors.push('source Card unexpectedly omits a public JSON field')
  }
  const pointers = publicFields
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)
  if (JSON.stringify(pointers) !== JSON.stringify(pointerFields)) {
    errors.push('source Card nullable pointer contract changed')
  }
  const privateFields = sourceFields
    .filter(field => field.json === '-')
    .map(field => field.name)
  if (
    JSON.stringify(privateFields) !==
    JSON.stringify(['Attributes', 'ValidFromSeason'])
  ) {
    errors.push('source Card private-field contract changed')
  }
  const imageFields = jsonFields(structBody(generatedSource, 'CardImageURL'))
  if (
    JSON.stringify(imageFields.map(field => field.json)) !==
      JSON.stringify(['small', 'medium', 'large']) ||
    imageFields.some(field => field.omitEmpty)
  ) {
    errors.push('source CardImageURL JSON contract changed')
  }

  for (const method of [
    'GetCardLibrary',
    'GetCardsByID',
    'GetCardsByDeckString',
    'SearchCards'
  ]) {
    if (!cardsRPCSource.includes(`func (s *Server) ${method}`)) {
      errors.push(`source Card RPC boundary changed: ${method}`)
    }
  }

  const compactWire = cardWire.replace(/\s+/g, ' ')
  for (const field of fields) {
    const nullable = pointerFields.includes(field) || field === 'keywords'
    const token = nullable
      ? `${field}: card.${field} ?? null`
      : `${field}: card.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker Card wire is missing: ${token}`)
    }
  }
  for (const privateField of ['attributes:', 'validFromSeason:']) {
    if (compactWire.includes(privateField)) {
      errors.push(`Worker Card wire leaks private field: ${privateField}`)
    }
  }

  if (!api.includes("import { sourceCardWire } from './card-wire'")) {
    errors.push('main Worker Card routes do not import their wire helper')
  }
  const cardRoutes = section(
    api,
    "case 'GetCardLibrary':",
    "case 'RegisterAccount':"
  ).replace(/\s+/g, ' ')
  for (const token of [
    'allLibraryCards().map(sourceCardWire)',
    'libraryCardsByIds(body.cardIDs).map(sourceCardWire)',
    'libraryCardsFromDeckString(body.deckString).map(sourceCardWire)',
    'result.res.map(sourceCardWithBalanceWire)'
  ]) {
    if (!cardRoutes.includes(token)) {
      errors.push(`main Worker Card projection is missing: ${token}`)
    }
  }
  const compactCardBalanceWire = cardBalanceWire.replace(/\s+/g, ' ')
  if (
    !compactCardBalanceWire.includes(
      'card: entry.card == null ? null : sourceCardWire(entry.card)'
    )
  ) {
    errors.push('nested SearchCards results bypass the Card wire')
  }
  if (!playerRPC.includes('card.validFromSeason <= season')) {
    errors.push('internal Card season metadata is no longer available to policy')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'rpc', 'cards.go'],
      ['cloudflare', 'src', 'card-wire.ts'],
      ['cloudflare', 'src', 'card-balance-wire.ts'],
      ['cloudflare', 'src', 'api.ts'],
      ['cloudflare', 'src', 'player-rpc.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = cardWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Card RPCs preserve the generated Go wire and hide internal season metadata'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
