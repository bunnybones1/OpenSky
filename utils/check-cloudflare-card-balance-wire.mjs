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

export const cardBalanceWireErrors = (
  generatedSource,
  cardsRPCSource,
  cardBalanceWire,
  cardLibrary,
  api,
  playerRPC
) => {
  const errors = []
  const cardFields = ['card', 'balance', 'balanceByType', 'createdAt']
  const cardSourceFields = jsonFields(
    structBody(generatedSource, 'CardWithBalance')
  )
  const cardPublicFields = cardSourceFields.filter(field => field.json !== '-')
  if (
    JSON.stringify(cardPublicFields.map(field => field.json)) !==
    JSON.stringify(cardFields)
  ) {
    errors.push('source CardWithBalance JSON field contract changed')
  }
  if (cardPublicFields.some(field => field.omitEmpty)) {
    errors.push('source CardWithBalance unexpectedly omits a public JSON field')
  }
  const cardPointers = cardPublicFields
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)
  if (JSON.stringify(cardPointers) !== JSON.stringify(['card', 'createdAt'])) {
    errors.push('source CardWithBalance nullable pointer contract changed')
  }
  if (
    cardPublicFields.find(field => field.json === 'balanceByType')?.type !==
    'map[string]*BalanceTuple'
  ) {
    errors.push('source CardWithBalance nullable map contract changed')
  }
  const cardPrivateFields = cardSourceFields
    .filter(field => field.json === '-')
    .map(field => field.name)
  if (JSON.stringify(cardPrivateFields) !== JSON.stringify(['Cursor'])) {
    errors.push('source CardWithBalance private-field contract changed')
  }

  const tupleFields = jsonFields(structBody(generatedSource, 'BalanceTuple'))
  if (
    JSON.stringify(tupleFields.map(field => field.json)) !==
      JSON.stringify(['balance', 'isNew']) ||
    tupleFields.some(field => field.omitEmpty)
  ) {
    errors.push('source BalanceTuple JSON field contract changed')
  }
  if (
    tupleFields.find(field => field.json === 'balance')?.type !==
    'prototyp.BigInt'
  ) {
    errors.push('source BalanceTuple balance JSON-string contract changed')
  }
  if (tupleFields.find(field => field.json === 'isNew')?.type !== '*bool') {
    errors.push('source BalanceTuple nullable flag contract changed')
  }

  const sourceSearch = section(
    cardsRPCSource,
    'func (s *Server) SearchCards(',
    'func removeInvalidCards('
  )
  for (const token of [
    'if includeBalances && accountID.IsValid()',
    'db.Gte(proto.ItemType_SW_BASE_CARDS)',
    'c.BalanceByType = map[string]*proto.BalanceTuple{}',
    'cardMap[cardID].BalanceByType[b.ItemType.String()] = &proto.BalanceTuple{}'
  ]) {
    if (!sourceSearch.includes(token)) {
      errors.push(`source SearchCards balance contract changed: ${token}`)
    }
  }
  if (sourceSearch.includes('.IsNew')) {
    errors.push('source SearchCards unexpectedly populates BalanceTuple.IsNew')
  }

  const generatedItemTypes = [
    ...generatedSource.matchAll(/ItemType_(\w+)\s+ItemType\s*=\s*(\d+)/g)
  ].map(match => ({ name: match[1], value: Number(match[2]) }))
  const baseItemType = generatedItemTypes.find(
    itemType => itemType.name === 'SW_BASE_CARDS'
  )?.value
  const expectedBalanceTypes = generatedItemTypes
    .filter(
      itemType => baseItemType !== undefined && itemType.value >= baseItemType
    )
    .map(itemType => itemType.name)
  const workerBalanceTypeSource =
    cardLibrary.match(
      /const sourceCardBalanceItemTypes = new Set\(\[([\s\S]*?)\]\)/
    )?.[1] || ''
  const workerBalanceTypes = [
    ...workerBalanceTypeSource.matchAll(/'([^']+)'/g)
  ].map(match => match[1])
  if (
    JSON.stringify(workerBalanceTypes) !== JSON.stringify(expectedBalanceTypes)
  ) {
    errors.push('Worker SearchCards source balance item-type range changed')
  }

  const compactWire = cardBalanceWire.replace(/\s+/g, ' ')
  for (const token of [
    'balance: tuple.balance',
    'isNew: tuple.isNew ?? null',
    'card: entry.card == null ? null : sourceCardWire(entry.card)',
    'balance: entry.balance',
    'entry.balanceByType == null ? null',
    'sourceBalanceTupleWire(tuple)',
    'createdAt: entry.createdAt ?? null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker CardWithBalance wire is missing: ${token}`)
    }
  }
  if (compactWire.includes('cursor:')) {
    errors.push('Worker CardWithBalance wire leaks the private cursor')
  }

  const searchProjection = section(
    cardLibrary,
    'const res = selected.map(card => {',
    'return {\n    page:'
  ).replace(/\s+/g, ' ')
  for (const token of [
    'const exposesBalances = includeBalances && hasAccount',
    'const balanceByType = exposesBalances ?',
    'isNew: null',
    ': null',
    'createdAt: latestCreatedAt || null'
  ]) {
    if (!searchProjection.includes(token)) {
      errors.push(`Worker SearchCards balance projection changed: ${token}`)
    }
  }
  if (!cardLibrary.includes('sourceCardBalanceItemTypes.has(item.itemType)')) {
    errors.push('Worker SearchCards does not apply the source balance type range')
  }
  if (searchProjection.includes('item.isNew')) {
    errors.push('Worker SearchCards invents a non-source IsNew value')
  }

  const searchRoute = section(
    api,
    "case 'SearchCards':",
    "case 'RegisterAccount':"
  ).replace(/\s+/g, ' ')
  for (const token of [
    'searchLibraryCards(',
    'res: result.res.map(sourceCardWithBalanceWire)'
  ]) {
    if (!searchRoute.includes(token)) {
      errors.push(`main Worker SearchCards wire is missing: ${token}`)
    }
  }
  if (
    !api.includes(
      "import { sourceCardWithBalanceWire } from './card-balance-wire'"
    )
  ) {
    errors.push('main Worker does not import the CardWithBalance wire helper')
  }
  const inventoryQuery = section(
    playerRPC,
    'async cardSearchInventory(',
    'async itemSummary('
  )
  if (
    !inventoryQuery.includes('WHERE user_id = ? AND balance > 0') ||
    inventoryQuery.includes('item_type IN')
  ) {
    errors.push(
      'Worker card-search inventory no longer preserves the source range'
    )
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
      ['cloudflare', 'src', 'card-library.ts'],
      ['cloudflare', 'src', 'api.ts'],
      ['cloudflare', 'src', 'player-rpc.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = cardBalanceWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'SearchCards preserves the generated CardWithBalance and BalanceTuple JSON wire'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
