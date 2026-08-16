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
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const pendingCardWireErrors = (
  generatedSource,
  cardsRPCSource,
  pendingCardWire,
  conquestDelivery,
  api,
  playerRPC
) => {
  const errors = []
  const sourceFields = jsonFields(
    structBody(generatedSource, 'PendingCardsResponse')
  )
  const fields = ['cards', 'tokenIDs', 'mintAt']
  if (
    JSON.stringify(sourceFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push('source PendingCardsResponse JSON field contract changed')
  }
  if (sourceFields.some(field => field.omitEmpty)) {
    errors.push('source PendingCardsResponse unexpectedly omits a JSON field')
  }
  if (
    JSON.stringify(sourceFields.map(field => field.type)) !==
    JSON.stringify(['[]*Card', '[]uint64', 'time.Time'])
  ) {
    errors.push('source PendingCardsResponse field-type contract changed')
  }

  const sourcePending = section(
    cardsRPCSource,
    'func (s *Server) GetPendingCards(',
    'func (s *Server) ListDecks('
  )
  for (const token of [
    'var response []*proto.PendingCardsResponse',
    'resp := &proto.PendingCardsResponse{',
    'MintAt: *task.RunAt,',
    'resp.TokenIDs = append(resp.TokenIDs, tokenID)',
    'tokenType != proto.ItemType_SW_SILVER_CARDS && tokenType != proto.ItemType_SW_GOLD_CARDS',
    'if !data.CardIndex.IDs.Has(cardID)',
    'resp.Cards = append(resp.Cards, card.Card)',
    'response = append(response, resp)'
  ]) {
    if (!sourcePending.includes(token)) {
      errors.push(`source GetPendingCards contract changed: ${token}`)
    }
  }
  if (sourcePending.includes('response := make(')) {
    errors.push('source GetPendingCards no longer returns a nil empty slice')
  }

  const generatedHandler = section(
    generatedSource,
    'func (s *skyWeaverAPIServer) serveGetPendingCardsJSON(',
    'func (s *skyWeaverAPIServer) serveListDecks('
  )
  for (const token of [
    'var ret0 []*PendingCardsResponse',
    'Ret0 []*PendingCardsResponse `json:"res"`'
  ]) {
    if (!generatedHandler.includes(token)) {
      errors.push(`source GetPendingCards response wrapper changed: ${token}`)
    }
  }

  const compactWire = pendingCardWire.replace(/\s+/g, ' ')
  for (const token of [
    'cards: pending.cards?.length ? pending.cards.map(card => sourceCardWire(card)) : null',
    'tokenIDs: pending.tokenIDs?.length ? pending.tokenIDs : null',
    'mintAt: pending.mintAt',
    'pending?.length ? pending.map(sourcePendingCardsResponseWire) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker PendingCardsResponse wire is missing: ${token}`)
    }
  }

  const repository = section(
    conquestDelivery,
    'export const pendingConquestCards = async (',
    'export interface ConquestDeliveryRun'
  ).replace(/\s+/g, ' ')
  for (const token of [
    'Promise<SourcePendingCardsResponseInput[]>',
    'const tokenIDs = sourceTokenIds(row.token_ids_json)',
    'const cards = tokenIDs.flatMap(tokenID =>',
    'const pending = pendingConquestCard(tokenID)',
    'return pending ? [pending.card] : []',
    'cards,',
    'tokenIDs,',
    'mintAt: row.deliver_at'
  ]) {
    if (!repository.includes(token)) {
      errors.push(`Worker pending-card repository changed: ${token}`)
    }
  }
  for (const invented of [
    'itemType: ItemType.SW_GOLD_CARDS',
    'isNew: true',
    'card_ids_json',
    'cardIds.length !== tokenIDs.length'
  ]) {
    if (repository.includes(invented)) {
      errors.push(`Worker pending-card repository invents: ${invented}`)
    }
  }

  const compactDelivery = conquestDelivery.replace(/\s+/g, ' ')
  for (const token of [
    'export const pendingConquestCard = (tokenID: number)',
    'const itemTypeCode = Math.floor(tokenID / TOKEN_TYPE_OFFSET) & 0xff',
    'itemTypeCode === 1 ? ItemType.SW_SILVER_CARDS',
    'itemTypeCode === 2 ? ItemType.SW_GOLD_CARDS',
    'const card = cardsById.get(tokenID & CARD_ID_MASK)',
    'return card ? { card, itemType } : undefined'
  ]) {
    if (!compactDelivery.includes(token)) {
      errors.push(`Worker pending-card token projection is missing: ${token}`)
    }
  }

  const route = section(
    api,
    "case 'GetPendingCards':",
    "case 'GetBanners':"
  ).replace(/\s+/g, ' ')
  for (const token of [
    'const principal = await identityPrincipal(request, env)',
    'res: sourcePendingCardsListWire( await pendingConquestCards(env.AUTH_DB, principal.userId) )'
  ]) {
    if (!route.includes(token)) {
      errors.push(`main Worker GetPendingCards route changed: ${token}`)
    }
  }
  if (!api.includes("import { sourcePendingCardsListWire } from './pending-card-wire'")) {
    errors.push('main Worker GetPendingCards route lost its wire import')
  }

  const ownership = section(
    playerRPC,
    'async cardOwnership(',
    'private async backfillQuestPeriods('
  ).replace(/\s+/g, ' ')
  for (const token of [
    'pendingConquestCards(this.database, userId)',
    'for (const tokenID of pending.tokenIDs ?? [])',
    'const pendingCard = pendingConquestCard(tokenID)',
    'if (!pendingCard) continue',
    'pendingByFrame[pendingCard.itemType]++',
    'pendingByClassAndFrame[activeClass][pendingCard.itemType]++'
  ]) {
    if (!ownership.includes(token)) {
      errors.push(`Worker pending ownership projection changed: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'rpc', 'cards.go'],
      ['cloudflare', 'src', 'pending-card-wire.ts'],
      ['cloudflare', 'src', 'conquest-delivery.ts'],
      ['cloudflare', 'src', 'api.ts'],
      ['cloudflare', 'src', 'player-rpc.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = pendingCardWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'GetPendingCards preserves nil slices and the nested generated Card JSON wire'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
