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

const exactPublicStructErrors = (
  generatedSource,
  name,
  fields,
  pointerFields,
  privateFields
) => {
  const errors = []
  const sourceFields = jsonFields(structBody(generatedSource, name))
  const publicFields = sourceFields.filter(field => field.json !== '-')
  if (
    JSON.stringify(publicFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push(`source ${name} JSON field contract changed`)
  }
  if (publicFields.some(field => field.omitEmpty)) {
    errors.push(`source ${name} unexpectedly omits a public JSON field`)
  }
  const pointers = publicFields
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)
  if (JSON.stringify(pointers) !== JSON.stringify(pointerFields)) {
    errors.push(`source ${name} nullable pointer contract changed`)
  }
  const privateNames = sourceFields
    .filter(field => field.json === '-')
    .map(field => field.name)
  if (JSON.stringify(privateNames) !== JSON.stringify(privateFields)) {
    errors.push(`source ${name} private-field contract changed`)
  }
  return { errors, publicFields }
}

export const itemWireErrors = (
  generatedSource,
  itemsRPCSource,
  itemWire,
  playerRPC,
  api
) => {
  const itemFields = [
    'id',
    'contractAddress',
    'itemType',
    'tokenID',
    'balance',
    'lastUpdateID',
    'updatedAt',
    'createdAt',
    'isNew'
  ]
  const itemPointers = ['contractAddress', 'updatedAt', 'createdAt', 'isNew']
  const summaryFields = [
    'id',
    'itemType',
    'totalBalance',
    'updatedAt',
    'createdAt'
  ]
  const summaryPointers = ['updatedAt', 'createdAt']
  const itemContract = exactPublicStructErrors(
    generatedSource,
    'Item',
    itemFields,
    itemPointers,
    ['AccountID', 'AccountAddress']
  )
  const summaryContract = exactPublicStructErrors(
    generatedSource,
    'ItemSummary',
    summaryFields,
    summaryPointers,
    ['AccountID']
  )
  const errors = [...itemContract.errors, ...summaryContract.errors]
  if (
    itemContract.publicFields.find(field => field.json === 'balance')?.type !==
    'prototyp.BigInt'
  ) {
    errors.push('source Item balance JSON-string contract changed')
  }
  if (
    summaryContract.publicFields.find(field => field.json === 'totalBalance')
      ?.type !== 'prototyp.BigInt'
  ) {
    errors.push('source ItemSummary balance JSON-string contract changed')
  }

  for (const method of [
    'GetItemSummary',
    'GetItemSupply',
    'GetBatchItemSupply',
    'GetItemOwnershipByType',
    'EquipItem',
    'ListEquippedItems'
  ]) {
    if (!itemsRPCSource.includes(`func (s *Server) ${method}`)) {
      errors.push(`source Item RPC boundary changed: ${method}`)
    }
  }

  const compactWire = itemWire.replace(/\s+/g, ' ')
  for (const field of itemFields) {
    const token = itemPointers.includes(field)
      ? `${field}: item.${field} ?? null`
      : `${field}: item.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker Item wire is missing: ${token}`)
    }
  }
  for (const field of summaryFields) {
    const token = summaryPointers.includes(field)
      ? `${field}: summary.${field} ?? null`
      : `${field}: summary.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker ItemSummary wire is missing: ${token}`)
    }
  }
  for (const privateField of ['accountID:', 'accountAddress:']) {
    if (compactWire.includes(privateField)) {
      errors.push(`Worker inventory wire leaks private field: ${privateField}`)
    }
  }

  const compactPlayer = playerRPC.replace(/\s+/g, ' ')
  if (
    !compactPlayer.includes(
      "import { sourceItemSummaryWire, sourceItemWire } from './item-wire'"
    )
  ) {
    errors.push('Worker inventory repository does not import its wire helpers')
  }
  const listItems = section(
    playerRPC,
    'async listItems(',
    'async cardSearchInventory('
  ).replace(/\s+/g, ' ')
  if (!listItems.includes('sourceItemWire({')) {
    errors.push('GetItemOwnershipByType bypasses the Item wire')
  }
  const itemSummary = section(
    playerRPC,
    'async itemSummary(',
    'async itemSupply('
  ).replace(/\s+/g, ' ')
  if ((itemSummary.match(/sourceItemSummaryWire\(\{/g) ?? []).length !== 2) {
    errors.push('GetItemSummary does not project inventory and USDC summaries')
  }
  const itemSupply = section(
    playerRPC,
    'async itemSupply(',
    'async batchItemSupply('
  ).replace(/\s+/g, ' ')
  if (!itemSupply.includes('sourceItemWire({')) {
    errors.push('GetItemSupply bypasses the Item wire')
  }
  const batchSupply = section(
    playerRPC,
    'async batchItemSupply(',
    'async itemSuppliesByType('
  ).replace(/\s+/g, ' ')
  if (!batchSupply.includes('await this.itemSupply(itemId)')) {
    errors.push('GetBatchItemSupply bypasses normalized Item supply')
  }
  const itemFromRow = section(
    playerRPC,
    'private itemFromRow(',
    'async equipItem('
  ).replace(/\s+/g, ' ')
  if (!itemFromRow.includes('return sourceItemWire({')) {
    errors.push('equipped inventory row bypasses the Item wire')
  }
  const equipItems = section(
    playerRPC,
    'async equipItem(',
    'async deckEquipment('
  ).replace(/\s+/g, ' ')
  for (const token of [
    'return this.itemFromRow(item)',
    'return result.results.map(row => this.itemFromRow(row))'
  ]) {
    if (!equipItems.includes(token)) {
      errors.push(`equipped Item projection changed: ${token}`)
    }
  }

  const itemRoutes = section(
    api,
    "case 'GetItemSummary':",
    "case 'GetDeckEquipmentByDeckString':"
  )
  for (const token of [
    'playerRpc.itemSummary(',
    'playerRpc.itemSupply(',
    'playerRpc.batchItemSupply(',
    'playerRpc.listItems(',
    'playerRpc.equipItem(',
    'playerRpc.listEquippedItems('
  ]) {
    if (!itemRoutes.includes(token)) {
      errors.push(`main Worker Item route bypasses its repository: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'rpc', 'items.go'],
      ['cloudflare', 'src', 'item-wire.ts'],
      ['cloudflare', 'src', 'player-rpc.ts'],
      ['cloudflare', 'src', 'api.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = itemWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Item RPCs preserve the generated Go wire and identity-owned null contract boundary'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
