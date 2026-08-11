import type {
  Account,
  CardOwnershipResponse,
  Deck,
  DeckEquipment,
  FeedEvent,
  Item,
  ItemSupply,
  ItemSummary,
  ItemType,
  Page,
  Quest,
  SkypassLevel,
  SkypassReward
} from '@opensky/proto'
import {
  hasUnlockedRanked,
  INITIAL_RANK_STATE_JSON
} from '@opensky/shared/ranked-progression'

import {
  decodeDeckString,
  encodeDeckString,
  forceValidDeckClass,
  validateDeckClass
} from './deck-codec'
import { CompetitiveRepository } from './competitive'
import {
  alreadyExists,
  invalidArgument,
  notFound,
  permissionDenied
} from './errors'
import { seasonFromDate } from './legacy-seasons'
import {
  nextSourceEpicSpec,
  questPeriodAt,
  randomSourceQuestSpec,
  sourceQuestCandidates,
  sourceQuestSpec,
  type SourceQuestSpec
} from './quest-library'
import { identityReferenceFor } from './rpc-principal'
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

const ITEM_TYPE_ID = Object.fromEntries(
  Object.entries(ITEM_TYPE_BY_ID).map(([id, itemType]) => [itemType, Number(id)])
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

const HERO_DECK_CLASS: Record<number, string> = {
  1: 'STR',
  2: 'AGY',
  3: 'STA',
  4: 'WIS',
  5: 'STW',
  6: 'AGW',
  7: 'HRT',
  8: 'STH',
  9: 'HRA',
  10: 'HRW',
  11: 'INT',
  12: 'STI',
  13: 'AGI',
  14: 'INW',
  15: 'HRI'
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

const HEXBOUND_CARD_IDS = [
  30, 98, 125, 140, 1047, 1100, 1101, 1125, 3004, 3101, 3125, 3135, 4004, 4027,
  4101, 4124
]

const CARD_NAMES: Record<number, string> = {
  30: 'Treefolk Goliath',
  98: 'Mortal Blow',
  125: 'Oreheart Brawler',
  140: 'Stalwart Sentinel',
  1047: 'Songrider',
  1100: 'Disciple of Gusto',
  1101: "Samya's Speed",
  1125: 'Skyfire Master',
  3004: 'Grimlord',
  3101: "Bouran's Ethos",
  3125: 'Eclipse Mummy',
  3135: 'Royal Priestess',
  4004: 'Frigid Blizzard',
  4027: 'Mootichi',
  4101: "Ari's Insight",
  4124: 'Star Cetacean'
}

interface AccountRow {
  display_name: string
  account_name: string | null
  locale: string | null
  region: string | null
  tag_art_id: string | null
  title_id: number | null
  hide_player_names: number | null
  request_more_invites: number | null
  twitch_profile: string | null
  rename_locked_until: string | null
  spectate_code: string | null
  spectate_code_expires_at: string | null
  user_created_at: string
  profile_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  basic_skypass_level: number
  inviter_user_id: string | null
}

interface CardRow {
  row_id: number
  card_id: number
  prism: string
  item_type: ItemType
  unlocked_at: string
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

interface ProfileProgressRow {
  level: number
  xp: number
  basic_skypass_level: number
}

interface QuestEligibility {
  level: number
  ownedHeroes: Set<string>
  ownedCards: Set<number>
}

interface RankedStatusRow {
  game_mode: string
  player_rank: string
}

interface ProgressionRow {
  basic_skypass_level: number
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

const feedCursor = (cursor?: string) => {
  if (!cursor) return 0
  try {
    const decoded = JSON.parse(atob(cursor)) as { offset?: unknown }
    if (
      Number.isSafeInteger(decoded.offset) &&
      (decoded.offset as number) >= 0
    ) {
      return decoded.offset as number
    }
  } catch {
    // Fall through to the source-compatible invalid page error.
  }
  throw invalidArgument('page cursor is invalid')
}

const feedCursorFor = (offset: number) => btoa(JSON.stringify({ offset }))

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

const rewardTokenIds = (value: string) => {
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
  return { tokenIds, unlockedStarterDeck }
}

const prismClass = (prism: string): (typeof CARD_CLASSES)[number] => {
  const value = prism.slice(0, 3).toUpperCase()
  return CARD_CLASSES.includes(value as (typeof CARD_CLASSES)[number])
    ? (value as (typeof CARD_CLASSES)[number])
    : 'STR'
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

const cardClassForId = (cardId: number): string => {
  if (cardId >= 4000) return 'INT'
  if (cardId >= 3000) return 'HRT'
  if (cardId >= 2000) return 'WIS'
  if (cardId >= 1000) return 'AGY'
  return 'STR'
}

const rewardCard = (cardId: number, itemType: ItemType) => ({
  accountID: 0,
  type: 'CARD',
  card: {
    amount: 1,
    card: {
      id: cardId,
      name: CARD_NAMES[cardId] || `Card ${cardId}`,
      description: '',
      asset: '',
      class: cardClassForId(cardId),
      element: 'UNKNOWN',
      type: 'UNKNOWN',
      manaCost: 0,
      power: 0,
      health: 0,
      keywords: [],
      status: 'PLAY',
      set: 'UNKNOWN',
      imageURL: { small: '', medium: '', large: '' },
      itemType,
      isNew: true
    }
  }
})

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

    const [rankRows, skypassRows] = await Promise.all([
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
          `SELECT rowid AS row_id, rewards, claimed_at
           FROM player_skypass_claims
           WHERE user_id = ?`
        )
        .bind(userId)
        .all<SkypassFeedRow>()
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
          gameMode: row.game_mode,
          cards: [],
          heroes: []
        }) as unknown as FeedEvent
    )
    for (const row of skypassRows.results) {
      const { tokenIds, unlockedStarterDeck } = rewardTokenIds(row.rewards)
      if (tokenIds.length > 0) {
        events.push({
          id: row.row_id * 2 + 1,
          type: 'REWARD',
          createdAt: row.claimed_at,
          tokenIds,
          cards: [],
          heroes: []
        } as unknown as FeedEvent)
      } else if (unlockedStarterDeck) {
        events.push({
          id: row.row_id * 2 + 1,
          type: 'STARTED_DECK_UNLOCK',
          createdAt: row.claimed_at,
          cards: [],
          heroes: []
        } as unknown as FeedEvent)
      }
    }

    const requestedTypes = types?.length ? new Set(types) : undefined
    const filtered = events
      .filter(event => !requestedTypes || requestedTypes.has(event.type))
      .sort((left, right) => {
        const time = Date.parse(right.createdAt) - Date.parse(left.createdAt)
        return time || right.id - left.id
      })
    const size = feedPageSize(page)
    const offset = feedCursor(page?.before)
    const res = filtered.slice(offset, offset + size)
    const nextOffset = offset + res.length
    return {
      page: {
        pageSize: size,
        hasBefore: nextOffset < filtered.length,
        ...(nextOffset < filtered.length
          ? { after: feedCursorFor(nextOffset) }
          : {}),
        hasAfter: offset > 0
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
    const row = await this.database
      .prepare(
        `SELECT u.display_name,
                account.name AS account_name,
                account.locale,
                account.region,
                account.tag_art_id,
                account.title_id,
                account.hide_player_names,
                account.request_more_invites,
                account.twitch_profile,
                account.rename_locked_until,
                account.spectate_code,
                account.spectate_code_expires_at,
                u.created_at AS user_created_at,
                p.updated_at AS profile_updated_at,
                p.level,
                p.xp,
                p.next_level_xp,
                g.basic_skypass_level,
                invite.inviter_user_id
         FROM users u
         JOIN player_profiles p ON p.user_id = u.id
         JOIN player_progression g ON g.user_id = u.id
         LEFT JOIN player_account_settings account ON account.user_id = u.id
         LEFT JOIN player_invites invite ON invite.invitee_user_id = u.id
         WHERE u.id = ?`
      )
      .bind(userId)
      .first<AccountRow>()
    if (!row) return null

    return {
      id: 0,
      address: identityReferenceFor(userId),
      name: row.account_name || row.display_name,
      locale: row.locale || 'en',
      createdAt: row.user_created_at,
      updatedAt: row.profile_updated_at,
      experience: row.xp,
      warmUps: 0,
      level: row.level,
      seasonLevel: row.basic_skypass_level,
      levelUpXP: row.next_level_xp,
      stats,
      isBurnerWallet: false,
      ...(row.inviter_user_id
        ? { invitedBy: identityReferenceFor(row.inviter_user_id) }
        : {}),
      ...(row.region ? { region: row.region } : {}),
      ...(row.tag_art_id ? { tagArtID: row.tag_art_id } : {}),
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
    }
  }

  async getPrivateSpectateCode(
    userId: string,
    forceReset: boolean
  ): Promise<string> {
    const current = await this.database
      .prepare(
        `SELECT spectate_code, spectate_code_expires_at
         FROM player_account_settings
         WHERE user_id = ?`
      )
      .bind(userId)
      .first<{
        spectate_code: string | null
        spectate_code_expires_at: string | null
      }>()
    if (!current) throw new Error('player account settings are missing')

    const activeMatch = await this.database
      .prepare(
        `SELECT 1 FROM multiplayer_matches
         WHERE status = 'active'
           AND (player1_user_id = ? OR player2_user_id = ?)
         LIMIT 1`
      )
      .bind(userId, userId)
      .first()
    const expiresAt = current.spectate_code_expires_at
      ? Date.parse(current.spectate_code_expires_at)
      : Number.NaN
    const expired = !Number.isFinite(expiresAt) || expiresAt <= Date.now()
    const shouldReset =
      forceReset || !current.spectate_code || (!activeMatch && expired)

    if (!shouldReset) return current.spectate_code!

    const code = crypto.randomUUID()
    const expiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    await this.database
      .prepare(
        `UPDATE player_account_settings
         SET spectate_code = ?, spectate_code_expires_at = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .bind(code, expiry, new Date().toISOString(), userId)
      .run()
    return code
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

    return result.results.map(row => ({
      uuid: row.id,
      name: row.name,
      class: row.deck_class,
      deckString: row.deck_string,
      cardIds: parseNumberArray(row.card_ids),
      art: row.art,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isFavorite: row.favorited_at !== null,
      favoritedAt: row.favorited_at || '',
      deckType: row.deck_type,
      isNew: row.is_new === 1,
      conquestV2Points: row.conquest_v2_points
    }))
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
    if (page?.before && page.after) {
      throw invalidArgument('before and after cannot be used together')
    }

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
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
          right.uuid.localeCompare(left.uuid)
      )

    const pageSize = Math.min(
      200,
      Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
        ? page!.pageSize!
        : 20
    )
    const requestedOffset = page?.before
      ? feedCursor(page.before)
      : page?.after
        ? Math.max(0, feedCursor(page.after) - pageSize)
        : 0
    const offset = Math.min(requestedOffset, decks.length)
    const res = decks.slice(offset, offset + pageSize)
    const end = offset + res.length

    return {
      page: {
        pageSize,
        hasBefore: end < decks.length,
        hasAfter: offset > 0,
        ...(end < decks.length ? { before: feedCursorFor(end) } : {}),
        ...(offset > 0 ? { after: feedCursorFor(offset) } : {}),
        ...(page?.sort ? { sort: page.sort } : {})
      },
      res
    }
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
      if (!userId || !(await this.accountReferenceExists(request.accountAddress))) {
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
    const normalized = forceValidDeckClass(
      decoded.cardIds,
      decoded.deckClass
    )
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
      accountOwnsAllCards:
        normalized.cardIds.length === owned.results.length,
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
    await this.database
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
      .run()
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
    await this.database
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
      .run()
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
    await this.database
      .prepare(
        `UPDATE player_decks SET is_new = 0, updated_at = ?
         WHERE user_id = ? AND id = ? AND deck_type != 'LOCKED_STARTER'`
      )
      .bind(new Date().toISOString(), userId, uuid)
      .run()
    return true
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

  private async listCardRows(userId: string): Promise<CardRow[]> {
    await this.applyDeferredItemUpdates(userId)
    const result = await this.database
      .prepare(
        `SELECT rowid AS row_id, card_id, prism, item_type, unlocked_at, is_new
         FROM player_card_unlocks
         WHERE user_id = ?
         ORDER BY card_id ASC`
      )
      .bind(userId)
      .all<CardRow>()
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
      .map(row => ({
        id: row.id,
        itemType: row.item_type,
        tokenID: row.token_id,
        balance: String(row.balance),
        lastUpdateID: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isNew: row.is_new === 1
      }))
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
      summary[row.item_type] = {
        id: row.id,
        itemType: row.item_type,
        totalBalance: String(row.total_balance),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    }

    // Wallet balances are an optional future merge at this boundary. Preserve
    // the source key while reporting no connected-wallet USDC today.
    const now = new Date().toISOString()
    summary.USDC = {
      id: 0,
      itemType: 'USDC' as ItemType,
      totalBalance: '0',
      createdAt: now,
      updatedAt: now
    }
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
      supply[row.item_type] = {
        id: row.id,
        itemType: row.item_type,
        tokenID: tokenId,
        balance: String(row.total_balance),
        lastUpdateID: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
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
      [...new Set(itemIds)].map(async itemId => [
        itemId,
        await this.itemSupply(itemId)
      ] as const)
    )
    return Object.fromEntries(
      supplies.filter(([, supply]) => Object.keys(supply).length > 0)
    )
  }

  async itemSuppliesByType(
    itemTypes: ItemType[]
  ): Promise<Record<number, ItemSupply[]>> {
    if (itemTypes.length === 0) throw invalidArgument('itemTypes cannot be empty')
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
    return {
      id: row.id,
      itemType: row.item_type,
      tokenID: row.token_id,
      balance: String(row.balance),
      lastUpdateID: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isNew: row.is_new === 1
    }
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
      const typeCode = (tokenId & 0xff0000) >> 16
      const itemType = ITEM_TYPE_BY_TOKEN_CODE[typeCode]
      const itemId = tokenId & 0x00ffff
      if (!itemType) continue
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
    const rows = await this.listCardRows(userId)
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
      const cardClass = prismClass(row.prism)
      if (!cardBalances[row.card_id]) {
        cardBalances[row.card_id] = Object.fromEntries(
          CARD_FRAMES.map(frame => [frame, { balance: '0', isNew: false }])
        )
      }
      cardBalances[row.card_id][row.item_type] = {
        balance: '1',
        isNew: row.is_new === 1
      }
      unlockedByFrame[row.item_type]++
      unlockedByClassAndFrame[cardClass][row.item_type]++
      if (!seenCards.has(row.card_id)) {
        seenCards.add(row.card_id)
        unlockedByClass[cardClass]++
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
      pendingCards: 0,
      pendingCardsByClass: emptyClassCounts(),
      pendingCardsByFrame: emptyFrameCounts(),
      pendingCardsByClassAndFrame: emptyMatrix()
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
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
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
          rerolls
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
    const [assignmentsResult, progress, rankedStatuses] = await Promise.all([
      this.database
        .prepare(
          `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                  epic_length, position, progress, target, reward_xp,
                  periodicity, is_rerollable, is_new, status, active, period,
                  rerolls
           FROM player_quests
           WHERE user_id = ? AND rowid IN (${placeholders})`
        )
        .bind(userId, ...uniqueIds)
        .all<QuestClaimRow>(),
      this.database
        .prepare(
          `SELECT profile.level, profile.xp, progression.basic_skypass_level
           FROM player_profiles profile
           JOIN player_progression progression
             ON progression.user_id = profile.user_id
           WHERE profile.user_id = ?`
        )
        .bind(userId)
        .first<ProfileProgressRow>(),
      this.database
        .prepare(
          `SELECT game_mode, player_rank FROM player_account_stats
           WHERE user_id = ?
             AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
             AND season = ?`
        )
        .bind(userId, currentSeason)
        .all<RankedStatusRow>()
    ])
    if (!progress) throw new Error('player progression is missing')

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

    let level = progress.level
    let xp = progress.xp
    const rankedWasUnlocked = hasUnlockedRanked(level, xp)
    let nextQuest: Quest | null = null
    let nextQuestKey: string | null = null
    const now = new Date().toISOString()
    const rewards: Array<Record<string, unknown>> = []
    const statements: D1PreparedStatement[] = []

    for (const assignment of assignments) {
      const beforeXP = xp
      xp += assignment.reward_xp
      while (xp >= 200) {
        xp -= 200
        level++
      }

      const reward = {
        accountID: 0,
        type: 'EXP',
        exp: {
          amount: assignment.reward_xp,
          reason: 'RankUp',
          currentLevel: level,
          requiredExp: 200,
          beforeMatchExp: beforeXP
        }
      }
      rewards.push(reward)

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
            periodicity: assignment.periodicity
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
               WHERE user_id = ? AND rowid = ? AND status = 'complete'`
            )
            .bind(
              now,
              JSON.stringify([reward]),
              now,
              userId,
              assignment.row_id
            ),
          insertion.statement
        )
      } else {
        statements.push(
          this.database
            .prepare(
              `UPDATE player_quests
               SET status = 'claimed', active = ?, claimed_at = ?, rewards = ?,
                   updated_at = ?
               WHERE user_id = ? AND rowid = ? AND status = 'complete'`
            )
            .bind(
              assignment.active,
              now,
              JSON.stringify([reward]),
              now,
              userId,
              assignment.row_id
            )
        )
      }
    }

    statements.push(
      this.database
        .prepare(
          `UPDATE player_profiles
           SET level = ?, xp = ?, next_level_xp = 200, updated_at = ?
           WHERE user_id = ?`
        )
        .bind(level, xp, now, userId),
      this.database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(basic_skypass_level, ?),
               basic_skypass_xp = ?, basic_skypass_next_xp = 200,
               updated_at = ?
           WHERE user_id = ?`
        )
        .bind(level, xp, now, userId)
    )

    if (!rankedWasUnlocked && hasUnlockedRanked(level, xp)) {
      const rankByMode = new Map(
        rankedStatuses.results.map(status => [
          status.game_mode,
          status.player_rank
        ])
      )
      for (const mode of ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'] as const) {
        statements.push(
          this.database
            .prepare(
              `INSERT OR IGNORE INTO player_account_stats
                 (user_id, game_mode, season, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)`
            )
            .bind(userId, mode, currentSeason, now, now),
          this.database
            .prepare(
              `UPDATE player_account_stats
               SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
                   score = 0, player_rank_state = ?, updated_at = ?
               WHERE user_id = ? AND game_mode = ? AND season = ?
                 AND player_rank = 'UNRANKED'`
            )
            .bind(INITIAL_RANK_STATE_JSON, now, userId, mode, currentSeason)
        )
      }
      if (
        !rankByMode.has('RANKED_CONSTRUCTED') ||
        rankByMode.get('RANKED_CONSTRUCTED') === 'UNRANKED'
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
    }
    await this.database.batch(statements)

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
    const [rewardsResult, progression] = await Promise.all([
      this.database
        .prepare(
          `SELECT reward.id, reward.level, reward.season, reward.tier,
                  reward.item_type, reward.amount, reward.is_starter,
                  reward.attributes, reward.is_infinite,
                  CASE WHEN claim.reward_id IS NULL THEN 0 ELSE 1 END AS claimed,
                  claim.rewards AS gained_rewards
           FROM skypass_rewards reward
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
          `SELECT basic_skypass_level FROM player_progression WHERE user_id = ?`
        )
        .bind(userId)
        .first<ProgressionRow>()
    ])
    const progress = progression?.basic_skypass_level || 0
    const rewards = rewardsResult.results
      .filter(row => !row.is_infinite || row.level <= progress + 1)
      .map<SkypassReward>(row => ({
        id: row.id,
        level: row.level,
        season: row.season,
        tier: (row.tier === 2 ? 'PREMIUM' : 'FREE') as SkypassReward['tier'],
        itemType: ITEM_TYPE_BY_ID[row.item_type] || ('UNKNOWN' as ItemType),
        amount: row.amount,
        isStarter: row.is_starter === 1,
        isInfinite: row.is_infinite === 1,
        attributes: parseAttributes(row.attributes),
        claimable: row.tier === 1,
        claimed: row.claimed === 1,
        ...(row.gained_rewards
          ? { gainedRewards: JSON.parse(row.gained_rewards) }
          : {})
      }))

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
      hasPremium: false,
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

  private cardCandidates(
    attributes: ReturnType<typeof parseAttributes>
  ): number[] {
    const cardSets = new Set(attributes.cardSets)
    const excludedSets = new Set(attributes.cardSetsExcluded)
    if (cardSets.has('HEXBOUND_INVASION')) return HEXBOUND_CARD_IDS

    const broadPool = Array.from({ length: 164 }, (_, index) => index + 1)
    return excludedSets.has('HEXBOUND_INVASION')
      ? broadPool.filter(cardId => !HEXBOUND_CARD_IDS.includes(cardId))
      : [...broadPool, ...HEXBOUND_CARD_IDS]
  }

  private async applyBaseCardSkypassReward(
    userId: string,
    reward: RawSkypassRewardRow,
    statements: D1PreparedStatement[]
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
    const candidates = this.cardCandidates(attributes)
    const granted: number[] = []

    for (let index = 0; index < amount; index++) {
      const requested = requestedTokenIds[index]
      const cardId =
        requested !== undefined && !owned.has(requested)
          ? requested
          : candidates.find(candidate => !owned.has(candidate))
      if (cardId === undefined) continue

      owned.add(cardId)
      granted.push(cardId)
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_card_unlocks
               (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
                item_type, is_new)
             VALUES (?, ?, ?, ?, ?, ?, 'SW_BASE_CARDS', 1)`
          )
          .bind(
            userId,
            cardId,
            CARD_NAMES[cardId] || `Card ${cardId}`,
            cardClassForId(cardId),
            `skypass:${reward.id}`,
            new Date().toISOString()
          )
      )
      const now = new Date().toISOString()
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             VALUES (?, 'SW_BASE_CARDS', ?, 1, 1, ?, ?, ?)`
          )
          .bind(userId, cardId, `skypass:${reward.id}`, now, now)
      )
    }

    return granted.map(cardId =>
      rewardCard(cardId, 'SW_BASE_CARDS' as ItemType)
    )
  }

  private async applyHeroSkypassReward(
    userId: string,
    reward: RawSkypassRewardRow,
    statements: D1PreparedStatement[]
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
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             VALUES (?, 'SW_HERO', ?, 1, 1, ?, ?, ?)`
          )
          .bind(userId, heroId, `skypass:${reward.id}`, now, now)
      )

      const starterDeck = STARTER_DECK_BY_HERO_ID.get(heroId)
      if (starterDeck) {
        statements.push(
          this.database
            .prepare(
              `UPDATE player_decks
               SET deck_type = 'UNLOCKED_STARTER', is_new = 1, updated_at = ?
               WHERE user_id = ? AND deck_class = ?
                 AND deck_type = 'LOCKED_STARTER'`
            )
            .bind(now, userId, starterDeck.deckClass)
        )

        for (const cardId of starterDeck.cardIds) {
          statements.push(
            this.database
              .prepare(
                `INSERT OR IGNORE INTO player_card_unlocks
                   (user_id, card_id, card_name, prism, unlock_source,
                    unlocked_at, item_type, is_new)
                 VALUES (?, ?, ?, ?, ?, ?, 'SW_BASE_CARDS', 0)`
              )
              .bind(
                userId,
                cardId,
                CARD_NAMES[cardId] || `Card ${cardId}`,
                starterDeck.key,
                `starter-deck:${starterDeck.deckClass}`,
                now
              )
          )
          statements.push(
            this.database
              .prepare(
                `INSERT OR IGNORE INTO player_items
                   (user_id, item_type, token_id, balance, is_new, unlock_source,
                    created_at, updated_at)
                 VALUES (?, 'SW_BASE_CARDS', ?, 1, 0, ?, ?, ?)`
              )
              .bind(
                userId,
                cardId,
                `starter-deck:${starterDeck.deckClass}`,
                now,
                now
              )
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

  async claimSkypassRewards(
    userId: string,
    ids: number[]
  ): Promise<Array<Record<string, unknown>>> {
    const uniqueIds = [...new Set(ids)]
    if (!uniqueIds.length) return []
    const placeholders = uniqueIds.map(() => '?').join(',')
    const rawResult = await this.database
      .prepare(
        `SELECT id, level, season, tier, item_type, amount, is_starter,
                attributes
         FROM skypass_rewards
         WHERE id IN (${placeholders})`
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
    const now = new Date().toISOString()

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
      const applied =
        itemType === ('SW_BASE_CARDS' as ItemType)
          ? await this.applyBaseCardSkypassReward(userId, rawReward, statements)
          : itemType === ('SW_HERO' as ItemType)
            ? await this.applyHeroSkypassReward(userId, rawReward, statements)
            : (() => {
                throw new Error(
                  `unsupported item type ${itemType || 'UNKNOWN'}`
                )
              })()
      gainedRewards.push(...applied)
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_skypass_claims
               (user_id, reward_id, rewards, claimed_at)
             VALUES (?, ?, ?, ?)`
          )
          .bind(userId, id, JSON.stringify(applied), now)
      )
    }

    if (statements.length) await this.database.batch(statements)
    return gainedRewards
  }

  async deckClassUnlockLevels(season: number): Promise<Record<string, number>> {
    const result = await this.database
      .prepare(
        `SELECT level, attributes FROM skypass_rewards
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
        `SELECT level, attributes FROM skypass_rewards
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
