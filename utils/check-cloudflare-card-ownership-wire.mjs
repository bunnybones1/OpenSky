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

export const cardOwnershipWireErrors = (
  generatedSource,
  cardsRPCSource,
  cardBalanceWire,
  playerRPC,
  api
) => {
  const errors = []
  const fields = [
    'cardBalances',
    'lockedCards',
    'lockedCardsByClass',
    'lockedCardsByFrame',
    'lockedCardsByClassAndFrame',
    'unlockedCards',
    'unlockedCardsByClass',
    'unlockedCardsByFrame',
    'unlockedCardsByClassAndFrame',
    'pendingCards',
    'pendingCardsByClass',
    'pendingCardsByFrame',
    'pendingCardsByClassAndFrame'
  ]
  const mapFields = fields.filter(
    field => !['lockedCards', 'unlockedCards', 'pendingCards'].includes(field)
  )
  const sourceFields = jsonFields(
    structBody(generatedSource, 'CardOwnershipResponse')
  )
  const publicFields = sourceFields.filter(field => field.json !== '-')
  if (
    JSON.stringify(publicFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push('source CardOwnershipResponse JSON field contract changed')
  }
  if (publicFields.some(field => field.omitEmpty)) {
    errors.push(
      'source CardOwnershipResponse unexpectedly omits a public JSON field'
    )
  }
  if (publicFields.some(field => field.type.startsWith('*'))) {
    errors.push('source CardOwnershipResponse pointer contract changed')
  }
  if (
    JSON.stringify(
      publicFields
        .filter(field => field.type.startsWith('map['))
        .map(field => field.json)
    ) !== JSON.stringify(mapFields)
  ) {
    errors.push('source CardOwnershipResponse map contract changed')
  }
  if (sourceFields.some(field => field.json === '-')) {
    errors.push('source CardOwnershipResponse private-field contract changed')
  }

  const sourceOwnership = section(
    cardsRPCSource,
    'func (s *Server) GetCardOwnership(',
    'func (s *Server) GetPendingCards('
  )
  const initializedMaps = [
    'CardBalances',
    'LockedCardsByClass',
    'LockedCardsByFrame',
    'LockedCardsByClassAndFrame',
    'UnlockedCardsByClass',
    'UnlockedCardsByFrame',
    'UnlockedCardsByClassAndFrame',
    'PendingCardsByClass',
    'PendingCardsByFrame',
    'PendingCardsByClassAndFrame'
  ]
  for (const field of initializedMaps) {
    if (!sourceOwnership.includes(`response.${field} = make(`)) {
      errors.push(`source GetCardOwnership no longer initializes ${field}`)
    }
  }
  for (const token of [
    'proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS',
    'vals[frame.String()] = new(proto.BalanceTuple)',
    'vals[b.ItemType.String()].IsNew = b.IsNew'
  ]) {
    if (!sourceOwnership.includes(token)) {
      errors.push(`source GetCardOwnership tuple contract changed: ${token}`)
    }
  }

  const compactWire = cardBalanceWire.replace(/\s+/g, ' ')
  if (!compactWire.includes('export const sourceCardOwnershipWire = (')) {
    errors.push('Worker CardOwnershipResponse wire helper is missing')
  }
  if (!compactWire.includes('sourceBalanceTupleWire(tuple)')) {
    errors.push('Worker CardOwnershipResponse bypasses the BalanceTuple wire')
  }
  for (const field of fields.slice(1)) {
    const token = `${field}: ownership.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker CardOwnershipResponse wire is missing: ${token}`)
    }
  }

  const ownershipRepository = section(
    playerRPC,
    'async cardOwnership(',
    'private async backfillQuestPeriods('
  ).replace(/\s+/g, ' ')
  for (const token of [
    "const cardBalances: SourceCardOwnershipInput['cardBalances'] = {}",
    "CARD_FRAMES.map(frame => [frame, { balance: '0', isNew: null }])",
    'isNew: row.is_new === 1',
    'return sourceCardOwnershipWire({'
  ]) {
    if (!ownershipRepository.includes(token)) {
      errors.push(`Worker card ownership projection changed: ${token}`)
    }
  }
  if (
    !playerRPC.includes('sourceCardOwnershipWire,') ||
    !playerRPC.includes('type SourceCardOwnershipInput')
  ) {
    errors.push('Worker card ownership repository lost its wire imports')
  }

  const ownershipRoute = section(
    api,
    "case 'GetCardOwnership':",
    "case 'GetPendingCards':"
  )
  if (!ownershipRoute.includes('playerRpc.cardOwnership(')) {
    errors.push('main Worker GetCardOwnership route bypasses its repository')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'rpc', 'cards.go'],
      ['cloudflare', 'src', 'card-balance-wire.ts'],
      ['cloudflare', 'src', 'player-rpc.ts'],
      ['cloudflare', 'src', 'api.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = cardOwnershipWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'GetCardOwnership preserves the generated response and nested BalanceTuple JSON wire'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
