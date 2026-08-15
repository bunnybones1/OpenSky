import type {
  Account,
  CardOwnershipResponse,
  Deck,
  DeckEquipment,
  EpicType,
  FeedEvent,
  Item,
  ItemSupply,
  ItemSummary,
  ItemType,
  Page,
  Quest,
  Reward,
  SkypassLevel,
  SkypassReward,
  SortBy
} from '@opensky/proto'
import { DeckClass } from '@opensky/proto'
import { INITIAL_RANK_STATE_JSON } from '@opensky/shared/ranked-progression'

import { sourceAccountWire, sourceCrystalIDSQL } from './account-wire'
import { allLibraryCards } from './card-library'
import type { SourceCardInput } from './card-wire'
import { pendingConquestCards } from './conquest-delivery'
import {
  decodeDeckString,
  encodeDeckString,
  forceValidDeckClass,
  validateDeckClass
} from './deck-codec'
import { sourceDeckWire } from './deck-wire'
import { sourceFeedEventWire } from './feed-event-wire'
import { sourceItemSummaryWire, sourceItemWire } from './item-wire'
import { CompetitiveRepository } from './competitive'
import { completeDeckRankInsert } from './deck-ranks'
import {
  alreadyExists,
  failedPrecondition,
  invalidArgument,
  notFound,
  permissionDenied
} from './errors'
import { seasonFromDate } from './legacy-seasons'
import {
  nextSourceEpicSpec,
  questPeriodAt,
  randomSourceQuestSpec,
  SOURCE_QUEST_SPECS,
  sourceQuestCandidates,
  sourceQuestSpec,
  type SourceQuestSpec
} from './quest-library'
import { identityReferenceFor } from './rpc-principal'
import { refreshPrivateSpectateCode } from './spectate-code'
import { STARTER_DECK_BY_HERO_ID } from './starter-decks'

const CARD_FRAMES = [
  'SW_BASE_CARDS',
  'SW_SILVER_CARDS',
  'SW_GOLD_CARDS'
] as const
const CARD_CLASSES = ['STR', 'AGY', 'HRT', 'INT', 'WIS'] as const
const CARD_CLASS_TOTALS: Record<(typeof CARD_CLASSES)[number], number> = {
  STR: 181,
  AGY: 172,
  HRT: 168,
  INT: 165,
  WIS: 170
}
const TOTAL_ACTIVE_CARDS = Object.values(CARD_CLASS_TOTALS).reduce(
  (sum, count) => sum + count,
  0
)
const CARD_CLASS_BY_ID = new Map(
  allLibraryCards().map(card => [card.id, card.class])
)
const LIBRARY_CARD_BY_ID = new Map(
  allLibraryCards().map(card => [card.id, card])
)

const ITEM_TYPE_BY_ID: Record<number, ItemType> = {
  100: 'USDC' as ItemType,
  300: 'SW_BASE_CARDS' as ItemType,
  301: 'SW_SKYPASS' as ItemType,
  302: 'SW_TITLES' as ItemType,
  303: 'SW_STICKER_POINTS' as ItemType,
  304: 'SW_XP' as ItemType,
  400: 'SW_SILVER_DUST' as ItemType,
  401: 'SW_SILVER_CARDS' as ItemType,
  402: 'SW_GOLD_CARDS' as ItemType,
  403: 'SW_CONQUEST_TICKET' as ItemType,
  404: 'SW_CRYSTALS' as ItemType,
  405: 'SW_STICKERS' as ItemType,
  406: 'SW_HERO_SKINS' as ItemType,
  407: 'SW_CARD_BACKS' as ItemType,
  500: 'SW_HERO' as ItemType
}

const ITEM_TYPE_BY_TOKEN_CODE: Record<number, ItemType> = {
  0: 'SW_BASE_CARDS' as ItemType,
  1: 'SW_SILVER_CARDS' as ItemType,
  2: 'SW_GOLD_CARDS' as ItemType,
  3: 'SW_HERO_SKINS' as ItemType,
  4: 'SW_CRYSTALS' as ItemType,
  5: 'SW_STICKERS' as ItemType,
  6: 'SW_CARD_BACKS' as ItemType,
  7: 'SW_SKYPASS' as ItemType,
  8: 'SW_TITLES' as ItemType,
  9: 'SW_STICKER_POINTS' as ItemType,
  10: 'SW_XP' as ItemType,
  254: 'SW_CONQUEST_TICKET' as ItemType
}

const FEED_CARD_FRAME_BY_TOKEN_CODE: Record<number, ItemType> = {
  0: 'SW_BASE_CARDS' as ItemType,
  1: 'SW_SILVER_CARDS' as ItemType,
  2: 'SW_GOLD_CARDS' as ItemType,
  // Cloud Weasel's established browser encoding reserves 0xff for an
  // identity-owned base card. Treat it as the source base-card frame when
  // hydrating the feed without changing the persisted token receipt.
  0xff: 'SW_BASE_CARDS' as ItemType
}

const ITEM_TYPE_ID = Object.fromEntries(
  Object.entries(ITEM_TYPE_BY_ID).map(([id, itemType]) => [
    itemType,
    Number(id)
  ])
) as Record<string, number>
const KNOWN_ITEM_TYPES = new Set(Object.values(ITEM_TYPE_BY_ID))

const SUMMARY_ITEM_TYPES = new Set<ItemType>([
  'SW_SILVER_DUST' as ItemType,
  'SW_SILVER_CARDS' as ItemType,
  'SW_GOLD_CARDS' as ItemType,
  'SW_CONQUEST_TICKET' as ItemType,
  'SW_CRYSTALS' as ItemType,
  'SW_STICKERS' as ItemType,
  'SW_HERO_SKINS' as ItemType,
  'SW_CARD_BACKS' as ItemType
])

const SUPPLY_ITEM_TYPES = new Set<ItemType>([
  'SW_SILVER_CARDS' as ItemType,
  'SW_GOLD_CARDS' as ItemType,
  'SW_CRYSTALS' as ItemType,
  'SW_STICKERS' as ItemType,
  'SW_HERO_SKINS' as ItemType,
  'SW_CARD_BACKS' as ItemType
])

const HERO_DECK_CLASS: Record<number, DeckClass> = {
  1: DeckClass.STR,
  2: DeckClass.AGY,
  3: DeckClass.STA,
  4: DeckClass.WIS,
  5: DeckClass.STW,
  6: DeckClass.AGW,
  7: DeckClass.HRT,
  8: DeckClass.STH,
  9: DeckClass.HRA,
  10: DeckClass.HRW,
  11: DeckClass.INT,
  12: DeckClass.STI,
  13: DeckClass.AGI,
  14: DeckClass.INW,
  15: DeckClass.HRI
}

const HERO_BY_ID: Record<number, string> = {
  1: 'ADA',
  2: 'SAMYA',
  3: 'FOX',
  4: 'LOTUS',
  5: 'TITUS',
  6: 'IRIS',
  7: 'BOURAN',
  8: 'HORIK',
  9: 'ZOEY',
  10: 'AXEL',
  11: 'ARI',
  12: 'MIRA',
  13: 'MAI',
  14: 'BANJO',
  15: 'SITTI'
}

const HERO_ID_BY_DECK_CLASS = new Map(
  Object.entries(HERO_DECK_CLASS).map(([heroId, deckClass]) => [
    deckClass,
    Number(heroId)
  ])
)

const EQUIPPABLE_ITEM_TYPES = new Set<ItemType>([
  'SW_STICKERS' as ItemType,
  'SW_CARD_BACKS' as ItemType
])

interface AccountRow {
  game_account_id: number | null
  display_name: string
  account_name: string | null
  locale: string | null
  region: string | null
  tag_art_id: string | null
  title_id: number | null
  crystal_id: number | null
  hide_player_names: number | null
  request_more_invites: number | null
  twitch_profile: string | null
  rename_locked_until: string | null
  warm_ups: number
  spectate_code: string | null
  spectate_code_expires_at: string | null
  user_created_at: string
  profile_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  initial_account_level: number | null
  achieved_account_level: number | null
  inviter_user_id: string | null
}

interface OwnedCardRow {
  card_id: number
  item_type: ItemType
  balance: number
  is_new: number
}

interface InventoryRow {
  id: number
  item_type: ItemType
  token_id: number
  balance: number
  created_at: string
  updated_at: string
  is_new: number
}

interface InventorySummaryRow {
  id: number
  item_type: ItemType
  total_balance: number
  created_at: string
  updated_at: string
}

interface DeckRow {
  id: string
  name: string
  deck_class: Deck['class']
  deck_string: string
  card_ids: string
  art: string
  created_at: string
  updated_at: string
  favorited_at: string | null
  deck_type: Deck['deckType']
  is_new: number
  conquest_v2_points: number
}

interface QuestRow {
  row_id: number
  quest_key: string
  quest_type: Quest['questType']
  epic_type: Quest['epicType'] | null
  epic_index: number | null
  epic_length: number | null
  position: number
  progress: number
  target: number
  reward_xp: number
  periodicity: Quest['periodicity']
  is_rerollable: number
  is_new: number
  status: 'active' | 'complete' | 'claimed'
  active: number
  period: number
  rerolls: number
}

type QuestClaimRow = QuestRow

interface QuestClaimReceiptRow {
  reward_xp: number
  before_level: number
  before_xp: number
  after_level: number
  after_xp: number
  season: number
  season_initial_account_level: number
  season_achieved_account_level_before: number
}

interface QuestClaimBatchRow {
  ranked_constructed_before: string
}

interface QuestEligibility {
  level: number
  ownedHeroes: Set<string>
  ownedCards: Set<number>
}

interface SkypassSeasonStatRow {
  has_premium: number
  initial_account_level: number
  achieved_account_level: number
}

const effectiveSkypassSeasonLevel = (
  initialAccountLevel: number,
  achievedAccountLevel: number
): number => {
  const level = achievedAccountLevel - initialAccountLevel
  if (!Number.isSafeInteger(level) || level < 0) {
    throw new Error('invalid SkyPass season progress')
  }
  return level
}

interface SkypassRewardRow {
  id: number
  level: number
  season: number
  tier: number
  item_type: number
  amount: number
  is_starter: number
  attributes: string | null
  is_infinite: number
  claimed: number
  gained_rewards: string | null
}

interface RawSkypassRewardRow {
  id: number
  level: number
  season: number
  tier: number
  item_type: number
  amount: number
  is_starter: number
  attributes: string | null
  policy_version: number
  reward_policy_hash: string
}

interface SkypassInventoryGrant {
  itemType: ItemType
  tokenId: number
  quantity: number
  stackable: 0 | 1
  unlockSource?: string
  isNew?: 0 | 1
}

interface SkypassDefinitionRow extends RawSkypassRewardRow {
  is_infinite: number
}

interface RankFeedRow {
  row_id: number
  game_mode: string
  season: number
  player_rank: string
  player_rank_stage: string
  awarded_at: string
}

interface SkypassFeedRow {
  row_id: number
  rewards: string
  claimed_at: string
  item_type: number
  amount: number
  attributes: string | null
}

interface ConquestFeedRow {
  row_id: number
  event_type: FeedEvent['type']
  token_ids_json: string
  created_at: string
}

interface LeaderboardFeedRow {
  id: number
  game_mode: FeedEvent['gameMode']
  leaderboard_rank: number
  token_ids_json: string
  created_at: string
}

interface ConquestV2RewardFeedRow {
  id: number
  treasure_level: number
  token_ids_json: string
  created_at: string
}

const FEED_PAGE_SIZE = 50
const MAX_FEED_PAGE_SIZE = 100

const feedPageSize = (page?: Page) =>
  Math.min(
    MAX_FEED_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : FEED_PAGE_SIZE
  )

interface FeedEventCursor {
  id: number
  createdAt: string
}

const encodeFeedEventCursor = (event: FeedEvent): string =>
  btoa(JSON.stringify([String(event.id), event.createdAt]))

const decodeFeedEventCursor = (value: string): FeedEventCursor => {
  try {
    const values = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== 2 ||
      typeof values[0] !== 'string' ||
      typeof values[1] !== 'string'
    ) {
      throw new Error('cursor shape')
    }
    const id = Number(values[0])
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('cursor id')
    if (!values[1] || !Number.isFinite(Date.parse(values[1]))) {
      throw new Error('cursor createdAt')
    }
    return { id, createdAt: values[1] }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const compareFeedEventCursor = (
  event: FeedEvent,
  cursor: FeedEventCursor
): number =>
  Date.parse(cursor.createdAt) - Date.parse(event.createdAt) ||
  cursor.id - event.id

const feedRewardCards = (event: FeedEvent): SourceCardInput[] | null => {
  if (
    (event.type !== 'REWARD' && event.type !== 'TRADE') ||
    !Array.isArray(event.tokenIds)
  ) {
    return null
  }
  const cards = event.tokenIds.flatMap(tokenId => {
    if (!Number.isSafeInteger(tokenId) || tokenId < 0) return []
    const itemType = FEED_CARD_FRAME_BY_TOKEN_CODE[(tokenId >> 16) & 0xff]
    if (!itemType) return []
    const card = LIBRARY_CARD_BY_ID.get(tokenId & 0x00ffff)
    return card ? [{ ...card, itemType }] : []
  })
  return cards.length > 0 ? cards : null
}

type DeckCursorMode = 'list' | 'search'
type DeckSortValue = string | number | boolean | null
type DeckSortOrder = 'ASC' | 'DESC'

interface DeckSortSpec {
  column: string
  order: DeckSortOrder
}

interface DeckSortConfig {
  specs: DeckSortSpec[]
  uniqueOrder: DeckSortOrder
  nullsLast: boolean
}

interface DeckPageCursor {
  uuid: string
  values: Array<string | null>
}

const DECK_SORT_ALIASES: Record<string, string> = {
  uuid: 'uuid',
  name: 'name',
  class: 'class',
  deck_string: 'deck_string',
  deckString: 'deck_string',
  art: 'art',
  created_at: 'created_at',
  createdAt: 'created_at',
  updated_at: 'updated_at',
  updatedAt: 'updated_at',
  favorited_at: 'favorited_at',
  favoritedAt: 'favorited_at',
  deck_type: 'deck_type',
  deckType: 'deck_type',
  is_new: 'is_new',
  isNew: 'is_new',
  conquest_v2_points: 'conquest_v2_points',
  conquestV2Points: 'conquest_v2_points'
}

const defaultDeckSort = (mode: DeckCursorMode): DeckSortSpec[] =>
  mode === 'list'
    ? [
        { column: 'favorited_at', order: 'DESC' },
        { column: 'name', order: 'ASC' }
      ]
    : [
        { column: 'name', order: 'ASC' },
        { column: 'created_at', order: 'DESC' }
      ]

const deckSortConfig = (
  mode: DeckCursorMode,
  requested?: SortBy[]
): DeckSortConfig => {
  const source = requested?.length ? requested : defaultDeckSort(mode)
  const specs: DeckSortSpec[] = []
  let uniqueOrder: DeckSortOrder = 'DESC'
  for (const item of source) {
    const column = DECK_SORT_ALIASES[item.column]
    if (!column) {
      throw invalidArgument(`unsupported deck sort column '${item.column}'`)
    }
    if (item.order !== 'ASC' && item.order !== 'DESC') {
      throw invalidArgument('deck sort order is invalid')
    }
    if (column === 'uuid') {
      uniqueOrder = item.order
    } else {
      specs.push({ column, order: item.order })
    }
  }
  // Preserve the source paginator's ambiguity rule: one non-unique sort key
  // gives the UUID tie-break the same direction.
  if (specs.length === 1) uniqueOrder = specs[0].order
  return { specs, uniqueOrder, nullsLast: mode === 'list' }
}

const deckSortValue = (deck: Deck, column: string): DeckSortValue => {
  switch (column) {
    case 'uuid':
      return deck.uuid
    case 'name':
      return deck.name
    case 'class':
      return deck.class
    case 'deck_string':
      return deck.deckString
    case 'art':
      return deck.art
    case 'created_at':
      return deck.createdAt
    case 'updated_at':
      return deck.updatedAt
    case 'favorited_at':
      return deck.favoritedAt || null
    case 'deck_type':
      return deck.deckType
    case 'is_new':
      return deck.isNew
    case 'conquest_v2_points':
      return deck.conquestV2Points
    default:
      throw invalidArgument(`unsupported deck sort column '${column}'`)
  }
}

const serializedDeckSortValue = (deck: Deck, column: string): string | null => {
  const value = deckSortValue(deck, column)
  return value === null ? null : String(value)
}

const compareDeckSortValues = (
  left: DeckSortValue,
  right: DeckSortValue,
  order: DeckSortOrder,
  nullsLast: boolean
): number => {
  if (left === null || right === null) {
    if (left === right) return 0
    const effectiveNullsLast = nullsLast || order === 'ASC'
    return left === null
      ? effectiveNullsLast
        ? 1
        : -1
      : effectiveNullsLast
        ? -1
        : 1
  }
  const compared =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right))
  return order === 'ASC' ? compared : -compared
}

const compareDecks = (
  left: Deck,
  right: Deck,
  config: DeckSortConfig
): number => {
  for (const spec of config.specs) {
    const compared = compareDeckSortValues(
      deckSortValue(left, spec.column),
      deckSortValue(right, spec.column),
      spec.order,
      config.nullsLast
    )
    if (compared !== 0) return compared
  }
  return compareDeckSortValues(left.uuid, right.uuid, config.uniqueOrder, false)
}

const encodeDeckCursor = (deck: Deck, config: DeckSortConfig): string =>
  btoa(
    JSON.stringify([
      deck.uuid,
      ...config.specs.map(spec => serializedDeckSortValue(deck, spec.column))
    ])
  )

const decodeDeckCursor = (
  value: string,
  config: DeckSortConfig
): DeckPageCursor => {
  try {
    const values = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== config.specs.length + 1 ||
      typeof values[0] !== 'string' ||
      !values[0]
    ) {
      throw new Error('cursor shape')
    }
    const sortValues = values.slice(1)
    if (sortValues.some(item => item !== null && typeof item !== 'string')) {
      throw new Error('cursor values')
    }
    return {
      uuid: values[0],
      values: sortValues as Array<string | null>
    }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const cursorDeckSortValue = (
  value: string | null,
  column: string
): DeckSortValue => {
  if (value === null) return null
  if (['art', 'conquest_v2_points'].includes(column)) {
    const number = Number(value)
    if (!Number.isFinite(number))
      throw invalidArgument('page cursor is invalid')
    return number
  }
  if (column === 'is_new') {
    if (value !== 'true' && value !== 'false') {
      throw invalidArgument('page cursor is invalid')
    }
    return value === 'true'
  }
  return value
}

const compareDeckCursor = (
  deck: Deck,
  cursor: DeckPageCursor,
  config: DeckSortConfig
): number => {
  for (const [index, spec] of config.specs.entries()) {
    const compared = compareDeckSortValues(
      deckSortValue(deck, spec.column),
      cursorDeckSortValue(cursor.values[index], spec.column),
      spec.order,
      config.nullsLast
    )
    if (compared !== 0) return compared
  }
  return compareDeckSortValues(
    deck.uuid,
    cursor.uuid,
    config.uniqueOrder,
    false
  )
}

const pagedDecks = (
  decks: Deck[],
  page: Page | undefined,
  mode: DeckCursorMode,
  defaultPageSize: number
): { page: Page; res: Deck[] } => {
  if (page?.before && page.after) {
    throw invalidArgument('before and after cannot be used together')
  }
  const config = deckSortConfig(mode, page?.sort)
  const ordered = [...decks].sort((left, right) =>
    compareDecks(left, right, config)
  )
  const pageSize = Math.min(
    200,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : defaultPageSize
  )
  let start = 0
  let end = Math.min(ordered.length, pageSize)
  if (page?.before) {
    const cursor = decodeDeckCursor(page.before, config)
    const next = ordered.findIndex(
      deck => compareDeckCursor(deck, cursor, config) > 0
    )
    start = next < 0 ? ordered.length : next
    end = Math.min(ordered.length, start + pageSize)
  } else if (page?.after) {
    const cursor = decodeDeckCursor(page.after, config)
    const previousEnd = ordered.findIndex(
      deck => compareDeckCursor(deck, cursor, config) >= 0
    )
    end = previousEnd < 0 ? ordered.length : previousEnd
    start = Math.max(0, end - pageSize)
  }
  const res = ordered.slice(start, end)
  return {
    page: {
      pageSize,
      hasBefore: end < ordered.length,
      hasAfter: start > 0,
      sort: config.specs.map(spec => ({
        column: spec.column,
        order: spec.order as SortBy['order']
      })),
      ...(res.length > 0
        ? {
            before: encodeDeckCursor(res[0], config),
            after: encodeDeckCursor(res[res.length - 1], config)
          }
        : {})
    },
    res
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseJsonArray = (value: string): unknown[] => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const rewardTokenIds = (
  value: string,
  itemType?: number,
  attributes?: string | null
) => {
  const rewards = parseJsonArray(value)
  const tokenIds: number[] = []
  let unlockedStarterDeck = false
  for (const reward of rewards) {
    if (!isRecord(reward) || typeof reward.type !== 'string') continue
    if (reward.type === 'DECK') unlockedStarterDeck = true
    if (reward.type !== 'CARD' || !isRecord(reward.card)) continue
    const quantity = reward.card
    if (!isRecord(quantity.card)) continue
    const card = quantity.card
    if (!Number.isSafeInteger(card.id)) continue
    const typeCode =
      card.itemType === 'SW_SILVER_CARDS'
        ? 0x01
        : card.itemType === 'SW_GOLD_CARDS'
          ? 0x02
          : 0xff
    tokenIds.push((typeCode << 16) + (Number(card.id) & 0x00ffff))
  }
  const definitionTokenIds = parseAttributes(attributes || null)
    .tokenIDs.map(Number)
    .filter(Number.isSafeInteger)
  const itemTypeCode =
    itemType === 405 ? 5 : itemType === 407 ? 6 : itemType === 302 ? 8 : null
  if (itemTypeCode !== null) {
    tokenIds.push(
      ...definitionTokenIds.map(tokenId => (itemTypeCode << 16) + tokenId)
    )
  } else if (itemType === 403) {
    tokenIds.push(16_646_145)
  }
  return { tokenIds, unlockedStarterDeck }
}

const parseNumberArray = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => typeof item === 'number')
      : []
  } catch {
    return []
  }
}

const parseAttributes = (value: string | null) => {
  let attributes: Record<string, unknown> = {}
  try {
    attributes = value ? JSON.parse(value) : {}
  } catch {
    attributes = {}
  }
  return {
    tokenIDs: Array.isArray(attributes.tokenIDs) ? attributes.tokenIDs : [],
    cardSets: Array.isArray(attributes.cardSets) ? attributes.cardSets : [],
    cardSetsExcluded: Array.isArray(attributes.cardSetsExcluded)
      ? attributes.cardSetsExcluded
      : [],
    unlockDeckClasses: Array.isArray(attributes.unlockDeckClasses)
      ? attributes.unlockDeckClasses
      : []
  }
}

const libraryCard = (cardId: number) => {
  const card = LIBRARY_CARD_BY_ID.get(cardId)
  if (!card) throw new Error(`card ${cardId} is missing from the card library`)
  return card
}

const rewardCard = (cardId: number, itemType: ItemType) => {
  const card = libraryCard(cardId)
  return {
    accountID: 0,
    type: 'CARD',
    card: {
      amount: 1,
      card: {
        ...card,
        itemType
      }
    }
  }
}

export const canonicalGainedRewards = (value: string): Reward[] => {
  const parsed = JSON.parse(value) as unknown
  if (!Array.isArray(parsed)) throw new Error('gained rewards are malformed')
  return parsed.map(reward => {
    if (!isRecord(reward) || reward.type !== 'CARD') return reward
    const cardReward = reward.card
    if (!isRecord(cardReward) || !isRecord(cardReward.card)) return reward
    const cardId = cardReward.card.id
    const itemType = cardReward.card.itemType
    if (
      !Number.isSafeInteger(cardId) ||
      typeof itemType !== 'string' ||
      !CARD_FRAMES.includes(itemType as (typeof CARD_FRAMES)[number]) ||
      !LIBRARY_CARD_BY_ID.has(Number(cardId))
    ) {
      return reward
    }
    const canonical = rewardCard(Number(cardId), itemType as ItemType)
    return {
      ...reward,
      card: {
        ...cardReward,
        card: canonical.card.card
      }
    }
  }) as Reward[]
}

const stableRewardIndex = (value: string, length: number): number => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % length
}

export class PlayerRpcRepository {
  constructor(private readonly database: D1Database) {}

  async getAccount(userId: string, address: string): Promise<Account | null> {
    if (address !== identityReferenceFor(userId)) return null
    return this.getIdentityAccount(userId, true)
  }

  async getAccountByReference(
    address: string,
    viewerUserId?: string
  ): Promise<Account | null> {
    if (!address.startsWith('identity:')) return null
    const userId = address.slice('identity:'.length)
    if (!userId) return null
    return this.getIdentityAccount(userId, viewerUserId === userId)
  }

  async getAccountByUsername(
    username: string,
    viewerUserId?: string
  ): Promise<Account | null> {
    const row = await this.database
      .prepare(
        `SELECT user_id
         FROM player_account_settings
         WHERE name = ? COLLATE NOCASE`
      )
      .bind(username.trim().toLowerCase())
      .first<{ user_id: string }>()
    if (!row) return null
    return this.getIdentityAccount(row.user_id, viewerUserId === row.user_id)
  }

  async getAccountForAdmin(
    name?: string,
    accountAddress?: string
  ): Promise<Account | null> {
    const identityReference =
      name?.startsWith('identity:') === true ? name : accountAddress
    if (identityReference?.startsWith('identity:')) {
      const userId = identityReference.slice('identity:'.length)
      return userId ? this.getIdentityAccount(userId, true) : null
    }
    if (!name?.trim()) return null
    const row = await this.database
      .prepare(
        `SELECT user_id FROM player_account_settings
         WHERE name = ? COLLATE NOCASE`
      )
      .bind(name.trim())
      .first<{ user_id: string }>()
    return row ? this.getIdentityAccount(row.user_id, true) : null
  }

  async feed(
    accountAddress: string,
    page?: Page,
    types?: Array<FeedEvent['type']>
  ): Promise<{ page: Page; res: FeedEvent[] }> {
    if (!accountAddress.startsWith('identity:')) {
      throw invalidArgument('account_address is invalid')
    }
    const userId = accountAddress.slice('identity:'.length)
    if (!userId) throw invalidArgument('account_address is invalid')
    const account = await this.database
      .prepare('SELECT 1 FROM users WHERE id = ?')
      .bind(userId)
      .first()
    if (!account) throw notFound('account was not found')

    const [
      rankRows,
      skypassRows,
      conquestRows,
      leaderboardRows,
      conquestV2RewardRows
    ] = await Promise.all([
      this.database
        .prepare(
          `SELECT rowid AS row_id, game_mode, season, player_rank,
                  player_rank_stage, awarded_at
           FROM player_rank_up_rewards
           WHERE user_id = ?`
        )
        .bind(userId)
        .all<RankFeedRow>(),
      this.database
        .prepare(
          `SELECT claim.rowid AS row_id, claim.rewards, claim.claimed_at,
                    reward.item_type, reward.amount, reward.attributes
             FROM player_skypass_claims claim
             JOIN skypass_rewards reward ON reward.id = claim.reward_id
             WHERE claim.user_id = ?`
        )
        .bind(userId)
        .all<SkypassFeedRow>(),
      this.database
        .prepare(
          `SELECT id AS row_id, event_type, token_ids_json, created_at
           FROM player_conquest_feed_events
           WHERE user_id = ?`
        )
        .bind(userId)
        .all<ConquestFeedRow>(),
      this.database
        .prepare(
          `SELECT id, game_mode, leaderboard_rank, token_ids_json, created_at
           FROM player_leaderboard_reward_feed_events
           WHERE user_id = ?`
        )
        .bind(userId)
        .all<LeaderboardFeedRow>(),
      this.database
        .prepare(
          `SELECT id, treasure_level, token_ids_json, created_at
             FROM player_conquest_v2_reward_feed_events
             WHERE user_id = ?`
        )
        .bind(userId)
        .all<ConquestV2RewardFeedRow>()
    ])

    // The generated client type marks `match` as required, but the source Go
    // pointer is absent for every non-MATCH event returned by this endpoint.
    const events: FeedEvent[] = rankRows.results.map(
      row =>
        ({
          id: row.row_id * 2,
          type: 'RANKUP',
          createdAt: row.awarded_at,
          playerRank: row.player_rank,
          playerRankStage: row.player_rank_stage,
          season: row.season,
          gameMode: row.game_mode
        }) as unknown as FeedEvent
    )
    for (const row of skypassRows.results) {
      const { tokenIds, unlockedStarterDeck } = rewardTokenIds(
        row.rewards,
        row.item_type,
        row.attributes
      )
      if (tokenIds.length > 0) {
        events.push({
          id: row.row_id * 2 + 1,
          type: 'REWARD',
          createdAt: row.claimed_at,
          tokenIds
        } as unknown as FeedEvent)
      } else if (row.item_type === 303) {
        events.push({
          id: row.row_id * 2 + 1,
          type: 'REWARD',
          createdAt: row.claimed_at,
          stickerPoints: row.amount
        } as unknown as FeedEvent)
      } else if (unlockedStarterDeck) {
        events.push({
          id: row.row_id * 2 + 1,
          type: 'STARTED_DECK_UNLOCK',
          createdAt: row.claimed_at
        } as unknown as FeedEvent)
      }
    }
    for (const row of conquestRows.results) {
      events.push({
        // Keep source-shaped positive IDs while reserving a practically
        // unreachable namespace above all SQLite row-derived event IDs.
        id: 4_503_599_627_370_496 + row.row_id,
        type: row.event_type,
        createdAt: row.created_at,
        tokenIds: parseJsonArray(row.token_ids_json).map(Number)
      } as unknown as FeedEvent)
    }
    for (const row of leaderboardRows.results) {
      events.push({
        id: 3_377_699_720_527_872 + row.id,
        type: 'LEADERBOARD_REWARD',
        createdAt: row.created_at,
        gameMode: row.game_mode,
        leaderboardRank: row.leaderboard_rank,
        tokenIds: parseJsonArray(row.token_ids_json).map(Number)
      } as unknown as FeedEvent)
    }
    for (const row of conquestV2RewardRows.results) {
      events.push({
        id: 2_251_799_813_685_248 + row.id,
        // The source event's numeric field represented USDC. In identity mode,
        // return the actual off-chain card value through the existing generic
        // REWARD contract rather than inventing a cash amount.
        type: 'REWARD',
        createdAt: row.created_at,
        tokenIds: parseJsonArray(row.token_ids_json).map(Number)
      } as unknown as FeedEvent)
    }

    const requestedTypes = types?.length ? new Set(types) : undefined
    const filtered = events
      .filter(event => !requestedTypes || requestedTypes.has(event.type))
      .sort((left, right) => {
        const time = Date.parse(right.createdAt) - Date.parse(left.createdAt)
        return time || right.id - left.id
      })
    const size = feedPageSize(page)
    if (page?.before && page.after) {
      throw invalidArgument('page cannot use before and after together')
    }
    let start = 0
    let end = Math.min(filtered.length, size)
    if (page?.before) {
      const cursor = decodeFeedEventCursor(page.before)
      const next = filtered.findIndex(
        event => compareFeedEventCursor(event, cursor) > 0
      )
      start = next < 0 ? filtered.length : next
      end = Math.min(filtered.length, start + size)
    } else if (page?.after) {
      const cursor = decodeFeedEventCursor(page.after)
      const previousEnd = filtered.findIndex(
        event => compareFeedEventCursor(event, cursor) >= 0
      )
      end = previousEnd < 0 ? filtered.length : previousEnd
      start = Math.max(0, end - size)
    }
    const selected = filtered.slice(start, end)
    const res = selected.map(event =>
      sourceFeedEventWire({
        ...event,
        cards: feedRewardCards(event)
      })
    )
    return {
      page: {
        pageSize: size,
        hasBefore: end < filtered.length,
        hasAfter: start > 0,
        ...(res.length > 0
          ? {
              before: encodeFeedEventCursor(res[0]),
              after: encodeFeedEventCursor(res[res.length - 1])
            }
          : {})
      },
      res
    }
  }

  private async getIdentityAccount(
    userId: string,
    includePrivateSettings: boolean
  ): Promise<Account | null> {
    const competitive = new CompetitiveRepository(this.database)
    const stats = await competitive.currentStats(userId)
    const currentSeason = seasonFromDate()
    const row = await this.database
      .prepare(
        `SELECT u.display_name, game.id AS game_account_id,
                account.name AS account_name,
                account.locale,
                account.region,
                account.tag_art_id,
                account.title_id,
                ${sourceCrystalIDSQL('u.id')} AS crystal_id,
                account.hide_player_names,
                account.request_more_invites,
                account.twitch_profile,
                account.rename_locked_until,
                account.warm_ups,
                account.spectate_code,
                account.spectate_code_expires_at,
                u.created_at AS user_created_at,
                p.updated_at AS profile_updated_at,
                p.level,
                p.xp,
                p.next_level_xp,
                skypass.initial_account_level,
                skypass.achieved_account_level,
                invite.inviter_user_id
         FROM users u
         JOIN player_profiles p ON p.user_id = u.id
         JOIN player_progression g ON g.user_id = u.id
         LEFT JOIN player_skypass_season_stats skypass
           ON skypass.user_id = u.id AND skypass.season = ?
         LEFT JOIN player_account_settings account ON account.user_id = u.id
         LEFT JOIN game_accounts game ON game.user_id = u.id
         LEFT JOIN player_invites invite ON invite.invitee_user_id = u.id
         WHERE u.id = ?`
      )
      .bind(currentSeason, userId)
      .first<AccountRow>()
    if (!row) return null

    return sourceAccountWire({
      id: row.game_account_id ?? 0,
      address: identityReferenceFor(userId),
      name: row.account_name || row.display_name,
      locale: row.locale || 'en',
      createdAt: row.user_created_at,
      updatedAt: row.profile_updated_at,
      experience: row.xp,
      warmUps: row.warm_ups,
      level: row.level,
      seasonLevel:
        row.initial_account_level === null ||
        row.achieved_account_level === null
          ? 0
          : effectiveSkypassSeasonLevel(
              row.initial_account_level,
              row.achieved_account_level
            ),
      levelUpXP: row.next_level_xp,
      stats,
      isBurnerWallet: includePrivateSettings ? false : undefined,
      ...(row.inviter_user_id
        ? { invitedBy: identityReferenceFor(row.inviter_user_id) }
        : {}),
      ...(row.region ? { region: row.region } : {}),
      ...(row.tag_art_id ? { tagArtID: row.tag_art_id } : {}),
      ...(row.crystal_id !== null ? { crystalID: row.crystal_id } : {}),
      ...(row.title_id !== null ? { titleID: row.title_id } : {}),
      ...(includePrivateSettings
        ? {
            settings: {
              hidePlayerNames: row.hide_player_names === 1,
              suspended: false,
              requestMoreInvites: row.request_more_invites === 1,
              starterDeckV2Migration: true,
              ...(row.rename_locked_until
                ? { renameLockedUntil: row.rename_locked_until }
                : {}),
              ...(row.twitch_profile
                ? { twitchProfile: row.twitch_profile }
                : {}),
              ...(row.title_id !== null ? { titleID: row.title_id } : {}),
              ...(row.spectate_code ? { spectateCode: row.spectate_code } : {}),
              ...(row.spectate_code_expires_at
                ? { spectateCodeExpiresAt: row.spectate_code_expires_at }
                : {})
            }
          }
        : {})
    })
  }

  async getPrivateSpectateCode(
    userId: string,
    forceReset: boolean
  ): Promise<string> {
    return refreshPrivateSpectateCode(this.database, userId, forceReset)
  }

  async accountReferenceExists(address: string): Promise<boolean> {
    if (!address.startsWith('identity:')) return false
    const userId = address.slice('identity:'.length)
    if (!userId) return false
    const row = await this.database
      .prepare('SELECT 1 FROM users WHERE id = ?')
      .bind(userId)
      .first()
    return !!row
  }

  async accountNameExists(name: string): Promise<boolean> {
    const row = await this.database
      .prepare(
        `SELECT 1 FROM player_account_settings
         WHERE name = ? COLLATE NOCASE`
      )
      .bind(name.trim())
      .first()
    return !!row
  }

  async requestMoreInvites(userId: string): Promise<boolean> {
    const result = await this.database
      .prepare(
        `UPDATE player_account_settings
         SET request_more_invites = 1, updated_at = ?
         WHERE user_id = ?`
      )
      .bind(new Date().toISOString(), userId)
      .run()
    if (result.meta.changes !== 1) throw invalidArgument('missing account')
    return true
  }

  async updateAccount(
    userId: string,
    request: Partial<Account> & { address: string }
  ): Promise<Account> {
    if (request.address !== identityReferenceFor(userId)) {
      throw invalidArgument('address is invalid')
    }
    const current = await this.database
      .prepare(
        `SELECT name, locale, region, tag_art_id, title_id,
                hide_player_names, request_more_invites, twitch_profile,
                rename_locked_until
         FROM player_account_settings WHERE user_id = ?`
      )
      .bind(userId)
      .first<{
        name: string
        locale: string
        region: string | null
        tag_art_id: string | null
        title_id: number | null
        hide_player_names: number
        request_more_invites: number
        twitch_profile: string | null
        rename_locked_until: string | null
      }>()
    if (!current) throw new Error('player account settings are missing')

    const name = request.name?.trim() ?? ''
    if (!name) throw invalidArgument('name is required')
    if (name.toLowerCase() !== current.name.toLowerCase()) {
      if (current.rename_locked_until) {
        const lockedUntil = Date.parse(current.rename_locked_until)
        if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
          throw permissionDenied(
            `account name change locked until ${current.rename_locked_until}`
          )
        }
      }
      if (name.length < 4 || name.length > 20 || !/^[\w.-]+$/.test(name)) {
        throw invalidArgument(
          'name must be 4-20 letters, digits, dots, dashes, or underscores'
        )
      }
      const walletName = await this.database
        .prepare('SELECT 1 FROM accounts WHERE name = ? COLLATE NOCASE')
        .bind(name)
        .first()
      if (walletName) throw alreadyExists('duplicated account name')
    }

    const locale = (request.locale ?? current.locale).trim()
    if (!locale || locale.length > 16)
      throw invalidArgument('locale is invalid')
    const region = request.region
      ? request.region.trim().toUpperCase().slice(0, 16)
      : current.region
    const tagArtID = request.tagArtID?.trim() || null
    if (tagArtID && (!/^[\w-]+$/.test(tagArtID) || tagArtID.length > 20)) {
      throw invalidArgument('account art is invalid')
    }

    const titleID = request.titleID || null
    if (titleID !== null) {
      if (!Number.isSafeInteger(titleID) || titleID <= 0) {
        throw invalidArgument('titleID is invalid')
      }
      const owned = await this.database
        .prepare(
          `SELECT 1 FROM player_items
           WHERE user_id = ? AND item_type = 'SW_TITLES' AND token_id = ?
             AND balance > 0`
        )
        .bind(userId, titleID)
        .first()
      if (!owned) throw invalidArgument(`title ${titleID} is not owned`)
    }

    const settings = request.settings
    const hidePlayerNames =
      settings?.hidePlayerNames === undefined
        ? current.hide_player_names
        : settings.hidePlayerNames
          ? 1
          : 0
    const requestMoreInvites =
      settings?.requestMoreInvites === undefined
        ? current.request_more_invites
        : settings.requestMoreInvites
          ? 1
          : 0
    const twitchProfile =
      settings?.twitchProfile === undefined
        ? current.twitch_profile
        : settings.twitchProfile.trim().slice(0, 64) || null
    const now = new Date().toISOString()

    try {
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE player_account_settings
             SET name = ?, locale = ?, region = ?, tag_art_id = ?,
                 title_id = ?, hide_player_names = ?,
                 request_more_invites = ?, twitch_profile = ?, updated_at = ?
             WHERE user_id = ?`
          )
          .bind(
            name,
            locale,
            region,
            tagArtID,
            titleID,
            hidePlayerNames,
            requestMoreInvites,
            twitchProfile,
            now,
            userId
          ),
        this.database
          .prepare(
            `UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?`
          )
          .bind(name, now, userId)
      ])
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) {
        throw alreadyExists('duplicated account name')
      }
      throw error
    }

    const account = await this.getAccount(userId, request.address)
    if (!account) throw new Error('updated player account was not found')
    return account
  }

  async listDecks(userId: string): Promise<Deck[]> {
    const result = await this.database
      .prepare(
        `SELECT id, name, deck_class, deck_string, card_ids, art, created_at,
                updated_at, favorited_at, deck_type, is_new, conquest_v2_points
         FROM player_decks
         WHERE user_id = ?
         ORDER BY favorited_at DESC NULLS LAST, name ASC, id DESC`
      )
      .bind(userId)
      .all<DeckRow>()

    return result.results.map(row =>
      sourceDeckWire({
        uuid: row.id,
        name: row.name,
        class: row.deck_class,
        deckString: row.deck_string,
        cardIds: parseNumberArray(row.card_ids),
        art: row.art,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isFavorite: row.favorited_at !== null,
        favoritedAt: row.favorited_at,
        deckType: row.deck_type,
        isNew: row.is_new === 1,
        conquestV2Points: row.conquest_v2_points
      })
    )
  }

  async listDeckPage(
    userId: string,
    page?: Page
  ): Promise<{ page: Page; res: Deck[] }> {
    return pagedDecks(await this.listDecks(userId), page, 'list', 200)
  }

  async searchDecks(
    userId: string,
    request: {
      deckString?: string
      name?: string
      class?: Deck['class']
    },
    page?: Page
  ): Promise<{ page: Page; res: Deck[] }> {
    const decks = (await this.listDecks(userId))
      .filter(
        deck => !request.deckString || deck.deckString === request.deckString
      )
      .filter(
        deck =>
          !request.name ||
          deck.name.toLowerCase().includes(request.name.toLowerCase())
      )
      .filter(deck => !request.class || deck.class === request.class)
    return pagedDecks(decks, page, 'search', 20)
  }

  async checkDeck(
    currentUserId: string,
    request: {
      accountAddress?: string
      uuid?: string
      deckString?: string
      contractQuery?: boolean
    }
  ): Promise<{
    containsInvalid: boolean
    accountOwnsAllCards: boolean
    unlockedClass: boolean
  }> {
    let userId = currentUserId
    if (request.accountAddress !== undefined) {
      if (!request.accountAddress.startsWith('identity:')) {
        throw invalidArgument('account address is invalid')
      }
      userId = request.accountAddress.slice('identity:'.length)
      if (
        !userId ||
        !(await this.accountReferenceExists(request.accountAddress))
      ) {
        throw invalidArgument('account address is invalid')
      }
    }

    const stored = (await this.listDecks(userId)).find(
      deck =>
        deck.deckType !== 'LOCKED_STARTER' &&
        (!request.uuid || deck.uuid === request.uuid) &&
        (!request.deckString || deck.deckString === request.deckString)
    )
    if (!stored && !request.deckString) {
      return {
        containsInvalid: false,
        accountOwnsAllCards: true,
        unlockedClass: false
      }
    }

    const decoded = stored
      ? { cardIds: stored.cardIds, deckClass: stored.class }
      : decodeDeckString(request.deckString!)
    const normalized = forceValidDeckClass(decoded.cardIds, decoded.deckClass)
    if (normalized.cardIds.length > 30) {
      throw new Error('deck validation failed: wrong number of cards')
    }

    const owned = normalized.cardIds.length
      ? await this.database
          .prepare(
            `SELECT token_id
             FROM player_items
             WHERE user_id = ? AND token_id IN (${normalized.cardIds
               .map(() => '?')
               .join(',')})
               AND item_type IN ('SW_BASE_CARDS', 'SW_SILVER_CARDS',
                                 'SW_GOLD_CARDS')
             GROUP BY token_id
             HAVING SUM(balance) > 0`
          )
          .bind(userId, ...normalized.cardIds)
          .all<{ token_id: number }>()
      : { results: [] }

    const heroId = HERO_ID_BY_DECK_CLASS.get(normalized.deckClass)
    const unlockedClass =
      heroId === 1 ||
      (heroId !== undefined &&
        !!(await this.database
          .prepare(
            `SELECT 1 FROM player_items
             WHERE user_id = ? AND item_type = 'SW_HERO'
               AND token_id = ? AND balance > 0`
          )
          .bind(userId, heroId)
          .first()))

    return {
      containsInvalid: normalized.containsInvalid,
      accountOwnsAllCards: normalized.cardIds.length === owned.results.length,
      unlockedClass
    }
  }

  private async findDeck(
    userId: string,
    selector: { uuid?: string; deckString?: string }
  ): Promise<Deck | null> {
    const decks = await this.listDecks(userId)
    return (
      decks.find(
        deck =>
          (!selector.uuid || deck.uuid === selector.uuid) &&
          (!selector.deckString || deck.deckString === selector.deckString)
      ) || null
    )
  }

  async getDeck(
    userId: string,
    selector: { uuid?: string; deckString?: string }
  ): Promise<Deck | null> {
    return this.findDeck(userId, selector)
  }

  async createDeck(
    userId: string,
    request: {
      name: string
      class?: Deck['class']
      cardIds: number[]
      art?: string
    }
  ): Promise<Deck> {
    const deckClass = request.class || ('UNKNOWN_CLASS' as Deck['class'])
    if (deckClass === ('UNKNOWN_CLASS' as Deck['class'])) {
      throw new Error('deck class is required')
    }
    validateDeckClass(request.cardIds, deckClass)
    const deckString = encodeDeckString(request.cardIds, deckClass)
    const uuid = crypto.randomUUID()
    const now = new Date().toISOString()
    const insert = this.database
      .prepare(
        `INSERT INTO player_decks
           (id, user_id, name, prism, deck_string, card_count, is_starter,
            created_at, updated_at, deck_class, card_ids, art, deck_type,
            is_new, conquest_v2_points)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'CUSTOM', 0, 0)`
      )
      .bind(
        uuid,
        userId,
        request.name,
        String(deckClass).toLowerCase(),
        deckString,
        request.cardIds.length,
        now,
        now,
        deckClass,
        JSON.stringify(request.cardIds),
        request.art || ''
      )
    const rankInsert = completeDeckRankInsert(this.database, {
      deckString,
      deckClass,
      cardIds: request.cardIds,
      userId,
      now
    })
    await this.database.batch(rankInsert ? [insert, rankInsert] : [insert])
    const deck = await this.findDeck(userId, { uuid })
    if (!deck) throw new Error('created deck was not found')
    return deck
  }

  async updateDeck(
    userId: string,
    selector: { uuid?: string; deckString?: string },
    update: {
      deckString: string
      name: string
      class: Deck['class']
      art?: string
    }
  ): Promise<Deck> {
    const existing = await this.findDeck(userId, selector)
    if (!existing) throw new Error('deck does not exist')
    if (existing.deckType === ('LOCKED_STARTER' as Deck['deckType'])) {
      throw new Error('deck not unlocked')
    }

    const decoded = decodeDeckString(update.deckString)
    validateDeckClass(decoded.cardIds, decoded.deckClass)
    const now = new Date().toISOString()
    const updateStatement = this.database
      .prepare(
        `UPDATE player_decks
         SET name = ?, deck_class = ?, prism = ?, deck_string = ?, card_ids = ?,
             card_count = ?, art = ?, is_new = 0, updated_at = ?
         WHERE user_id = ? AND id = ?`
      )
      .bind(
        update.name || existing.name,
        decoded.deckClass,
        String(decoded.deckClass).toLowerCase(),
        update.deckString,
        JSON.stringify(decoded.cardIds),
        decoded.cardIds.length,
        update.art || existing.art,
        now,
        userId,
        existing.uuid
      )
    const rankInsert = completeDeckRankInsert(this.database, {
      deckString: update.deckString,
      deckClass: decoded.deckClass,
      cardIds: decoded.cardIds,
      userId,
      now
    })
    await this.database.batch(
      rankInsert ? [updateStatement, rankInsert] : [updateStatement]
    )
    const deck = await this.findDeck(userId, { uuid: existing.uuid })
    if (!deck) throw new Error('updated deck was not found')
    return deck
  }

  async deleteDeck(
    userId: string,
    selector: { uuid?: string; deckString?: string }
  ): Promise<boolean> {
    const existing = await this.findDeck(userId, selector)
    if (!existing) throw new Error('deck not found')
    if (existing.deckType === ('LOCKED_STARTER' as Deck['deckType'])) {
      throw new Error('deck not unlocked')
    }
    await this.database
      .prepare(`DELETE FROM player_decks WHERE user_id = ? AND id = ?`)
      .bind(userId, existing.uuid)
      .run()
    return true
  }

  async setDeckFavorite(
    userId: string,
    uuid: string,
    favorite: boolean
  ): Promise<boolean> {
    const favoritedAt = favorite ? new Date().toISOString() : null
    await this.database
      .prepare(
        `UPDATE player_decks SET favorited_at = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`
      )
      .bind(favoritedAt, new Date().toISOString(), userId, uuid)
      .run()
    return true
  }

  async toggleDeckFavorite(userId: string, uuid: string): Promise<boolean> {
    const now = new Date().toISOString()
    const row = await this.database
      .prepare(
        `UPDATE player_decks
         SET favorited_at = CASE WHEN favorited_at IS NULL THEN ? ELSE NULL END,
             updated_at = ?
         WHERE user_id = ? AND id = ?
         RETURNING favorited_at`
      )
      .bind(now, now, userId, uuid)
      .first<{ favorited_at: string | null }>()
    if (!row) throw new Error('deck not found')
    return row.favorited_at !== null
  }

  async markDeckNotNew(userId: string, uuid: string): Promise<boolean> {
    const deck = await this.database
      .prepare(
        `SELECT deck_type FROM player_decks
         WHERE user_id = ? AND id = ?`
      )
      .bind(userId, uuid)
      .first<{ deck_type: Deck['deckType'] }>()
    if (!deck) throw notFound('deck not found')
    if (deck.deck_type === ('LOCKED_STARTER' as Deck['deckType'])) {
      throw failedPrecondition('deck not unlocked')
    }

    await this.database
      .prepare(
        `UPDATE player_decks SET is_new = 0, updated_at = ?
         WHERE user_id = ? AND id = ?`
      )
      .bind(new Date().toISOString(), userId, uuid)
      .run()
    return true
  }

  async unlockedDeckClasses(userId: string): Promise<DeckClass[]> {
    const heroes = await this.database
      .prepare(
        `SELECT token_id FROM player_items
         WHERE user_id = ? AND item_type = 'SW_HERO'
         ORDER BY id ASC`
      )
      .bind(userId)
      .all<{ token_id: number }>()

    // The source always includes Ada manually because its legacy inventory did
    // not persist her. Cloud Weasel does persist Ada, so skip that row to retain
    // the exact response shape without returning STR twice.
    return [
      DeckClass.STR,
      ...heroes.results
        .filter(hero => hero.token_id !== 1)
        .map(
          hero =>
            HERO_DECK_CLASS[hero.token_id] || DeckClass.UNKNOWN_CLASS
        )
    ]
  }

  private async applyDeferredItemUpdates(userId: string): Promise<void> {
    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE player_items
           SET is_new = 0, updated_at = ?
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM player_deferred_item_updates pending
             WHERE pending.user_id = player_items.user_id
               AND pending.item_type = player_items.item_type
               AND pending.token_id = player_items.token_id
               AND pending.execute_at <= ?
           )`
        )
        .bind(now, userId, now),
      this.database
        .prepare(
          `UPDATE player_card_unlocks
           SET is_new = 0
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM player_deferred_item_updates pending
             WHERE pending.user_id = player_card_unlocks.user_id
               AND pending.item_type = player_card_unlocks.item_type
               AND pending.token_id = player_card_unlocks.card_id
               AND pending.execute_at <= ?
           )`
        )
        .bind(userId, now),
      this.database
        .prepare(
          `DELETE FROM player_deferred_item_updates
           WHERE user_id = ? AND execute_at <= ?`
        )
        .bind(userId, now)
    ])
  }

  private async listCardRows(userId: string): Promise<OwnedCardRow[]> {
    await this.applyDeferredItemUpdates(userId)
    const result = await this.database
      .prepare(
        `SELECT token_id AS card_id, item_type, balance, is_new
         FROM player_items
         WHERE user_id = ? AND balance > 0
           AND item_type IN ('SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS')
         ORDER BY token_id, item_type`
      )
      .bind(userId)
      .all<OwnedCardRow>()
    return result.results
  }

  async listItems(userId: string, itemTypes?: ItemType[]): Promise<Item[]> {
    await this.applyDeferredItemUpdates(userId)
    const result = await this.database
      .prepare(
        `SELECT id, item_type, token_id, balance, created_at, updated_at, is_new
         FROM player_items
         WHERE user_id = ? AND balance > 0
         ORDER BY item_type ASC, token_id ASC`
      )
      .bind(userId)
      .all<InventoryRow>()
    const requested = itemTypes?.length ? new Set(itemTypes) : undefined
    return result.results
      .filter(row => !requested || requested.has(row.item_type))
      .map(row =>
        sourceItemWire({
          id: row.id,
          itemType: row.item_type,
          tokenID: row.token_id,
          balance: String(row.balance),
          lastUpdateID: 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          isNew: row.is_new === 1
        })
      )
  }

  async cardSearchInventory(userId: string): Promise<
    Array<{
      itemType: string
      tokenId: number
      balance: number
      isNew: boolean
      createdAt: string
    }>
  > {
    const result = await this.database
      .prepare(
        `SELECT item_type, token_id, balance, is_new, created_at
         FROM player_items
         WHERE user_id = ? AND balance > 0
           AND item_type IN ('SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS')
         ORDER BY token_id ASC, item_type ASC`
      )
      .bind(userId)
      .all<InventoryRow>()
    return result.results.map(row => ({
      itemType: row.item_type,
      tokenId: row.token_id,
      balance: row.balance,
      isNew: row.is_new === 1,
      createdAt: row.created_at
    }))
  }

  async itemSummary(
    userId: string,
    accountAddress: string
  ): Promise<Record<string, ItemSummary>> {
    if (accountAddress !== identityReferenceFor(userId)) {
      throw permissionDenied('you can only view your own item summary')
    }
    await this.applyDeferredItemUpdates(userId)
    const result = await this.database
      .prepare(
        `SELECT MIN(id) AS id, item_type, SUM(balance) AS total_balance,
                MIN(created_at) AS created_at, MAX(updated_at) AS updated_at
         FROM player_items
         WHERE user_id = ? AND balance > 0
         GROUP BY item_type
         ORDER BY item_type ASC`
      )
      .bind(userId)
      .all<InventorySummaryRow>()
    const summary: Record<string, ItemSummary> = {}
    for (const row of result.results) {
      if (!SUMMARY_ITEM_TYPES.has(row.item_type)) continue
      summary[row.item_type] = sourceItemSummaryWire({
        id: row.id,
        itemType: row.item_type,
        totalBalance: String(row.total_balance),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })
    }

    // Wallet balances are an optional future merge at this boundary. Preserve
    // the source key while reporting no connected-wallet USDC today.
    const now = new Date().toISOString()
    summary.USDC = sourceItemSummaryWire({
      id: 0,
      itemType: 'USDC' as ItemType,
      totalBalance: '0',
      createdAt: now,
      updatedAt: now
    })
    return summary
  }

  async itemSupply(itemId: number): Promise<Record<string, Item>> {
    if (!Number.isSafeInteger(itemId) || itemId < 0) {
      throw invalidArgument('tokenID is invalid')
    }
    const tokenId = itemId & 0x00ffff
    const result = await this.database
      .prepare(
        `SELECT MIN(id) AS id, item_type, SUM(balance) AS total_balance,
                MIN(created_at) AS created_at, MAX(updated_at) AS updated_at
         FROM player_items
         WHERE token_id = ? AND balance > 0
         GROUP BY item_type
         ORDER BY item_type ASC`
      )
      .bind(tokenId)
      .all<InventorySummaryRow>()
    const supply: Record<string, Item> = {}
    for (const row of result.results) {
      if (!SUPPLY_ITEM_TYPES.has(row.item_type)) continue
      supply[row.item_type] = sourceItemWire({
        id: row.id,
        itemType: row.item_type,
        tokenID: tokenId,
        balance: String(row.total_balance),
        lastUpdateID: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })
    }
    return supply
  }

  async batchItemSupply(
    itemIds: number[]
  ): Promise<Record<number, Record<string, Item>>> {
    if (itemIds.length > 50) throw invalidArgument('tokens exceed the limit')
    if (
      !itemIds.every(
        itemId =>
          Number.isSafeInteger(itemId) && itemId >= 0 && itemId <= 0xffff
      )
    ) {
      throw invalidArgument('tokenIDs are invalid')
    }
    const supplies = await Promise.all(
      [...new Set(itemIds)].map(
        async itemId => [itemId, await this.itemSupply(itemId)] as const
      )
    )
    return Object.fromEntries(
      supplies.filter(([, supply]) => Object.keys(supply).length > 0)
    )
  }

  async itemSuppliesByType(
    itemTypes: ItemType[]
  ): Promise<Record<number, ItemSupply[]>> {
    if (itemTypes.length === 0)
      throw invalidArgument('itemTypes cannot be empty')
    if (!itemTypes.every(itemType => KNOWN_ITEM_TYPES.has(itemType))) {
      throw invalidArgument('itemTypes contains an invalid item type')
    }
    const selected = [...new Set(itemTypes)].filter(itemType =>
      SUPPLY_ITEM_TYPES.has(itemType)
    )
    if (selected.length === 0) return {}
    const placeholders = selected.map(() => '?').join(',')
    const result = await this.database
      .prepare(
        `SELECT item_type, token_id, SUM(balance) AS total_balance
         FROM player_items
         WHERE item_type IN (${placeholders}) AND balance > 0
         GROUP BY item_type, token_id
         ORDER BY item_type ASC, token_id ASC`
      )
      .bind(...selected)
      .all<{
        item_type: ItemType
        token_id: number
        total_balance: number
      }>()
    const supplies: Record<number, ItemSupply[]> = {}
    for (const row of result.results) {
      const id = ITEM_TYPE_ID[row.item_type]
      if (id === undefined) continue
      ;(supplies[id] ??= []).push({
        itemID: row.token_id,
        itemType: row.item_type,
        totalBalance: String(row.total_balance)
      })
    }
    return supplies
  }

  private async ownedItem(
    userId: string,
    itemType: ItemType,
    tokenId: number
  ): Promise<InventoryRow | null> {
    return this.database
      .prepare(
        `SELECT id, item_type, token_id, balance, created_at, updated_at, is_new
         FROM player_items
         WHERE user_id = ? AND item_type = ? AND token_id = ? AND balance > 0`
      )
      .bind(userId, itemType, tokenId)
      .first<InventoryRow>()
  }

  private itemFromRow(row: InventoryRow): Item {
    return sourceItemWire({
      id: row.id,
      itemType: row.item_type,
      tokenID: row.token_id,
      balance: String(row.balance),
      lastUpdateID: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isNew: row.is_new === 1
    })
  }

  async equipItem(
    userId: string,
    itemType: ItemType,
    tokenId: number
  ): Promise<Item> {
    if (!EQUIPPABLE_ITEM_TYPES.has(itemType)) {
      throw invalidArgument(`unsupported item type: ${itemType}`)
    }
    const item = await this.ownedItem(userId, itemType, tokenId)
    if (!item) throw notFound('item is not owned')
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO player_items_equipped
           (user_id, item_id, item_type, token_id, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        item.id,
        item.item_type,
        item.token_id,
        new Date().toISOString()
      )
      .run()
    return this.itemFromRow(item)
  }

  async unequipItem(
    userId: string,
    itemType: ItemType,
    tokenId: number
  ): Promise<boolean> {
    const item = await this.ownedItem(userId, itemType, tokenId)
    if (!item) throw notFound('item is not owned')
    await this.database
      .prepare(
        `DELETE FROM player_items_equipped
         WHERE user_id = ? AND item_type = ? AND token_id = ?`
      )
      .bind(userId, itemType, tokenId)
      .run()
    return true
  }

  async listEquippedItems(
    userId: string,
    itemType?: ItemType
  ): Promise<Item[]> {
    const filter = itemType ? 'AND equipped.item_type = ?' : ''
    const statement = this.database.prepare(
      `SELECT item.id, item.item_type, item.token_id, item.balance,
              item.created_at, item.updated_at, item.is_new
       FROM player_items_equipped equipped
       JOIN player_items item ON item.id = equipped.item_id
       WHERE equipped.user_id = ? AND item.balance > 0 ${filter}
       ORDER BY equipped.item_type ASC, equipped.token_id ASC`
    )
    const result = itemType
      ? await statement.bind(userId, itemType).all<InventoryRow>()
      : await statement.bind(userId).all<InventoryRow>()
    return result.results.map(row => this.itemFromRow(row))
  }

  async deckEquipment(
    userId: string,
    deckString: string
  ): Promise<DeckEquipment> {
    const { deckClass } = decodeDeckString(deckString)
    const equipped = await this.database
      .prepare(
        `SELECT equipped.item_type, equipped.token_id
         FROM player_items_equipped equipped
         JOIN player_items item ON item.id = equipped.item_id
         WHERE equipped.user_id = ? AND item.balance > 0
         ORDER BY equipped.item_type ASC, equipped.token_id ASC`
      )
      .bind(userId)
      .all<{ item_type: ItemType; token_id: number }>()
    const stickers = equipped.results
      .filter(item => item.item_type === ('SW_STICKERS' as ItemType))
      .map(item => item.token_id)
    const cardBacks = equipped.results
      .filter(item => item.item_type === ('SW_CARD_BACKS' as ItemType))
      .map(item => item.token_id)
    const result: DeckEquipment = {}
    if (stickers.length) result.stickers = stickers
    if (cardBacks.length) {
      const random = crypto.getRandomValues(new Uint32Array(1))[0]
      result.cardBack = cardBacks[random % cardBacks.length]
    }

    const heroId = HERO_ID_BY_DECK_CLASS.get(deckClass)
    if (heroId !== undefined) {
      const heroSkin = await this.ownedItem(
        userId,
        'SW_HERO_SKINS' as ItemType,
        heroId
      )
      if (heroSkin) result.heroSkin = heroId
    }
    return result
  }

  async markItemsNotNew(
    userId: string,
    tokenIds: number[],
    immediately: boolean
  ): Promise<boolean> {
    if (!tokenIds.length) return true
    const now = new Date()
    const executeAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()
    const statements: D1PreparedStatement[] = []
    for (const tokenId of tokenIds) {
      if (!Number.isSafeInteger(tokenId) || tokenId < 0) {
        throw invalidArgument('Invalid card/token ID')
      }
      const typeCode = (tokenId & 0xff0000) >> 16
      const itemType = ITEM_TYPE_BY_TOKEN_CODE[typeCode]
      const itemId = tokenId & 0x00ffff
      if (!itemType) throw invalidArgument('Invalid card/token ID')
      if (immediately) {
        statements.push(
          this.database
            .prepare(
              `UPDATE player_items SET is_new = 0, updated_at = ?
               WHERE user_id = ? AND item_type = ? AND token_id = ?`
            )
            .bind(now.toISOString(), userId, itemType, itemId)
        )
        if (CARD_FRAMES.includes(itemType as (typeof CARD_FRAMES)[number])) {
          statements.push(
            this.database
              .prepare(
                `UPDATE player_card_unlocks SET is_new = 0
                 WHERE user_id = ? AND item_type = ? AND card_id = ?`
              )
              .bind(userId, itemType, itemId)
          )
        }
      } else {
        statements.push(
          this.database
            .prepare(
              `INSERT INTO player_deferred_item_updates
                   (user_id, item_type, token_id, execute_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT (user_id, item_type, token_id)
                 DO UPDATE SET execute_at = excluded.execute_at`
            )
            .bind(userId, itemType, itemId, executeAt)
        )
      }
    }
    if (statements.length) await this.database.batch(statements)
    return true
  }

  async cardOwnership(userId: string): Promise<CardOwnershipResponse> {
    const [rows, pendingRows] = await Promise.all([
      this.listCardRows(userId),
      pendingConquestCards(this.database, userId)
    ])
    const unlockedByClass = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [cardClass, 0])
    ) as Record<string, number>
    const unlockedByFrame = Object.fromEntries(
      CARD_FRAMES.map(frame => [frame, 0])
    ) as Record<string, number>
    const unlockedByClassAndFrame = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [
        cardClass,
        Object.fromEntries(CARD_FRAMES.map(frame => [frame, 0]))
      ])
    ) as Record<string, Record<string, number>>
    const cardBalances: CardOwnershipResponse['cardBalances'] = {}
    const seenCards = new Set<number>()

    for (const row of rows) {
      if (
        !CARD_FRAMES.includes(row.item_type as (typeof CARD_FRAMES)[number])
      ) {
        continue
      }
      const cardClass = CARD_CLASS_BY_ID.get(row.card_id)
      if (!CARD_CLASSES.includes(cardClass as (typeof CARD_CLASSES)[number])) {
        continue
      }
      const activeClass = cardClass as (typeof CARD_CLASSES)[number]
      if (!cardBalances[row.card_id]) {
        cardBalances[row.card_id] = Object.fromEntries(
          CARD_FRAMES.map(frame => [frame, { balance: '0', isNew: false }])
        )
      }
      cardBalances[row.card_id][row.item_type] = {
        balance: String(row.balance),
        isNew: row.is_new === 1
      }
      unlockedByFrame[row.item_type]++
      unlockedByClassAndFrame[activeClass][row.item_type]++
      if (!seenCards.has(row.card_id)) {
        seenCards.add(row.card_id)
        unlockedByClass[activeClass]++
      }
    }

    const lockedByClass = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [
        cardClass,
        CARD_CLASS_TOTALS[cardClass] - unlockedByClass[cardClass]
      ])
    )
    const lockedByFrame = Object.fromEntries(
      CARD_FRAMES.map(frame => [
        frame,
        TOTAL_ACTIVE_CARDS - unlockedByFrame[frame]
      ])
    )
    const lockedByClassAndFrame = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [
        cardClass,
        Object.fromEntries(
          CARD_FRAMES.map(frame => [
            frame,
            CARD_CLASS_TOTALS[cardClass] -
              unlockedByClassAndFrame[cardClass][frame]
          ])
        )
      ])
    )
    const emptyClassCounts = () =>
      Object.fromEntries(CARD_CLASSES.map(cardClass => [cardClass, 0]))
    const emptyFrameCounts = () =>
      Object.fromEntries(CARD_FRAMES.map(frame => [frame, 0]))
    const emptyMatrix = () =>
      Object.fromEntries(
        CARD_CLASSES.map(cardClass => [cardClass, emptyFrameCounts()])
      )

    const pendingByClass = emptyClassCounts()
    const pendingByFrame = emptyFrameCounts()
    const pendingByClassAndFrame = emptyMatrix()
    let pendingCards = 0
    for (const pending of pendingRows) {
      for (const card of pending.cards) {
        const cardClass = CARD_CLASS_BY_ID.get(card.id)
        if (
          !CARD_CLASSES.includes(cardClass as (typeof CARD_CLASSES)[number])
        ) {
          continue
        }
        const activeClass = cardClass as (typeof CARD_CLASSES)[number]
        pendingCards++
        pendingByClass[activeClass]++
        pendingByFrame.SW_GOLD_CARDS++
        pendingByClassAndFrame[activeClass].SW_GOLD_CARDS++
      }
    }

    return {
      cardBalances,
      lockedCards: TOTAL_ACTIVE_CARDS - seenCards.size,
      lockedCardsByClass: lockedByClass,
      lockedCardsByFrame: lockedByFrame,
      lockedCardsByClassAndFrame: lockedByClassAndFrame,
      unlockedCards: seenCards.size,
      unlockedCardsByClass: unlockedByClass,
      unlockedCardsByFrame: unlockedByFrame,
      unlockedCardsByClassAndFrame: unlockedByClassAndFrame,
      pendingCards,
      pendingCardsByClass: pendingByClass,
      pendingCardsByFrame: pendingByFrame,
      pendingCardsByClassAndFrame: pendingByClassAndFrame
    }
  }

  private async backfillQuestPeriods(userId: string): Promise<void> {
    const statements = (
      ['DAILY', 'WEEKLY', 'SEASONAL'] as Quest['periodicity'][]
    ).map(periodicity =>
      this.database
        .prepare(
          `UPDATE player_quests SET period = ?, updated_at = ?
           WHERE user_id = ? AND periodicity = ? AND period = 0`
        )
        .bind(
          questPeriodAt(periodicity),
          new Date().toISOString(),
          userId,
          periodicity
        )
    )
    await this.database.batch(statements)
  }

  private async questRows(userId: string): Promise<QuestRow[]> {
    const result = await this.database
      .prepare(
        `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                epic_length, position, progress, target, reward_xp, periodicity,
                is_rerollable, is_new, status, active, period, rerolls
         FROM player_quests
         WHERE user_id = ? AND active = 1
         ORDER BY periodicity ASC, position ASC, rowid ASC`
      )
      .bind(userId)
      .all<QuestRow>()
    return result.results
  }

  private async questEligibility(userId: string): Promise<QuestEligibility> {
    const [profile, items] = await Promise.all([
      this.database
        .prepare(`SELECT level FROM player_profiles WHERE user_id = ?`)
        .bind(userId)
        .first<{ level: number }>(),
      this.database
        .prepare(
          `SELECT item_type, token_id FROM player_items
           WHERE user_id = ? AND balance > 0
             AND item_type IN ('SW_HERO', 'SW_BASE_CARDS',
                               'SW_SILVER_CARDS', 'SW_GOLD_CARDS')`
        )
        .bind(userId)
        .all<{ item_type: ItemType; token_id: number }>()
    ])
    if (!profile) throw new Error('player profile is missing')
    const ownedHeroes = new Set<string>()
    const ownedCards = new Set<number>()
    for (const item of items.results) {
      if (item.item_type === ('SW_HERO' as ItemType)) {
        const hero = HERO_BY_ID[item.token_id]
        if (hero) ownedHeroes.add(hero)
      } else {
        ownedCards.add(item.token_id)
      }
    }
    return { level: profile.level, ownedHeroes, ownedCards }
  }

  private async latestQuestRerolls(
    userId: string,
    periodicity: Quest['periodicity'],
    period: number
  ): Promise<number> {
    const row = await this.database
      .prepare(
        `SELECT rerolls FROM player_quests
         WHERE user_id = ? AND periodicity = ? AND period = ?
         ORDER BY rowid DESC LIMIT 1`
      )
      .bind(userId, periodicity, period)
      .first<{ rerolls: number }>()
    return row?.rerolls || 0
  }

  private async chooseQuestSpec(
    userId: string,
    periodicity: Quest['periodicity'],
    position: 1 | 2 | 3,
    eligibility: QuestEligibility,
    previousSpec?: SourceQuestSpec,
    retryWithoutPrevious = false
  ): Promise<SourceQuestSpec | undefined> {
    const period = questPeriodAt(periodicity)
    const used = await this.database
      .prepare(
        `SELECT quest_type FROM player_quests
         WHERE user_id = ? AND periodicity = ? AND period = ?`
      )
      .bind(userId, periodicity, period)
      .all<{ quest_type: Quest['questType'] }>()
    const usedInPeriod = new Set(used.results.map(row => row.quest_type))
    const exclusionsWithPrevious = new Set(usedInPeriod)
    if (previousSpec) exclusionsWithPrevious.add(previousSpec.questType)

    let candidates = sourceQuestCandidates({
      periodicity,
      position,
      level: eligibility.level,
      ownedHeroes: eligibility.ownedHeroes,
      ownedCards: eligibility.ownedCards,
      excludedQuestTypes: exclusionsWithPrevious,
      previousSpec
    })
    if (!candidates.length && previousSpec && retryWithoutPrevious) {
      candidates = sourceQuestCandidates({
        periodicity,
        position,
        level: eligibility.level,
        ownedHeroes: eligibility.ownedHeroes,
        ownedCards: eligibility.ownedCards,
        excludedQuestTypes: usedInPeriod
      })
    }
    return randomSourceQuestSpec(candidates)
  }

  private newQuestStatement(
    userId: string,
    spec: SourceQuestSpec,
    period: number,
    rerolls: number,
    options: {
      progress?: number
      status?: QuestRow['status']
      isNew?: number
      questKey?: string
      position?: 1 | 2 | 3
      periodicity?: Quest['periodicity']
      claimToken?: string
    } = {}
  ): { questKey: string; statement: D1PreparedStatement } {
    const questKey =
      options.questKey ||
      `source:${spec.numericalID}:${period}:${crypto.randomUUID()}`
    const progress = Math.min(
      options.progress ?? spec.startProgress,
      spec.endProgress
    )
    const status =
      options.status ||
      (spec.startProgress >= spec.endProgress ? 'complete' : 'active')
    const now = new Date().toISOString()
    return {
      questKey,
      statement: this.database
        .prepare(
          `INSERT INTO player_quests
             (user_id, quest_key, title, description, progress, target,
              reward_xp, status, created_at, updated_at, quest_type, epic_type,
              epic_index, epic_length, position, periodicity, is_rerollable,
              is_new, active, period, rerolls)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?
           WHERE ? IS NULL OR EXISTS (
             SELECT 1 FROM player_quest_claim_receipts
             WHERE claim_token = ?
           )`
        )
        .bind(
          userId,
          questKey,
          spec.name,
          spec.description,
          progress,
          spec.endProgress,
          spec.rewardXp,
          status,
          now,
          now,
          spec.questType,
          spec.epicType || null,
          spec.epicIndex ?? null,
          spec.epicLength ?? null,
          options.position ?? spec.position,
          options.periodicity ?? spec.periodicity,
          spec.rerollable && rerolls < 1 ? 1 : 0,
          options.isNew ?? 1,
          period,
          rerolls,
          options.claimToken || null,
          options.claimToken || null
        )
    }
  }

  private async ensureQuestLayout(userId: string): Promise<void> {
    await this.backfillQuestPeriods(userId)
    const eligibility = await this.questEligibility(userId)
    const active = await this.questRows(userId)

    for (const assignment of active) {
      const currentPeriod = questPeriodAt(assignment.periodicity)
      if (assignment.period >= currentPeriod) continue
      const spec = sourceQuestSpec(assignment.quest_type)
      if (!spec) continue

      const unfinishedEpic =
        spec.epicType &&
        spec.epicIndex !== undefined &&
        spec.epicLength !== undefined &&
        spec.epicIndex < spec.epicLength
      const dueToAutoReroll =
        assignment.status !== 'complete' &&
        (spec.rerollable || (assignment.status !== 'active' && !unfinishedEpic))
      const dueToCopy = !spec.rerollable && assignment.status === 'active'
      if (!dueToAutoReroll && !dueToCopy) continue

      const now = new Date().toISOString()
      if (dueToCopy) {
        const rerolls = await this.latestQuestRerolls(
          userId,
          assignment.periodicity,
          currentPeriod
        )
        const replacement = this.newQuestStatement(
          userId,
          spec,
          currentPeriod,
          rerolls,
          {
            progress: assignment.progress,
            status: assignment.status,
            isNew: assignment.is_new
          }
        )
        await this.database.batch([
          this.database
            .prepare(
              `UPDATE player_quests SET active = 0, updated_at = ?
               WHERE user_id = ? AND rowid = ? AND active = 1`
            )
            .bind(now, userId, assignment.row_id),
          replacement.statement
        ])
        continue
      }

      const replacementSpec = await this.chooseQuestSpec(
        userId,
        assignment.periodicity,
        assignment.position as 1 | 2 | 3,
        eligibility,
        spec,
        true
      )
      const statements = [
        this.database
          .prepare(
            `UPDATE player_quests SET active = 0, updated_at = ?
             WHERE user_id = ? AND rowid = ? AND active = 1`
          )
          .bind(now, userId, assignment.row_id)
      ]
      if (replacementSpec) {
        const rerolls = await this.latestQuestRerolls(
          userId,
          assignment.periodicity,
          currentPeriod
        )
        statements.push(
          this.newQuestStatement(
            userId,
            replacementSpec,
            currentPeriod,
            rerolls
          ).statement
        )
      }
      await this.database.batch(statements)
    }

    const occupied = new Set(
      (await this.questRows(userId)).map(
        row => `${row.periodicity}:${row.position}`
      )
    )
    for (const periodicity of [
      'DAILY',
      'WEEKLY',
      'SEASONAL'
    ] as Quest['periodicity'][]) {
      for (const position of [1, 2, 3] as const) {
        if (occupied.has(`${periodicity}:${position}`)) continue
        const spec = await this.chooseQuestSpec(
          userId,
          periodicity,
          position,
          eligibility
        )
        if (!spec) continue
        const period = questPeriodAt(periodicity)
        const rerolls = await this.latestQuestRerolls(
          userId,
          periodicity,
          period
        )
        await this.newQuestStatement(
          userId,
          spec,
          period,
          rerolls
        ).statement.run()
        occupied.add(`${periodicity}:${position}`)
      }
    }
  }

  async listQuests(userId: string): Promise<Quest[]> {
    await this.ensureQuestLayout(userId)
    return (await this.questRows(userId)).map(row => this.questFromRow(row))
  }

  async epicQuestChain(userId: string, epicType: EpicType): Promise<Quest[]> {
    if (epicType === ('UNKNOWN' as EpicType)) {
      throw new Error('epic type cannot be unknown')
    }
    const specs = SOURCE_QUEST_SPECS.filter(
      spec => spec.epicType === epicType
    ).sort((left, right) => (left.epicIndex ?? 0) - (right.epicIndex ?? 0))
    if (!specs.length) return []

    const assignments = await this.database
      .prepare(
        `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                epic_length, position, progress, target, reward_xp, periodicity,
                is_rerollable, is_new, status, active, period, rerolls
         FROM player_quests
         WHERE user_id = ? AND epic_type = ?
         ORDER BY rowid DESC`
      )
      .bind(userId, epicType)
      .all<QuestRow>()
    const active = assignments.results.find(row => row.active === 1)
    const activeIndex = active?.epic_index ?? null

    return specs.map(spec => {
      const assignment =
        activeIndex !== null && spec.epicIndex === activeIndex
          ? active
          : activeIndex !== null && (spec.epicIndex ?? 0) < activeIndex
            ? assignments.results.find(row => row.quest_type === spec.questType)
            : undefined
      if (assignment) return this.questFromRow(assignment)
      return {
        id: 0,
        position: spec.position,
        questType: spec.questType,
        ...(spec.epicType ? { epicType: spec.epicType } : {}),
        ...(spec.epicIndex !== undefined ? { epicIndex: spec.epicIndex } : {}),
        ...(spec.epicLength !== undefined
          ? { epicLength: spec.epicLength }
          : {}),
        progress: 0,
        endProgress: spec.endProgress,
        reward: { itemType: 'SW_XP' as ItemType, amount: spec.rewardXp },
        periodicity: spec.periodicity,
        isRerollable: spec.rerollable,
        isClaimable: false,
        isClaimed: false,
        isNew: false
      }
    })
  }

  async rerollQuest(
    userId: string,
    id: number
  ): Promise<{ quest: Quest; rewards: Array<Record<string, unknown>> }> {
    await this.ensureQuestLayout(userId)
    const assignment = await this.database
      .prepare(
        `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                epic_length, position, progress, target, reward_xp, periodicity,
                is_rerollable, is_new, status, active, period, rerolls
         FROM player_quests
         WHERE user_id = ? AND rowid = ? AND active = 1`
      )
      .bind(userId, id)
      .first<QuestRow>()
    if (!assignment)
      throw new Error(`quest assignment does not exist, ID: ${id}`)
    const previousSpec = sourceQuestSpec(assignment.quest_type)
    if (
      !previousSpec?.rerollable ||
      assignment.rerolls >= 1 ||
      assignment.status !== 'active'
    ) {
      throw new Error('no available re-roll')
    }

    const eligibility = await this.questEligibility(userId)
    const replacementSpec = await this.chooseQuestSpec(
      userId,
      assignment.periodicity,
      assignment.position as 1 | 2 | 3,
      eligibility,
      previousSpec
    )
    if (!replacementSpec) throw new Error('no replacement quest is available')

    const replacement = this.newQuestStatement(
      userId,
      replacementSpec,
      assignment.period,
      assignment.rerolls + 1
    )
    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE player_quests SET active = 0, updated_at = ?
           WHERE user_id = ? AND rowid = ? AND active = 1`
        )
        .bind(now, userId, assignment.row_id),
      this.database
        .prepare(
          `UPDATE player_quests
           SET rerolls = rerolls + 1, is_rerollable = 0, updated_at = ?
           WHERE user_id = ? AND period = ? AND periodicity = ? AND rerolls = ?`
        )
        .bind(
          now,
          userId,
          assignment.period,
          assignment.periodicity,
          assignment.rerolls
        ),
      replacement.statement
    ])
    const row = await this.database
      .prepare(
        `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                epic_length, position, progress, target, reward_xp, periodicity,
                is_rerollable, is_new, status, active, period, rerolls
         FROM player_quests WHERE user_id = ? AND quest_key = ?`
      )
      .bind(userId, replacement.questKey)
      .first<QuestRow>()
    if (!row) throw new Error('replacement quest was not created')
    return { quest: this.questFromRow(row), rewards: [] }
  }

  private questFromRow(row: QuestRow): Quest {
    return {
      id: row.row_id,
      position: row.position,
      questType: row.quest_type,
      ...(row.epic_type ? { epicType: row.epic_type } : {}),
      ...(row.epic_index !== null ? { epicIndex: row.epic_index } : {}),
      ...(row.epic_length !== null ? { epicLength: row.epic_length } : {}),
      progress: row.progress,
      endProgress: row.target,
      reward: { itemType: 'SW_XP' as ItemType, amount: row.reward_xp },
      periodicity: row.periodicity,
      isRerollable: row.is_rerollable === 1,
      isClaimable: row.status === 'complete',
      isClaimed: row.status === 'claimed',
      isNew: row.is_new === 1
    }
  }

  async claimQuestRewards(
    userId: string,
    ids: number[]
  ): Promise<{ quest: Quest | null; rewards: Array<Record<string, unknown>> }> {
    await this.backfillQuestPeriods(userId)
    const uniqueIds = [...new Set(ids)]
    if (!uniqueIds.length) return { quest: null, rewards: [] }

    const placeholders = uniqueIds.map(() => '?').join(',')
    const currentSeason = seasonFromDate()
    const assignmentsResult = await this.database
      .prepare(
        `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                epic_length, position, progress, target, reward_xp,
                periodicity, is_rerollable, is_new, status, active, period,
                rerolls
         FROM player_quests
         WHERE user_id = ? AND rowid IN (${placeholders})`
      )
      .bind(userId, ...uniqueIds)
      .all<QuestClaimRow>()

    const assignmentsById = new Map(
      assignmentsResult.results.map(assignment => [
        assignment.row_id,
        assignment
      ])
    )
    const assignments = uniqueIds.flatMap(id => {
      const assignment = assignmentsById.get(id)
      return assignment ? [assignment] : []
    })
    if (assignments.some(assignment => assignment.status !== 'complete')) {
      throw new Error('quest must be completed')
    }
    if (!assignments.length) return { quest: null, rewards: [] }

    let nextQuest: Quest | null = null
    let nextQuestKey: string | null = null
    const now = new Date().toISOString()
    const claimToken = crypto.randomUUID()
    const claimPlaceholders = assignments.map(() => '?').join(',')
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO player_quest_claim_batches
             (claim_token, user_id, assignment_count, status,
              ranked_constructed_before, claimed_at)
           SELECT ?, ?, ?, 'PREPARING', COALESCE((
             SELECT player_rank FROM player_account_stats
             WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
               AND season = ?
           ), 'UNRANKED'), ?
           WHERE (
             SELECT COUNT(*) FROM player_quests
             WHERE user_id = ? AND rowid IN (${claimPlaceholders})
               AND status = 'complete'
           ) = ?`
        )
        .bind(
          claimToken,
          userId,
          assignments.length,
          userId,
          currentSeason,
          now,
          userId,
          ...assignments.map(assignment => assignment.row_id),
          assignments.length
        )
    ]

    for (const [claimOrder, assignment] of assignments.entries()) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_quest_claim_receipts
               (user_id, quest_key, quest_row_id, claim_token, claim_order,
                reward_item_type, reward_xp, before_level, before_xp,
                after_level, after_xp, season,
                season_initial_account_level,
                season_achieved_account_level_before, claimed_at)
             SELECT quest.user_id, quest.quest_key, quest.rowid, ?, ?, 'SW_XP',
                    quest.reward_xp,
                    profile.level + CAST((profile.xp + COALESCE((
                      SELECT SUM(reward_xp) FROM player_quest_claim_receipts
                      WHERE claim_token = ? AND claim_order < ?
                    ), 0)) / 200 AS INTEGER),
                    (profile.xp + COALESCE((
                      SELECT SUM(reward_xp) FROM player_quest_claim_receipts
                      WHERE claim_token = ? AND claim_order < ?
                    ), 0)) % 200,
                    profile.level + CAST((profile.xp + COALESCE((
                      SELECT SUM(reward_xp) FROM player_quest_claim_receipts
                      WHERE claim_token = ? AND claim_order < ?
                    ), 0) + quest.reward_xp) / 200 AS INTEGER),
                    (profile.xp + COALESCE((
                      SELECT SUM(reward_xp) FROM player_quest_claim_receipts
                      WHERE claim_token = ? AND claim_order < ?
                    ), 0) + quest.reward_xp) % 200,
                    ?,
                    COALESCE(stats.initial_account_level,
                      MAX(0, profile.level - 1)),
                    COALESCE(stats.achieved_account_level,
                      MAX(0, profile.level - 1)),
                    ?
             FROM player_quests quest
             JOIN player_profiles profile ON profile.user_id = quest.user_id
             JOIN player_progression progression
               ON progression.user_id = quest.user_id
             LEFT JOIN player_skypass_season_stats stats
               ON stats.user_id = quest.user_id AND stats.season = ?
             WHERE quest.user_id = ? AND quest.rowid = ?
               AND quest.status = 'complete'
               AND EXISTS (
                 SELECT 1 FROM player_quest_claim_batches
                 WHERE claim_token = ? AND status = 'PREPARING'
               )`
          )
          .bind(
            claimToken,
            claimOrder,
            claimToken,
            claimOrder,
            claimToken,
            claimOrder,
            claimToken,
            claimOrder,
            claimToken,
            claimOrder,
            currentSeason,
            now,
            currentSeason,
            userId,
            assignment.row_id,
            claimToken
          )
      )

      if (
        assignment.epic_type &&
        assignment.epic_index !== null &&
        assignment.epic_length !== null &&
        assignment.epic_index < assignment.epic_length
      ) {
        const currentSpec = sourceQuestSpec(assignment.quest_type)
        const nextSpec = currentSpec
          ? nextSourceEpicSpec(currentSpec)
          : undefined
        if (!nextSpec) throw new Error('next quest has not been found')

        const nextStatus =
          nextSpec.startProgress >= nextSpec.endProgress ? 'complete' : 'active'
        const nextProgress = Math.min(
          nextSpec.startProgress,
          nextSpec.endProgress
        )
        const insertion = this.newQuestStatement(
          userId,
          nextSpec,
          assignment.period,
          assignment.rerolls,
          {
            progress: nextProgress,
            status: nextStatus,
            position: assignment.position as 1 | 2 | 3,
            periodicity: assignment.periodicity,
            claimToken
          }
        )
        nextQuestKey = insertion.questKey
        nextQuest = {
          id: 0,
          position: assignment.position,
          questType: nextSpec.questType,
          ...(nextSpec.epicType ? { epicType: nextSpec.epicType } : {}),
          ...(nextSpec.epicIndex !== undefined
            ? { epicIndex: nextSpec.epicIndex }
            : {}),
          ...(nextSpec.epicLength !== undefined
            ? { epicLength: nextSpec.epicLength }
            : {}),
          progress: nextProgress,
          endProgress: nextSpec.endProgress,
          reward: {
            itemType: 'SW_XP' as ItemType,
            amount: nextSpec.rewardXp
          },
          periodicity: assignment.periodicity,
          isRerollable: nextSpec.rerollable && assignment.rerolls < 1,
          isClaimable: nextStatus === 'complete',
          isClaimed: false,
          isNew: true
        }

        statements.push(
          this.database
            .prepare(
              `UPDATE player_quests
               SET status = 'claimed', active = 0, claimed_at = ?, rewards = ?,
                   updated_at = ?
               WHERE user_id = ? AND rowid = ? AND status = 'complete'
                 AND EXISTS (
                   SELECT 1 FROM player_quest_claim_receipts receipt
                   WHERE receipt.claim_token = ?
                     AND receipt.quest_key = player_quests.quest_key
                 )`
            )
            .bind(now, '[]', now, userId, assignment.row_id, claimToken),
          insertion.statement
        )
      } else {
        statements.push(
          this.database
            .prepare(
              `UPDATE player_quests
               SET status = 'claimed', active = ?, claimed_at = ?, rewards = ?,
                   updated_at = ?
               WHERE user_id = ? AND rowid = ? AND status = 'complete'
                 AND EXISTS (
                   SELECT 1 FROM player_quest_claim_receipts receipt
                   WHERE receipt.claim_token = ?
                     AND receipt.quest_key = player_quests.quest_key
                 )`
            )
            .bind(
              assignment.active,
              now,
              '[]',
              now,
              userId,
              assignment.row_id,
              claimToken
            )
        )
      }
    }

    statements.push(
      this.database
        .prepare(
          `UPDATE player_profiles
           SET level = (
                 SELECT after_level FROM player_quest_claim_receipts
                 WHERE claim_token = ? ORDER BY claim_order DESC LIMIT 1
               ),
               xp = (
                 SELECT after_xp FROM player_quest_claim_receipts
                 WHERE claim_token = ? ORDER BY claim_order DESC LIMIT 1
               ),
               next_level_xp = 200, updated_at = ?
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM player_quest_claim_receipts
             WHERE claim_token = ?
           )`
        )
        .bind(claimToken, claimToken, now, userId, claimToken),
      this.database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(basic_skypass_level, (
                 SELECT after_level FROM player_quest_claim_receipts
                 WHERE claim_token = ? ORDER BY claim_order DESC LIMIT 1
               )),
               basic_skypass_xp = (
                 SELECT after_xp FROM player_quest_claim_receipts
                 WHERE claim_token = ? ORDER BY claim_order DESC LIMIT 1
               ),
               basic_skypass_next_xp = 200,
               updated_at = ?
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM player_quest_claim_receipts
             WHERE claim_token = ?
           )`
        )
        .bind(claimToken, claimToken, now, userId, claimToken),
      this.database
        .prepare(
          `INSERT INTO player_skypass_season_stats
             (user_id, season, has_premium, created_at, updated_at,
              initial_account_level, achieved_account_level)
           SELECT first_receipt.user_id, ?, 0, ?, ?,
                  MAX(0, first_receipt.before_level - 1),
                  MAX(0, last_receipt.after_level - 1)
           FROM player_quest_claim_receipts first_receipt
           JOIN player_quest_claim_receipts last_receipt
             ON last_receipt.claim_token = first_receipt.claim_token
            AND last_receipt.claim_order = (
              SELECT MAX(claim_order) FROM player_quest_claim_receipts
              WHERE claim_token = first_receipt.claim_token
            )
           WHERE first_receipt.claim_token = ?
             AND first_receipt.claim_order = 0
           ON CONFLICT(user_id, season) DO UPDATE SET
             achieved_account_level = MAX(
               player_skypass_season_stats.achieved_account_level,
               excluded.achieved_account_level
             ),
             updated_at = excluded.updated_at`
        )
        .bind(currentSeason, now, now, claimToken)
    )

    const receiptSpan = `
      FROM player_invites invite
      JOIN player_quest_claim_receipts first_receipt
        ON first_receipt.claim_token = ? AND first_receipt.claim_order = 0
      JOIN player_quest_claim_receipts last_receipt
        ON last_receipt.claim_token = ?
       AND last_receipt.claim_order = (
         SELECT MAX(claim_order) FROM player_quest_claim_receipts
         WHERE claim_token = ?
       )
      WHERE invite.invitee_user_id = ?
        AND last_receipt.after_level > first_receipt.before_level`
    statements.push(
      this.database
        .prepare(
          `INSERT INTO player_friend_points
             (invitee_user_id, inviter_user_id, season, levels,
              points_carried, points_spent, updated_at)
           SELECT ?, invite.inviter_user_id, ?,
                  last_receipt.after_level - first_receipt.before_level,
                  0, 0, ?
           ${receiptSpan}
           ON CONFLICT(invitee_user_id, inviter_user_id, season)
           DO UPDATE SET
             levels = player_friend_points.levels + excluded.levels,
             updated_at = excluded.updated_at`
        )
        .bind(
          userId,
          currentSeason,
          now,
          claimToken,
          claimToken,
          claimToken,
          userId
        ),
      this.database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT invite.inviter_user_id, 'SW_STICKER_POINTS', 0,
                  last_receipt.after_level - first_receipt.before_level,
                  0, 'friend-level', ?, ?
           ${receiptSpan}
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET
             balance = player_items.balance + excluded.balance,
             updated_at = excluded.updated_at`
        )
        .bind(now, now, claimToken, claimToken, claimToken, userId)
    )

    for (const mode of ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'] as const) {
      const unlockGuard = `EXISTS (
        SELECT 1 FROM player_quest_claim_receipts receipt
        WHERE receipt.claim_token = ? AND receipt.claim_order = 0
          AND receipt.before_level = 1
      ) AND EXISTS (
        SELECT 1 FROM player_quest_claim_receipts receipt
        WHERE receipt.claim_token = ?
          AND receipt.after_level >= 2
      )`
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_account_stats
               (user_id, game_mode, season, created_at, updated_at)
             SELECT ?, ?, ?, ?, ? WHERE ${unlockGuard}`
          )
          .bind(userId, mode, currentSeason, now, now, claimToken, claimToken),
        this.database
          .prepare(
            `UPDATE player_account_stats
             SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
                 score = 0, player_rank_state = ?, updated_at = ?
             WHERE user_id = ? AND game_mode = ? AND season = ?
               AND player_rank = 'UNRANKED' AND ${unlockGuard}`
          )
          .bind(
            INITIAL_RANK_STATE_JSON,
            now,
            userId,
            mode,
            currentSeason,
            claimToken,
            claimToken
          )
      )
    }
    statements.push(
      this.database
        .prepare(
          `UPDATE player_quests
           SET rewards = (
             SELECT json_array(json_object(
               'accountID', 0,
               'type', 'EXP',
               'exp', json_object(
                 'amount', receipt.reward_xp,
                 'reason', 'RankUp',
                 'currentLevel', MAX(
                   receipt.season_achieved_account_level_before,
                   MAX(0, receipt.after_level - 1)
                 ) - receipt.season_initial_account_level,
                 'requiredExp', 200,
                 'beforeMatchExp', receipt.before_xp
               )
             ))
             FROM player_quest_claim_receipts receipt
             WHERE receipt.claim_token = ?
               AND receipt.quest_key = player_quests.quest_key
           )
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM player_quest_claim_receipts receipt
             WHERE receipt.claim_token = ?
               AND receipt.quest_key = player_quests.quest_key
           )`
        )
        .bind(claimToken, userId, claimToken),
      this.database
        .prepare(
          `UPDATE player_quest_claim_batches
           SET status = 'COMPLETED', completed_at = ?
           WHERE claim_token = ? AND status = 'PREPARING'`
        )
        .bind(now, claimToken)
    )
    await this.database.batch(statements)

    const [batch, receiptResult] = await Promise.all([
      this.database
        .prepare(
          `SELECT ranked_constructed_before
           FROM player_quest_claim_batches
           WHERE claim_token = ? AND status = 'COMPLETED'`
        )
        .bind(claimToken)
        .first<QuestClaimBatchRow>(),
      this.database
        .prepare(
          `SELECT reward_xp, before_level, before_xp, after_level, after_xp,
                  season, season_initial_account_level,
                  season_achieved_account_level_before
           FROM player_quest_claim_receipts
           WHERE claim_token = ? ORDER BY claim_order`
        )
        .bind(claimToken)
        .all<QuestClaimReceiptRow>()
    ])
    if (!batch || receiptResult.results.length !== assignments.length) {
      throw new Error('quest must be completed')
    }

    const rewards: Array<Record<string, unknown>> = receiptResult.results.map(
      receipt => ({
        accountID: 0,
        type: 'EXP',
        exp: {
          amount: receipt.reward_xp,
          reason: 'RankUp',
          currentLevel: effectiveSkypassSeasonLevel(
            receipt.season_initial_account_level,
            Math.max(
              receipt.season_achieved_account_level_before,
              Math.max(0, receipt.after_level - 1)
            )
          ),
          requiredExp: 200,
          beforeMatchExp: receipt.before_xp
        }
      })
    )
    const firstReceipt = receiptResult.results[0]
    const lastReceipt = receiptResult.results.at(-1)!
    if (
      firstReceipt.before_level === 1 &&
      lastReceipt.after_level >= 2 &&
      batch.ranked_constructed_before === 'UNRANKED'
    ) {
      rewards.push({
        accountID: 0,
        type: 'RANK',
        gameMode: 'RANKED_CONSTRUCTED',
        rank: {
          beforeMatch: {
            rank: 'UNRANKED',
            rankStage: 'STAGE_I',
            requiredRankPoints: 0,
            rankPosition: 0,
            score: 0,
            scoreAbove: 0,
            scoreBelow: 0
          },
          afterMatch: {
            rank: 'WANDERER',
            rankStage: 'STAGE_I',
            requiredRankPoints: 100,
            rankPosition: 0,
            score: 0,
            scoreAbove: 0,
            scoreBelow: 0
          }
        }
      })
    }

    if (nextQuest && nextQuestKey) {
      const row = await this.database
        .prepare(
          `SELECT rowid AS row_id FROM player_quests
           WHERE user_id = ? AND active = 1 AND quest_key = ?`
        )
        .bind(userId, nextQuestKey)
        .first<{ row_id: number }>()
      if (row) nextQuest.id = row.row_id
    }

    return { quest: nextQuest, rewards }
  }

  async setQuestsSeen(userId: string, ids: number[]): Promise<boolean> {
    if (!ids.length) return true
    const placeholders = ids.map(() => '?').join(',')
    await this.database
      .prepare(
        `UPDATE player_quests SET is_new = 0, updated_at = ?
         WHERE user_id = ? AND rowid IN (${placeholders})`
      )
      .bind(new Date().toISOString(), userId, ...ids)
      .run()
    return true
  }

  async listSkypassRewards(
    userId: string,
    season: number
  ): Promise<{ levels: SkypassLevel[]; hasPremium: boolean }> {
    const [profile, seasonStats] = await Promise.all([
      this.database
        .prepare(`SELECT level FROM player_profiles WHERE user_id = ?`)
        .bind(userId)
        .first<{ level: number }>(),
      this.database
        .prepare(
          `SELECT has_premium, initial_account_level, achieved_account_level
           FROM player_skypass_season_stats
           WHERE user_id = ? AND season = ?`
        )
        .bind(userId, season)
        .first<SkypassSeasonStatRow>()
    ])
    const fallbackSourceLevel =
      season === seasonFromDate() ? Math.max(0, (profile?.level ?? 1) - 1) : 0
    const initialAccountLevel =
      seasonStats?.initial_account_level ?? fallbackSourceLevel
    const achievedAccountLevel =
      seasonStats?.achieved_account_level ?? fallbackSourceLevel
    // Preserve SkypassSeasonStat.LevelProgress exactly: achieved - initial.
    const progress = effectiveSkypassSeasonLevel(
      initialAccountLevel,
      achievedAccountLevel
    )
    await this.materializeSkypassInfiniteRewards(season, progress + 1)

    const [rewardsResult, heroItems, titleItems, lockedStarterDecks] =
      await Promise.all([
        this.database
          .prepare(
            `SELECT reward.id, reward.level, reward.season, reward.tier,
                  reward.item_type, reward.amount, reward.is_starter,
                  reward.attributes, reward.is_infinite,
                  CASE WHEN claim.reward_id IS NULL THEN 0 ELSE 1 END AS claimed,
                  claim.rewards AS gained_rewards
           FROM skypass_reward_active_rewards reward
           LEFT JOIN player_skypass_claims claim
             ON claim.reward_id = reward.id AND claim.user_id = ?
           WHERE reward.season = ?
           ORDER BY reward.level ASC, reward.tier ASC, reward.is_starter DESC,
                    reward.id ASC`
          )
          .bind(userId, season)
          .all<SkypassRewardRow>(),
        this.database
          .prepare(
            `SELECT token_id FROM player_items
           WHERE user_id = ? AND item_type = 'SW_HERO'`
          )
          .bind(userId)
          .all<{ token_id: number }>(),
        this.database
          .prepare(
            `SELECT token_id FROM player_items
           WHERE user_id = ? AND item_type = 'SW_TITLES'`
          )
          .bind(userId)
          .all<{ token_id: number }>(),
        this.database
          .prepare(
            `SELECT deck_class FROM player_decks
           WHERE user_id = ? AND deck_type = 'LOCKED_STARTER'`
          )
          .bind(userId)
          .all<{ deck_class: string }>()
      ])
    const hasPremium = seasonStats?.has_premium === 1
    const ownedHeroes = new Set(heroItems.results.map(row => row.token_id))
    const ownedTitles = new Set(titleItems.results.map(row => row.token_id))
    const lockedDeckClasses = new Set(
      lockedStarterDecks.results.map(row => row.deck_class)
    )
    const rewards = rewardsResult.results
      .filter(row => !row.is_infinite || row.level <= progress + 1)
      // Source SkyPass listing hides an unclaimed Hero or Title reward when
      // its durable item already exists. A starter Hero remains visible while
      // its source starter deck is still locked; claimed rows always remain in
      // the season history even after their item/deck has been materialized.
      .filter(row => {
        if (row.claimed === 1) return true
        const tokenIds = parseAttributes(row.attributes)
          .tokenIDs.map(Number)
          .filter(Number.isSafeInteger)
        if (row.item_type === 500) {
          return !tokenIds.some(heroId => {
            if (!ownedHeroes.has(heroId)) return false
            const starterDeck = STARTER_DECK_BY_HERO_ID.get(heroId)
            return (
              starterDeck === undefined ||
              !lockedDeckClasses.has(starterDeck.deckClass)
            )
          })
        }
        if (row.item_type === 302) {
          return !tokenIds.some(titleId => ownedTitles.has(titleId))
        }
        return true
      })
      .flatMap<SkypassReward>(row => {
        let level = row.level
        if (row.is_starter === 1) {
          const adaptedLevel = row.level - initialAccountLevel
          if (adaptedLevel <= 0) {
            if (row.item_type !== 500 && row.item_type !== 302) return []
            level = 0
          } else {
            level = adaptedLevel
          }
        }
        return [
          {
            id: row.id,
            level,
            season: row.season,
            tier: (row.tier === 2
              ? 'PREMIUM'
              : 'FREE') as SkypassReward['tier'],
            itemType: ITEM_TYPE_BY_ID[row.item_type] || ('UNKNOWN' as ItemType),
            amount: row.amount,
            isStarter: row.is_starter === 1,
            isInfinite: row.is_infinite === 1,
            attributes: parseAttributes(row.attributes),
            claimable: row.tier === 1 || (row.tier === 2 && hasPremium),
            claimed: row.claimed === 1,
            ...(row.gained_rewards
              ? { gainedRewards: canonicalGainedRewards(row.gained_rewards) }
              : {})
          }
        ]
      })

    const grouped = new Map<number, SkypassReward[]>()
    for (const reward of rewards) {
      const levelRewards = grouped.get(reward.level) || []
      if (reward.tier === 'FREE') {
        const existingFree = levelRewards.findIndex(
          candidate => candidate.tier === 'FREE'
        )
        if (existingFree >= 0) {
          if (!reward.isStarter) continue
          levelRewards.splice(existingFree, 1)
        }
      }
      levelRewards.push(reward)
      grouped.set(reward.level, levelRewards)
    }

    return {
      hasPremium,
      levels: [...grouped.entries()]
        .sort(([left], [right]) => left - right)
        .map(([level, levelRewards]) => ({
          level,
          earned: level <= progress,
          rewards: levelRewards.sort((left, right) =>
            left.tier === right.tier ? 0 : left.tier === 'FREE' ? -1 : 1
          )
        }))
    }
  }

  private async materializeSkypassInfiniteRewards(
    season: number,
    expectedMaxInfiniteLevel: number
  ): Promise<void> {
    await this.database
      .prepare(
        `WITH RECURSIVE
           source AS (
             SELECT id, season, tier, item_type, amount, is_starter,
                    attributes, updated_by, is_infinite, policy_version
             FROM skypass_reward_active_rewards
             WHERE season = ? AND is_infinite = 1
               AND infinite_source_reward_id IS NULL
             ORDER BY tier ASC, id ASC
             LIMIT 1
           ),
           bounds AS (
             SELECT MAX(level) AS found_max
             FROM skypass_reward_active_rewards
             WHERE season = ? AND is_infinite = 1
           ),
           levels(level) AS (
             SELECT COALESCE(found_max, 0) + 1 FROM bounds
             UNION ALL
             SELECT level + 1 FROM levels
             WHERE level < ?
           )
         INSERT OR IGNORE INTO skypass_rewards
           (level, season, tier, item_type, amount, is_starter, attributes,
            updated_at, updated_by, is_infinite, policy_version,
            policy_ordinal, infinite_source_reward_id)
         SELECT levels.level, source.season, source.tier, source.item_type,
                source.amount, source.is_starter, source.attributes, NULL,
                source.updated_by, source.is_infinite, source.policy_version,
                NULL, source.id
         FROM levels CROSS JOIN source
         WHERE levels.level <= ?
           AND NOT EXISTS (
             SELECT 1 FROM skypass_reward_active_rewards existing
             WHERE existing.season = source.season
               AND existing.level = levels.level
           )`
      )
      .bind(season, season, expectedMaxInfiniteLevel, expectedMaxInfiniteLevel)
      .run()
  }

  async listSkypassRewardDefinitions(season: number): Promise<SkypassReward[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, level, season, tier, item_type, amount, is_starter,
                attributes, is_infinite
         FROM skypass_reward_active_rewards
         WHERE season = ? AND policy_ordinal IS NOT NULL
         ORDER BY level ASC, tier ASC, is_starter ASC, id ASC`
      )
      .bind(season)
      .all<SkypassDefinitionRow>()
    return rows.results.map<SkypassReward>(row => ({
      id: row.id,
      level: row.level,
      season: row.season,
      tier: (row.tier === 2 ? 'PREMIUM' : 'FREE') as SkypassReward['tier'],
      itemType: ITEM_TYPE_BY_ID[row.item_type] || ('UNKNOWN' as ItemType),
      amount: row.amount,
      isStarter: row.is_starter === 1,
      isInfinite: row.is_infinite === 1,
      attributes: parseAttributes(row.attributes),
      claimable: false,
      claimed: false
    }))
  }

  async hasSkypassPremium(
    accountReference: string,
    season: number
  ): Promise<boolean> {
    if (!(await this.accountReferenceExists(accountReference))) {
      throw notFound('account does not exist')
    }
    const userId = accountReference.slice('identity:'.length)
    const row = await this.database
      .prepare(
        `SELECT has_premium FROM player_skypass_season_stats
         WHERE user_id = ? AND season = ?`
      )
      .bind(userId, season)
      .first<{ has_premium: number }>()
    return row?.has_premium === 1
  }

  private cardCandidates(
    attributes: ReturnType<typeof parseAttributes>,
    season: number
  ): number[] {
    const cardSets = new Set(attributes.cardSets)
    const excludedSets = new Set(attributes.cardSetsExcluded)
    return allLibraryCards()
      .filter(card => card.validFromSeason <= season)
      .filter(card => !cardSets.size || cardSets.has(card.set))
      .filter(card => !excludedSets.has(card.set))
      .map(card => card.id)
      .sort((left, right) => left - right)
  }

  private gainSkypassItem(
    itemType: ItemType,
    tokenId: number,
    amount: number,
    grants: SkypassInventoryGrant[],
    stackable = true,
    unlockSource?: string,
    isNew: 0 | 1 = 1
  ): void {
    const normalizedStackable = stackable ? 1 : 0
    const existing = grants.find(
      grant => grant.itemType === itemType && grant.tokenId === tokenId
    )
    if (existing) {
      if (existing.stackable !== normalizedStackable) {
        throw new Error('SkyPass inventory grant has conflicting semantics')
      }
      if (stackable) existing.quantity += amount
      return
    }
    grants.push({
      itemType,
      tokenId,
      quantity: stackable ? amount : 1,
      stackable: normalizedStackable,
      ...(unlockSource ? { unlockSource } : {}),
      isNew
    })
  }

  private async applyBaseCardSkypassReward(
    userId: string,
    reward: RawSkypassRewardRow,
    deliveryKey: string,
    statements: D1PreparedStatement[],
    grants: SkypassInventoryGrant[]
  ): Promise<Array<Record<string, unknown>>> {
    const ownedResult = await this.database
      .prepare(`SELECT card_id FROM player_card_unlocks WHERE user_id = ?`)
      .bind(userId)
      .all<{ card_id: number }>()
    const owned = new Set(ownedResult.results.map(row => row.card_id))
    const attributes = parseAttributes(reward.attributes)
    const requestedTokenIds = attributes.tokenIDs
      .map(Number)
      .filter(Number.isSafeInteger)
    const amount = requestedTokenIds.length || reward.amount
    const candidates = this.cardCandidates(attributes, reward.season)
    const explicitCandidates = new Set(
      this.cardCandidates({ ...attributes, cardSets: [] }, reward.season)
    )
    const granted: number[] = []

    for (let index = 0; index < amount; index++) {
      const requested = requestedTokenIds[index]
      const cardId =
        requested !== undefined &&
        explicitCandidates.has(requested) &&
        !owned.has(requested)
          ? requested
          : candidates.find(candidate => !owned.has(candidate))
      if (cardId === undefined) continue

      const card = libraryCard(cardId)
      owned.add(cardId)
      granted.push(cardId)
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_card_unlocks
               (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
                item_type, is_new)
             SELECT ?, ?, ?, ?, ?, ?, 'SW_BASE_CARDS', 1
             WHERE EXISTS (
               SELECT 1 FROM player_skypass_claims
               WHERE user_id = ? AND reward_id = ? AND delivery_key = ?
             )`
          )
          .bind(
            userId,
            cardId,
            card.name,
            card.class,
            `skypass:${reward.id}`,
            new Date().toISOString(),
            userId,
            reward.id,
            deliveryKey
          )
      )
      this.gainSkypassItem(
        'SW_BASE_CARDS' as ItemType,
        cardId,
        1,
        grants,
        false,
        `skypass:${reward.id}`
      )
    }

    return granted.map(cardId =>
      rewardCard(cardId, 'SW_BASE_CARDS' as ItemType)
    )
  }

  private async applyHeroSkypassReward(
    userId: string,
    reward: RawSkypassRewardRow,
    deliveryKey: string,
    statements: D1PreparedStatement[],
    grants: SkypassInventoryGrant[]
  ): Promise<Array<Record<string, unknown>>> {
    const attributes = parseAttributes(reward.attributes)
    const heroIds = attributes.tokenIDs
      .map(Number)
      .filter(heroId => Number.isSafeInteger(heroId) && HERO_BY_ID[heroId])
    if (!heroIds.length) throw new Error('no heroes provided')

    const now = new Date().toISOString()
    const deckRewards: Array<Record<string, unknown>> = []
    const heroRewards: Array<Record<string, unknown>> = []

    for (const heroId of heroIds) {
      const deckClass = HERO_DECK_CLASS[heroId]
      this.gainSkypassItem(
        'SW_HERO' as ItemType,
        heroId,
        1,
        grants,
        false,
        `skypass:${reward.id}`
      )

      const starterDeck = STARTER_DECK_BY_HERO_ID.get(heroId)
      if (starterDeck) {
        statements.push(
          this.database
            .prepare(
              `UPDATE player_decks
               SET deck_type = 'UNLOCKED_STARTER', is_new = 1, updated_at = ?
               WHERE user_id = ? AND deck_class = ?
                 AND deck_type = 'LOCKED_STARTER'
                 AND EXISTS (
                   SELECT 1 FROM player_skypass_claims
                   WHERE user_id = ? AND reward_id = ? AND delivery_key = ?
                 )`
            )
            .bind(
              now,
              userId,
              starterDeck.deckClass,
              userId,
              reward.id,
              deliveryKey
            )
        )

        for (const cardId of starterDeck.cardIds) {
          const card = libraryCard(cardId)
          statements.push(
            this.database
              .prepare(
                `INSERT OR IGNORE INTO player_card_unlocks
                   (user_id, card_id, card_name, prism, unlock_source,
                    unlocked_at, item_type, is_new)
                 SELECT ?, ?, ?, ?, ?, ?, 'SW_BASE_CARDS', 0
                 WHERE EXISTS (
                   SELECT 1 FROM player_skypass_claims
                   WHERE user_id = ? AND reward_id = ? AND delivery_key = ?
                 )`
              )
              .bind(
                userId,
                cardId,
                card.name,
                starterDeck.key,
                `starter-deck:${starterDeck.deckClass}`,
                now,
                userId,
                reward.id,
                deliveryKey
              )
          )
          this.gainSkypassItem(
            'SW_BASE_CARDS' as ItemType,
            cardId,
            1,
            grants,
            false,
            `starter-deck:${starterDeck.deckClass}`,
            0
          )
        }

        deckRewards.push({
          accountID: 0,
          type: 'DECK',
          deck: {
            deckClass: starterDeck.deckClass,
            tokenIds: starterDeck.cardIds
          }
        })
      }

      heroRewards.push({
        accountID: 0,
        type: 'HERO',
        hero: { hero: HERO_BY_ID[heroId], deckClass }
      })
    }

    return [...deckRewards, ...heroRewards]
  }

  private applyConquestTicketSkypassReward(
    reward: RawSkypassRewardRow,
    grants: SkypassInventoryGrant[]
  ): Array<Record<string, unknown>> {
    this.gainSkypassItem(
      'SW_CONQUEST_TICKET' as ItemType,
      2,
      Math.max(1, reward.amount),
      grants,
      true,
      `skypass:${reward.id}`
    )
    return [{ accountID: 0, type: 'CONQUEST_TICKET' }]
  }

  private async applyStickerSkypassReward(
    reward: RawSkypassRewardRow,
    grants: SkypassInventoryGrant[]
  ): Promise<Array<Record<string, unknown>>> {
    const requested = [
      ...new Set(
        parseAttributes(reward.attributes)
          .tokenIDs.map(Number)
          .filter(Number.isSafeInteger)
      )
    ]
    if (!requested.length) throw new Error('no tokens provided')
    const placeholders = requested.map(() => '?').join(',')
    const result = await this.database
      .prepare(
        `SELECT DISTINCT token_id FROM content_stickers
         WHERE token_id IN (${placeholders})`
      )
      .bind(...requested)
      .all<{ token_id: number }>()
    const available = new Set(result.results.map(row => row.token_id))
    const stickerIds = requested.filter(tokenId => available.has(tokenId))
    if (!stickerIds.length) throw new Error('no stickers provided')
    for (const tokenId of stickerIds) {
      this.gainSkypassItem(
        'SW_STICKERS' as ItemType,
        tokenId,
        1,
        grants,
        true,
        `skypass:${reward.id}`
      )
    }
    return [{ accountID: 0, type: 'STICKER' }]
  }

  private applyStickerPointsSkypassReward(
    reward: RawSkypassRewardRow,
    grants: SkypassInventoryGrant[]
  ): Array<Record<string, unknown>> {
    if (reward.amount === 0) throw new Error('no amount provided')
    this.gainSkypassItem(
      'SW_STICKER_POINTS' as ItemType,
      0,
      reward.amount,
      grants,
      true,
      `skypass:${reward.id}`
    )
    return [
      { accountID: 0, type: 'STICKER_POINTS', stickerPoints: reward.amount }
    ]
  }

  private applySilverCardSkypassReward(
    userId: string,
    reward: RawSkypassRewardRow,
    grants: SkypassInventoryGrant[]
  ): Array<Record<string, unknown>> {
    const attributes = parseAttributes(reward.attributes)
    const requested = attributes.tokenIDs
      .map(Number)
      .filter(Number.isSafeInteger)
    const libraryIds = new Set(allLibraryCards().map(card => card.id))
    const amount = requested.length || reward.amount
    const candidates = this.cardCandidates(attributes, reward.season)
    const cardIds: number[] = []
    for (let index = 0; index < amount; index++) {
      const requestedId = requested[index]
      const cardId =
        requestedId !== undefined
          ? libraryIds.has(requestedId)
            ? requestedId
            : undefined
          : candidates.length
            ? candidates[
                stableRewardIndex(
                  `${userId}:${reward.id}:${index}`,
                  candidates.length
                )
              ]
            : undefined
      if (cardId === undefined) continue
      cardIds.push(cardId)
      this.gainSkypassItem(
        'SW_SILVER_CARDS' as ItemType,
        cardId,
        1,
        grants,
        true,
        `skypass:${reward.id}`
      )
    }
    if (!cardIds.length) throw new Error('no cards provided')
    return cardIds.map(cardId =>
      rewardCard(cardId, 'SW_SILVER_CARDS' as ItemType)
    )
  }

  private applyCardBackSkypassReward(
    reward: RawSkypassRewardRow,
    grants: SkypassInventoryGrant[]
  ): Array<Record<string, unknown>> {
    const cardBackIds = parseAttributes(reward.attributes)
      .tokenIDs.map(Number)
      .filter(Number.isSafeInteger)
    if (!cardBackIds.length) throw new Error('no card backs provided')
    for (const tokenId of cardBackIds) {
      this.gainSkypassItem(
        'SW_CARD_BACKS' as ItemType,
        tokenId,
        1,
        grants,
        true,
        `skypass:${reward.id}`
      )
    }
    return [{ accountID: 0, type: 'CARD_BACK' }]
  }

  private async applyTitleSkypassReward(
    userId: string,
    reward: RawSkypassRewardRow,
    grants: SkypassInventoryGrant[]
  ): Promise<Array<Record<string, unknown>>> {
    const titleIds = [
      ...new Set(
        parseAttributes(reward.attributes)
          .tokenIDs.map(Number)
          .filter(Number.isSafeInteger)
      )
    ]
    if (!titleIds.length) throw new Error('no tokens provided')
    const placeholders = titleIds.map(() => '?').join(',')
    const existing = await this.database
      .prepare(
        `SELECT token_id FROM player_items
         WHERE user_id = ? AND item_type = 'SW_TITLES'
           AND token_id IN (${placeholders})`
      )
      .bind(userId, ...titleIds)
      .all<{ token_id: number }>()
    const owned = new Set(existing.results.map(row => row.token_id))
    const granted = titleIds.filter(tokenId => !owned.has(tokenId))
    for (const tokenId of granted) {
      this.gainSkypassItem(
        'SW_TITLES' as ItemType,
        tokenId,
        1,
        grants,
        false,
        `skypass:${reward.id}`
      )
    }
    return granted.length ? [{ accountID: 0, type: 'TITLE' }] : []
  }

  async claimSkypassRewards(
    userId: string,
    ids: number[],
    options: { autoClaimSeason?: number; now?: Date } = {}
  ): Promise<Array<Record<string, unknown>>> {
    const uniqueIds = [...new Set(ids)]
    if (!uniqueIds.length) return []
    const placeholders = uniqueIds.map(() => '?').join(',')
    const rawResult = await this.database
      .prepare(
        `SELECT reward.id, reward.level, reward.season, reward.tier,
                reward.item_type, reward.amount, reward.is_starter,
                reward.attributes, reward.policy_version,
                policy.fulfillment_policy_hash AS reward_policy_hash
         FROM skypass_reward_active_rewards reward
         JOIN skypass_reward_active_policies policy
           ON policy.season = reward.season
          AND policy.version = reward.policy_version
         WHERE reward.id IN (${placeholders})`
      )
      .bind(...uniqueIds)
      .all<RawSkypassRewardRow>()

    const listedById = new Map<
      number,
      { reward: SkypassReward; earned: boolean }
    >()
    for (const season of [
      ...new Set(rawResult.results.map(row => row.season))
    ]) {
      const { levels } = await this.listSkypassRewards(userId, season)
      for (const level of levels) {
        for (const reward of level.rewards) {
          listedById.set(reward.id, { reward, earned: level.earned })
        }
      }
    }

    const rawById = new Map(rawResult.results.map(row => [row.id, row]))
    const gainedRewards: Array<Record<string, unknown>> = []
    const statements: D1PreparedStatement[] = []
    const now = (options.now ?? new Date()).toISOString()

    for (const id of uniqueIds) {
      const rawReward = rawById.get(id)
      if (!rawReward) continue
      const listed = listedById.get(id)
      if (!listed) throw new Error(`reward ID ${id}: reward not listed`)
      if (!listed.earned) throw new Error(`reward ID ${id}: reward not earned`)
      if (!listed.reward.claimable) {
        throw new Error(`reward ID ${id}: reward not claimable`)
      }
      if (listed.reward.claimed) {
        gainedRewards.push(
          ...((listed.reward.gainedRewards || []) as unknown as Array<
            Record<string, unknown>
          >)
        )
        continue
      }

      const itemType = ITEM_TYPE_BY_ID[rawReward.item_type]
      const deliveryKey = crypto.randomUUID()
      const rewardStatements: D1PreparedStatement[] = []
      const inventoryGrants: SkypassInventoryGrant[] = []
      const applied =
        itemType === ('SW_BASE_CARDS' as ItemType)
          ? await this.applyBaseCardSkypassReward(
              userId,
              rawReward,
              deliveryKey,
              rewardStatements,
              inventoryGrants
            )
          : itemType === ('SW_HERO' as ItemType)
            ? await this.applyHeroSkypassReward(
                userId,
                rawReward,
                deliveryKey,
                rewardStatements,
                inventoryGrants
              )
            : itemType === ('SW_CONQUEST_TICKET' as ItemType)
              ? this.applyConquestTicketSkypassReward(
                  rawReward,
                  inventoryGrants
                )
              : itemType === ('SW_STICKERS' as ItemType)
                ? await this.applyStickerSkypassReward(
                    rawReward,
                    inventoryGrants
                  )
                : itemType === ('SW_STICKER_POINTS' as ItemType)
                  ? this.applyStickerPointsSkypassReward(
                      rawReward,
                      inventoryGrants
                    )
                  : itemType === ('SW_SILVER_CARDS' as ItemType)
                    ? this.applySilverCardSkypassReward(
                        userId,
                        rawReward,
                        inventoryGrants
                      )
                    : itemType === ('SW_CARD_BACKS' as ItemType)
                      ? this.applyCardBackSkypassReward(
                          rawReward,
                          inventoryGrants
                        )
                      : itemType === ('SW_TITLES' as ItemType)
                        ? await this.applyTitleSkypassReward(
                            userId,
                            rawReward,
                            inventoryGrants
                          )
                        : (() => {
                            throw new Error(
                              `unsupported item type ${itemType || 'UNKNOWN'}`
                            )
                          })()
      gainedRewards.push(...applied)
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_skypass_claims
               (user_id, reward_id, rewards, claimed_at, delivery_key,
                auto_claim_season, application_status,
                inventory_grants_json, completed_at, reward_policy_version,
                reward_policy_hash)
             VALUES (?, ?, ?, ?, ?, ?, 'PREPARING', ?, NULL, ?, ?)`
          )
          .bind(
            userId,
            id,
            JSON.stringify(applied),
            now,
            deliveryKey,
            options.autoClaimSeason ?? null,
            JSON.stringify(inventoryGrants),
            rawReward.policy_version,
            rawReward.reward_policy_hash
          )
      )
      for (const grant of inventoryGrants) {
        statements.push(
          this.database
            .prepare(
              `INSERT INTO player_skypass_claim_inventory_grants
                 (user_id, reward_id, item_type, token_id, quantity,
                  stackable, before_balance, after_balance)
               SELECT claim.user_id, claim.reward_id, ?, ?, ?, ?,
                      COALESCE(item.balance, 0),
                      CASE ? WHEN 1 THEN COALESCE(item.balance, 0) + ?
                             ELSE MAX(COALESCE(item.balance, 0), 1) END
               FROM player_skypass_claims claim
               LEFT JOIN player_items item
                 ON item.user_id = claim.user_id
                AND item.item_type = ? AND item.token_id = ?
               WHERE claim.user_id = ? AND claim.reward_id = ?
                 AND claim.delivery_key = ?
                 AND claim.application_status = 'PREPARING'`
            )
            .bind(
              grant.itemType,
              grant.tokenId,
              grant.quantity,
              grant.stackable,
              grant.stackable,
              grant.quantity,
              grant.itemType,
              grant.tokenId,
              userId,
              id,
              deliveryKey
            ),
          this.database
            .prepare(
              `INSERT INTO player_items
                 (user_id, item_type, token_id, balance, is_new, unlock_source,
                  created_at, updated_at)
               SELECT claim.user_id, ?, ?, ?, ?, ?, ?, ?
               FROM player_skypass_claims claim
               WHERE claim.user_id = ? AND claim.reward_id = ?
                 AND claim.delivery_key = ?
                 AND claim.application_status = 'PREPARING'
               ON CONFLICT(user_id, item_type, token_id) DO UPDATE SET
                 balance = CASE ?
                   WHEN 1 THEN player_items.balance + excluded.balance
                   ELSE MAX(player_items.balance, 1)
                 END,
                 is_new = CASE ?
                   WHEN 1 THEN 1 ELSE player_items.is_new
                 END,
                 updated_at = excluded.updated_at
               WHERE ? = 1`
            )
            .bind(
              grant.itemType,
              grant.tokenId,
              grant.quantity,
              grant.isNew ?? 1,
              grant.unlockSource ?? `skypass:${rawReward.id}`,
              now,
              now,
              userId,
              id,
              deliveryKey,
              grant.stackable,
              grant.isNew ?? 1,
              grant.stackable
            )
        )
      }
      statements.push(...rewardStatements)
      statements.push(
        this.database
          .prepare(
            `UPDATE player_skypass_claims
             SET application_status = 'APPLIED', completed_at = claimed_at
             WHERE user_id = ? AND reward_id = ? AND delivery_key = ?
               AND application_status = 'PREPARING'`
          )
          .bind(userId, id, deliveryKey)
      )
    }

    if (statements.length) await this.database.batch(statements)
    return gainedRewards
  }

  async deckClassUnlockLevels(season: number): Promise<Record<string, number>> {
    const result = await this.database
      .prepare(
        `SELECT level, attributes FROM skypass_reward_active_rewards
         WHERE season = ? AND item_type = 500
         ORDER BY level ASC`
      )
      .bind(season)
      .all<{ level: number; attributes: string | null }>()
    const unlocks: Record<string, number> = {}
    for (const row of result.results) {
      for (const tokenId of parseAttributes(row.attributes).tokenIDs) {
        const deckClass = HERO_DECK_CLASS[Number(tokenId)]
        if (deckClass) unlocks[deckClass] = row.level
      }
    }
    return unlocks
  }

  async heroUnlockLevels(season: number): Promise<Record<string, number>> {
    const result = await this.database
      .prepare(
        `SELECT level, attributes FROM skypass_reward_active_rewards
         WHERE season = ? AND item_type = 500
         ORDER BY level ASC`
      )
      .bind(season)
      .all<{ level: number; attributes: string | null }>()
    const unlocks: Record<string, number> = {}
    for (const row of result.results) {
      for (const tokenId of parseAttributes(row.attributes).tokenIDs) {
        const hero = HERO_BY_ID[Number(tokenId)]
        if (hero) unlocks[hero] = row.level
      }
    }
    return unlocks
  }
}
