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

export const feedEventWireErrors = (
  generatedSource,
  feedsRPCSource,
  feedEventWire,
  playerRPC,
  api,
  webFeed
) => {
  const errors = []
  const fields = [
    'id',
    'type',
    'createdAt',
    'match',
    'level',
    'playerRank',
    'playerRankStage',
    'season',
    'tokenIds',
    'cards',
    'heroes',
    'gameMode',
    'leaderboardRank',
    'conquestV2Reward',
    'conquestV2TreasureLevel',
    'stickerPoints'
  ]
  const pointerFields = [
    'createdAt',
    'match',
    'level',
    'playerRank',
    'playerRankStage',
    'season',
    'gameMode',
    'leaderboardRank',
    'conquestV2Reward',
    'conquestV2TreasureLevel',
    'stickerPoints'
  ]
  const sliceFields = ['tokenIds', 'cards', 'heroes']
  const sourceFields = jsonFields(structBody(generatedSource, 'FeedEvent'))
  const publicFields = sourceFields.filter(field => field.json !== '-')

  if (
    JSON.stringify(publicFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push('source FeedEvent JSON field contract changed')
  }
  if (publicFields.some(field => field.omitEmpty)) {
    errors.push('source FeedEvent unexpectedly omits a public JSON field')
  }
  const pointers = publicFields
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)
  if (JSON.stringify(pointers) !== JSON.stringify(pointerFields)) {
    errors.push('source FeedEvent nullable pointer contract changed')
  }
  const slices = publicFields
    .filter(
      field => field.type.startsWith('[]') || field.type === 'U64JSONBArray'
    )
    .map(field => field.json)
  if (JSON.stringify(slices) !== JSON.stringify(sliceFields)) {
    errors.push('source FeedEvent nullable slice contract changed')
  }
  const privateFields = sourceFields
    .filter(field => field.json === '-')
    .map(field => field.name)
  if (
    JSON.stringify(privateFields) !==
    JSON.stringify(['AccountID', 'MatchID', 'Cursor'])
  ) {
    errors.push('source FeedEvent private-field contract changed')
  }

  const compactSource = feedsRPCSource.replace(/\s+/g, ' ')
  for (const token of [
    'func (s *Server) GetFeed',
    'db.NotIn(proto.FeedEventType_MATCH, proto.FeedEventType_LEVELUP)',
    'case proto.FeedEventType_REWARD, proto.FeedEventType_TRADE:'
  ]) {
    if (!compactSource.includes(token)) {
      errors.push(`source FeedEvent behavior changed: ${token}`)
    }
  }

  const compactWire = feedEventWire.replace(/\s+/g, ' ')
  for (const field of fields.filter(field => field !== 'cards')) {
    const nullable =
      pointerFields.includes(field) || sliceFields.includes(field)
    const token = nullable
      ? `${field}: event.${field} ?? null`
      : `${field}: event.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker FeedEvent wire is missing: ${token}`)
    }
  }
  if (
    !compactWire.includes('cards: event.cards?.map(sourceCardWire) ?? null')
  ) {
    errors.push('Worker FeedEvent cards bypass their public Card wire')
  }
  for (const privateField of ['accountID:', 'matchID:', 'cursor:']) {
    if (compactWire.includes(privateField)) {
      errors.push(`Worker FeedEvent wire leaks private field: ${privateField}`)
    }
  }

  const compactPlayer = playerRPC.replace(/\s+/g, ' ')
  for (const token of [
    "event.type !== 'REWARD' && event.type !== 'TRADE'",
    "0: 'SW_BASE_CARDS'",
    "1: 'SW_SILVER_CARDS'",
    "2: 'SW_GOLD_CARDS'",
    "0xff: 'SW_BASE_CARDS'",
    'const card = LIBRARY_CARD_BY_ID.get(tokenId & 0x00ffff)',
    'return card ? [{ ...card, itemType }] : []',
    'return cards.length > 0 ? cards : null'
  ]) {
    if (!compactPlayer.includes(token)) {
      errors.push(`Worker FeedEvent reward hydration is missing: ${token}`)
    }
  }

  const feedMethod = section(
    playerRPC,
    'async feed(',
    'private async getIdentityAccount'
  ).replace(/\s+/g, ' ')
  for (const token of [
    'const res = selected.map(event => sourceFeedEventWire({',
    'cards: feedRewardCards(event)'
  ]) {
    if (!feedMethod.includes(token)) {
      errors.push(`Worker FeedEvent projection is missing: ${token}`)
    }
  }
  for (const sparse of ['cards: []', 'heroes: []']) {
    if (feedMethod.includes(sparse)) {
      errors.push(
        `Worker FeedEvent builders force a non-source slice: ${sparse}`
      )
    }
  }

  const apiRoute = section(api, "case 'GetFeed':", "case 'GetItemSummary':")
  if (!apiRoute.includes('await playerRpc.feed(')) {
    errors.push('main Worker GetFeed route bypasses the source projection')
  }
  if (
    !webFeed.includes(
      'event.type === FeedEventType.REWARD && event.cards && _tokenIds'
    )
  ) {
    errors.push('web feed Card visibility contract changed')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'rpc', 'feeds.go'],
      ['cloudflare', 'src', 'feed-event-wire.ts'],
      ['cloudflare', 'src', 'player-rpc.ts'],
      ['cloudflare', 'src', 'api.ts'],
      ['webapp', 'src', 'shared', 'queries', 'useFeed.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = feedEventWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'FeedEvent RPC preserves the generated Go wire and source reward hydration'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
