import cardLibrary from './generated/card-library.json'
import type { Card, CardSearchCriteria, Page, SortBy } from '@opensky/proto'

import type { SourceCardWithBalanceInput } from './card-balance-wire'

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
  res: Array<Omit<SourceCardWithBalanceInput, 'card'> & { card: Card }>
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
const sourceCardBalanceItemTypes = new Set([
  'SW_BASE_CARDS',
  'SW_SKYPASS',
  'SW_TITLES',
  'SW_STICKER_POINTS',
  'SW_XP',
  'SW_SILVER_DUST',
  'SW_SILVER_CARDS',
  'SW_GOLD_CARDS',
  'SW_CONQUEST_TICKET',
  'SW_CRYSTALS',
  'SW_STICKERS',
  'SW_HERO_SKINS',
  'SW_CARD_BACKS',
  'SW_HERO'
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

type CardSortValue = string | number | null

interface CardSortConfig {
  sort: SortBy[]
  uniqueOrder: SortBy['order']
}

interface CardSearchCursor {
  id: number
  values: Array<string | null>
}

const CARD_SORT_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  mana_cost: 'mana_cost',
  manaCost: 'mana_cost',
  mana_weight: 'mana_weight',
  power: 'power',
  health: 'health',
  attached_spell_id: 'attached_spell_id',
  attachedSpellID: 'attached_spell_id',
  class: 'class',
  element: 'element',
  status: 'status',
  type: 'type'
}

const cardSortConfig = (page: Page): CardSortConfig => {
  const requested = page.sort?.length
    ? page.sort
    : [{ column: 'mana_weight', order: 'ASC' as SortBy['order'] }]
  const sort: SortBy[] = []
  let uniqueOrder = 'ASC' as SortBy['order']
  for (const item of requested) {
    const column = CARD_SORT_COLUMNS[item.column]
    if (!column)
      throw new Error(`unsupported card sort column '${item.column}'`)
    if (item.order !== 'ASC' && item.order !== 'DESC') {
      throw new Error('card sort order is invalid')
    }
    if (column === 'id') {
      uniqueOrder = item.order
    } else {
      sort.push({ column, order: item.order })
    }
  }
  if (sort.length === 1) uniqueOrder = sort[0].order
  return { sort, uniqueOrder }
}

const sortValue = (card: LibraryCard, column: string): CardSortValue => {
  switch (column) {
    case 'name':
      return card.name
    case 'mana_cost':
      return card.manaCost
    case 'mana_weight':
      return card.manaCost < 0 ? 999_999 : card.manaCost
    case 'power':
      return card.power
    case 'health':
      return card.health
    case 'attached_spell_id':
      return card.attachedSpellID ?? null
    case 'class':
      return card.class
    case 'element':
      return card.element
    case 'type':
      return card.type
    case 'id':
      return card.id
    default:
      throw new Error(`unsupported card sort column '${column}'`)
  }
}

const compareCardSortValues = (
  left: CardSortValue,
  right: CardSortValue,
  order: SortBy['order']
): number => {
  if (left === null || right === null) {
    if (left === right) return 0
    const nullsLast = order === 'ASC'
    return left === null ? (nullsLast ? 1 : -1) : nullsLast ? -1 : 1
  }
  const compared =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right))
  return order === 'ASC' ? compared : -compared
}

const compareSearchCards = (config: CardSortConfig) => {
  return (left: LibraryCard, right: LibraryCard): number => {
    for (const sort of config.sort) {
      const leftValue = sortValue(left, sort.column)
      const rightValue = sortValue(right, sort.column)
      const comparison = compareCardSortValues(
        leftValue,
        rightValue,
        sort.order
      )
      if (comparison) return comparison
    }
    return compareCardSortValues(left.id, right.id, config.uniqueOrder)
  }
}

const encodeSearchCursor = (
  card: LibraryCard,
  config: CardSortConfig
): string =>
  btoa(
    JSON.stringify([
      String(card.id),
      ...config.sort.map(item => {
        const value = sortValue(card, item.column)
        return value === null ? null : String(value)
      })
    ])
  )

const decodeSearchCursor = (
  cursor: string,
  config: CardSortConfig
): CardSearchCursor => {
  try {
    const values = JSON.parse(atob(cursor)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== config.sort.length + 1 ||
      values.some(item => item !== null && typeof item !== 'string') ||
      typeof values[0] !== 'string'
    ) {
      throw new Error('invalid cursor shape')
    }
    const id = Number(values[0])
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('invalid card ID')
    return { id, values: values.slice(1) as Array<string | null> }
  } catch {
    throw new Error('invalid card search cursor')
  }
}

const cursorSortValue = (
  value: string | null,
  column: string
): CardSortValue => {
  if (value === null) return null
  if (
    [
      'mana_cost',
      'mana_weight',
      'power',
      'health',
      'attached_spell_id'
    ].includes(column)
  ) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) throw new Error('invalid card search cursor')
    return parsed
  }
  return value
}

const compareSearchCursor = (
  card: LibraryCard,
  cursor: CardSearchCursor,
  config: CardSortConfig
): number => {
  for (const [index, sort] of config.sort.entries()) {
    const compared = compareCardSortValues(
      sortValue(card, sort.column),
      cursorSortValue(cursor.values[index], sort.column),
      sort.order
    )
    if (compared) return compared
  }
  return compareCardSortValues(card.id, cursor.id, config.uniqueOrder)
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

  const sortConfig = cardSortConfig(requestedPage)
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
    .sort(compareSearchCards(sortConfig))

  let start = 0
  let end = Math.min(filtered.length, pageSize)
  if (requestedPage.before) {
    const cursor = decodeSearchCursor(requestedPage.before, sortConfig)
    const next = filtered.findIndex(
      card => compareSearchCursor(card, cursor, sortConfig) > 0
    )
    start = next < 0 ? filtered.length : next
    end = Math.min(filtered.length, start + pageSize)
  } else if (requestedPage.after) {
    const cursor = decodeSearchCursor(requestedPage.after, sortConfig)
    const previousEnd = filtered.findIndex(
      card => compareSearchCursor(card, cursor, sortConfig) >= 0
    )
    end = previousEnd < 0 ? filtered.length : previousEnd
    start = Math.max(0, end - pageSize)
  }
  const selected = filtered.slice(start, end)
  const inventoryByCard = new Map<number, CardInventoryBalance[]>()
  for (const item of inventory) {
    if (!sourceCardBalanceItemTypes.has(item.itemType) || item.balance <= 0) {
      continue
    }
    const existing = inventoryByCard.get(item.tokenId) || []
    existing.push(item)
    inventoryByCard.set(item.tokenId, existing)
  }
  const res = selected.map(card => {
    const exposesBalances = includeBalances && hasAccount
    const balances = exposesBalances ? inventoryByCard.get(card.id) || [] : []
    const balanceByType = exposesBalances
      ? Object.fromEntries(
          balances.map(item => [
            item.itemType,
            {
              balance: String(item.balance),
              // Source SearchCards never populates BalanceTuple.IsNew.
              isNew: null
            }
          ])
        )
      : null
    const latestCreatedAt = balances
      .map(item => item.createdAt)
      .sort()
      .at(-1)
    return {
      card: card as unknown as Card,
      balance: String(balances.reduce((sum, item) => sum + item.balance, 0)),
      balanceByType,
      createdAt: latestCreatedAt || null
    }
  })
  return {
    page: {
      pageSize,
      hasBefore: end < filtered.length,
      hasAfter: start > 0,
      sort: sortConfig.sort,
      ...(selected.length
        ? {
            before: encodeSearchCursor(selected[0], sortConfig),
            after: encodeSearchCursor(selected[selected.length - 1], sortConfig)
          }
        : {})
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
