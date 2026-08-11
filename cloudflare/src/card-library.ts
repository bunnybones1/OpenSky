import cardLibrary from './generated/card-library.json'
import type {
  Card,
  CardSearchCriteria,
  CardWithBalance,
  Page
} from '@opensky/proto'

type LibraryCard = (typeof cardLibrary.cards)[number]

export interface CardInventoryBalance {
  itemType: string
  tokenId: number
  balance: number
  isNew: boolean
  createdAt: string
}

export interface CardSearchResult {
  page: Page
  res: CardWithBalance[]
}

const cards = cardLibrary.cards as LibraryCard[]
const searchTokens = cardLibrary.searchTokens as LibraryCard[]
const searchableCards = [...cards, ...searchTokens]
const searchableCardsById = new Map(
  searchableCards.map(card => [card.id, card])
)
const cardsById = new Map(cards.map(card => [card.id, card]))
const cardFrames = new Set([
  'SW_BASE_CARDS',
  'SW_SILVER_CARDS',
  'SW_GOLD_CARDS'
])

const deckClasses: Record<string, string[]> = {
  STR: ['STR'],
  HRT: ['HRT'],
  AGY: ['AGY'],
  INT: ['INT'],
  WIS: ['WIS'],
  STH: ['STR', 'HRT'],
  STA: ['STR', 'AGY'],
  STI: ['STR', 'INT'],
  STW: ['STR', 'WIS'],
  HRA: ['HRT', 'AGY'],
  HRI: ['HRT', 'INT'],
  HRW: ['HRT', 'WIS'],
  AGI: ['AGY', 'INT'],
  AGW: ['AGY', 'WIS'],
  INW: ['INT', 'WIS']
}

const base58Alphabet =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const base58Values = new Map(
  Array.from(base58Alphabet, (character, index) => [character, index])
)

const decodeBase58 = (encoded: string): Uint8Array => {
  const littleEndianBytes = [0]
  for (const character of encoded) {
    const value = base58Values.get(character)
    if (value === undefined) throw new Error('invalid base58 character')
    let carry = value
    for (let index = 0; index < littleEndianBytes.length; index += 1) {
      carry += littleEndianBytes[index] * 58
      littleEndianBytes[index] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      littleEndianBytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (
    let index = 0;
    encoded[index] === '1' && index < encoded.length - 1;
    index += 1
  ) {
    littleEndianBytes.push(0)
  }
  return Uint8Array.from(littleEndianBytes.reverse())
}

const validateDeckClasses = (deckClass: string, selected: LibraryCard[]) => {
  const allowed = deckClasses[deckClass]
  if (!allowed) throw new Error(`deck class '${deckClass}' is unknown`)
  const required = new Set(selected.map(card => card.class))
  if (required.size === 0) return
  if (
    required.size > 2 ||
    required.size !== allowed.length ||
    !Array.from(required).every(cardClass => allowed.includes(cardClass))
  ) {
    throw new Error('decoded deck class does not match its cards')
  }
}

export const allLibraryCards = (): LibraryCard[] => cards

export const libraryCardsByIds = (ids: number[]): LibraryCard[] =>
  ids.flatMap(id => {
    const card = cardsById.get(id)
    return card ? [card] : []
  })

const searchTerms = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^\s\w]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

const cardSearchDocument = (card: LibraryCard): string[] => {
  const attached = card.attachedSpellID
    ? searchableCardsById.get(card.attachedSpellID)
    : undefined
  return searchTerms(
    [
      card.name,
      card.description,
      ...card.keywords,
      attached?.name,
      attached?.description,
      ...(attached?.keywords || [])
    ]
      .filter(Boolean)
      .join(' ')
  )
}

const cardMatchesText = (card: LibraryCard, value: string): boolean => {
  const requested = searchTerms(value)
  if (requested.length === 0) return true
  const document = cardSearchDocument(card)
  return requested.every(term => document.some(word => word.startsWith(term)))
}

const encodeSearchCursor = (offset: number): string =>
  btoa(JSON.stringify({ offset }))

const decodeSearchCursor = (cursor: string): number => {
  try {
    const parsed = JSON.parse(atob(cursor)) as { offset?: unknown }
    if (
      typeof parsed.offset !== 'number' ||
      !Number.isSafeInteger(parsed.offset) ||
      parsed.offset < 0
    ) {
      throw new Error('invalid offset')
    }
    return parsed.offset
  } catch {
    throw new Error('invalid card search cursor')
  }
}

const sortValue = (card: LibraryCard, column: string): string | number => {
  switch (column) {
    case 'name':
      return card.name.toLowerCase()
    case 'mana_cost':
    case 'manaCost':
    case 'mana_weight':
      return card.manaCost < 0 ? Number.MAX_SAFE_INTEGER : card.manaCost
    case 'power':
      return card.power
    case 'health':
      return card.health
    case 'class':
      return card.class
    case 'element':
      return card.element
    case 'type':
      return card.type
    case 'id':
    default:
      return card.id
  }
}

const compareSearchCards = (page: Page) => {
  const sorts = page.sort?.length
    ? page.sort
    : [{ column: 'mana_weight', order: 'ASC' as const }]
  return (left: LibraryCard, right: LibraryCard): number => {
    for (const sort of sorts) {
      const leftValue = sortValue(left, sort.column)
      const rightValue = sortValue(right, sort.column)
      const comparison =
        leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
      if (comparison) return sort.order === 'DESC' ? -comparison : comparison
    }
    return left.id - right.id
  }
}

export const searchLibraryCards = (
  criteria: CardSearchCriteria = {},
  requestedPage: Page = {},
  inventory: CardInventoryBalance[] = [],
  hasAccount = false,
  includeBalances = false
): CardSearchResult => {
  if (requestedPage.before && requestedPage.after) {
    throw new Error('before and after cannot be used together')
  }
  const pageSize = Math.min(
    200,
    Math.max(
      1,
      Number.isSafeInteger(requestedPage.pageSize) && requestedPage.pageSize
        ? requestedPage.pageSize
        : 20
    )
  )
  const itemType =
    criteria.itemType && cardFrames.has(criteria.itemType)
      ? criteria.itemType
      : undefined
  const ownedIds = new Set(
    inventory
      .filter(item =>
        itemType ? item.itemType === itemType : cardFrames.has(item.itemType)
      )
      .filter(item => item.balance > 0)
      .map(item => item.tokenId)
  )
  if (criteria.ownedCards !== undefined && !hasAccount) {
    throw new Error("can't filter by card ownership for anonymous user")
  }
  const ids = criteria.ids?.length ? new Set(criteria.ids) : undefined
  const classes = criteria.cardClass?.length
    ? new Set(criteria.cardClass)
    : undefined
  const elements = criteria.cardElement?.length
    ? new Set(criteria.cardElement)
    : undefined
  const manaCosts = criteria.cardManaCost?.length
    ? new Set(criteria.cardManaCost.map(Number).filter(Number.isFinite))
    : undefined

  const filtered = searchableCards
    .filter(card => criteria.includeTokens || card.class !== 'TOK')
    .filter(card => card.asset !== '')
    .filter(card => !ids || ids.has(card.id))
    .filter(card => !classes || classes.has(card.class as never))
    .filter(card => !criteria.cardType || card.type === criteria.cardType)
    .filter(card => {
      if (!elements) return true
      if (elements.has(card.element as never)) return true
      const attached = card.attachedSpellID
        ? searchableCardsById.get(card.attachedSpellID)
        : undefined
      return !!attached && elements.has(attached.element as never)
    })
    .filter(card => !manaCosts || manaCosts.has(card.manaCost))
    .filter(card =>
      criteria.searchText ? cardMatchesText(card, criteria.searchText) : true
    )
    .filter(card =>
      criteria.ownedCards === undefined
        ? true
        : ownedIds.has(card.id) === criteria.ownedCards
    )
    .sort(compareSearchCards(requestedPage))

  const requestedOffset = requestedPage.before
    ? decodeSearchCursor(requestedPage.before)
    : requestedPage.after
      ? Math.max(0, decodeSearchCursor(requestedPage.after) - pageSize)
      : 0
  const offset = Math.min(requestedOffset, filtered.length)
  const selected = filtered.slice(offset, offset + pageSize)
  const end = offset + selected.length
  const inventoryByCard = new Map<number, CardInventoryBalance[]>()
  for (const item of inventory) {
    if (!cardFrames.has(item.itemType) || item.balance <= 0) continue
    const existing = inventoryByCard.get(item.tokenId) || []
    existing.push(item)
    inventoryByCard.set(item.tokenId, existing)
  }
  const res = selected.map(card => {
    const balances = includeBalances ? inventoryByCard.get(card.id) || [] : []
    const balanceByType = Object.fromEntries(
      balances.map(item => [
        item.itemType,
        {
          balance: String(item.balance),
          ...(item.isNew ? { isNew: true } : {})
        }
      ])
    )
    const latestCreatedAt = balances
      .map(item => item.createdAt)
      .sort()
      .at(-1)
    return {
      card: card as unknown as Card,
      balance: String(balances.reduce((sum, item) => sum + item.balance, 0)),
      balanceByType,
      createdAt: latestCreatedAt || ''
    }
  })
  return {
    page: {
      pageSize,
      hasBefore: end < filtered.length,
      hasAfter: offset > 0,
      ...(end < filtered.length ? { before: encodeSearchCursor(end) } : {}),
      ...(offset > 0 ? { after: encodeSearchCursor(offset) } : {}),
      ...(requestedPage.sort ? { sort: requestedPage.sort } : {})
    },
    res
  }
}

export const libraryCardsFromDeckString = (
  deckString: string
): LibraryCard[] => {
  if (deckString.length < 8 || !deckString.startsWith('SWx')) {
    throw new Error('invalid OpenSky deck string')
  }
  const deckClass = deckString.slice(3, 6)
  const version = deckString.slice(6, 8)
  if (version !== '02')
    throw new Error(`deckstring version '${version}' not recognized`)
  const encoded = deckString.slice(8)
  const decoded = encoded ? decodeBase58(encoded) : new Uint8Array()
  const ids = Array.from(
    { length: Math.floor(decoded.length / 2) },
    (_, index) => decoded[index * 2] | (decoded[index * 2 + 1] << 8)
  )
  if (new Set(ids).size !== ids.length) {
    throw new Error('cannot have duplicate card ids')
  }
  const selected = libraryCardsByIds(ids)
  if (selected.length !== ids.length)
    throw new Error('invalid deck, missing cards')
  validateDeckClasses(deckClass, selected)
  return selected
}

export const cardLibrarySource = {
  migration: cardLibrary.source,
  sha256: cardLibrary.sourceSha256,
  count: cards.length
}
