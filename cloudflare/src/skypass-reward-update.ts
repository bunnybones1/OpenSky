import type {
  CardSet,
  DeckClass,
  ItemType,
  SkypassReward,
  SkypassTier
} from '@opensky/proto'

import { allLibraryCards } from './card-library'
import { alreadyExists, invalidArgument } from './errors'
import { STARTER_DECK_BY_HERO_ID } from './starter-decks'

const MAX_CSV_BYTES = 1024 * 1024
const MAX_CSV_ROWS = 2000
const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 10_000

const TIER_ID: Record<string, number> = { FREE: 1, PREMIUM: 2 }
const ITEM_TYPE_ID: Record<string, number> = {
  USDC: 100,
  SW_BASE_CARDS: 300,
  SW_SKYPASS: 301,
  SW_TITLES: 302,
  SW_STICKER_POINTS: 303,
  SW_XP: 304,
  SW_SILVER_DUST: 400,
  SW_SILVER_CARDS: 401,
  SW_GOLD_CARDS: 402,
  SW_CONQUEST_TICKET: 403,
  SW_CRYSTALS: 404,
  SW_STICKERS: 405,
  SW_HERO_SKINS: 406,
  SW_CARD_BACKS: 407,
  SW_HERO: 500
}
const ITEM_TYPE_BY_ID = Object.fromEntries(
  Object.entries(ITEM_TYPE_ID).map(([name, id]) => [id, name])
) as Record<number, ItemType>
const CARD_SETS = new Set([
  'CORE_SET',
  'CORE_EXPANSION',
  'CLASH_OF_INVENTORS',
  'HEXBOUND_INVASION',
  'STARTER_EXPANSION'
])
const HERO_IDS = new Set(Array.from({ length: 15 }, (_, index) => index + 1))
const CARD_IDS = new Set(allLibraryCards().map(card => card.id))

interface RewardAttributes {
  tokenIDs?: number[]
  cardSets?: CardSet[]
  cardSetsExcluded?: CardSet[]
  unlockDeckClasses?: DeckClass[]
}

interface RewardRow {
  id: number
  level: number
  season: number
  tier: number
  item_type: number
  amount: number
  is_starter: number
  attributes: string | null
  is_infinite: number
}

interface ParsedReward {
  id?: number
  level: number
  season: number
  tier: number
  itemType: number
  amount: number
  isStarter: number
  attributes: RewardAttributes | null
  isInfinite: number
}

export type SkypassRewardFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

const parseAttributes = (value: string | null): RewardAttributes => {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as RewardAttributes
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const present = (row: RewardRow): SkypassReward => {
  const attributes = parseAttributes(row.attributes)
  return {
    id: row.id,
    level: row.level,
    season: row.season,
    tier: (row.tier === 2 ? 'PREMIUM' : 'FREE') as SkypassTier,
    itemType: ITEM_TYPE_BY_ID[row.item_type] || ('UNKNOWN' as ItemType),
    amount: row.amount,
    isStarter: row.is_starter === 1,
    isInfinite: row.is_infinite === 1,
    attributes: {
      tokenIDs: attributes.tokenIDs || [],
      cardSets: attributes.cardSets || [],
      cardSetsExcluded: attributes.cardSetsExcluded || [],
      unlockDeckClasses: attributes.unlockDeckClasses || []
    },
    claimable: false,
    claimed: false
  }
}

const semanticSnapshot = (reward: ParsedReward | RewardRow) => {
  const parsed = 'itemType' in reward
  const attributes = parsed
    ? reward.attributes || {}
    : parseAttributes(reward.attributes)
  return {
    level: reward.level,
    season: reward.season,
    tier: reward.tier,
    itemType: parsed ? reward.itemType : reward.item_type,
    amount: reward.amount,
    isStarter: parsed ? reward.isStarter === 1 : reward.is_starter === 1,
    attributes,
    isInfinite: parsed ? reward.isInfinite === 1 : reward.is_infinite === 1
  }
}

const parseCsv = (input: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closedQuote = false
  let rowHadSyntax = false

  const finishField = () => {
    row.push(field)
    field = ''
    closedQuote = false
  }
  const finishRow = () => {
    finishField()
    if (rowHadSyntax || row.some(value => value.length > 0)) rows.push(row)
    row = []
    rowHadSyntax = false
    if (rows.length > MAX_CSV_ROWS + 1) {
      throw invalidArgument(`SkyPass CSV exceeds ${MAX_CSV_ROWS} reward rows`)
    }
  }

  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
          closedQuote = true
        }
      } else if (char === '\r' && input[index + 1] === '\n') {
        field += '\n'
        index++
      } else {
        field += char
      }
      continue
    }
    if (closedQuote && char !== ',' && char !== '\r' && char !== '\n') {
      throw invalidArgument('SkyPass CSV contains characters after a quote')
    }
    if (char === '"') {
      if (field.length > 0 || closedQuote) {
        throw invalidArgument('SkyPass CSV contains an invalid quote')
      }
      quoted = true
      rowHadSyntax = true
    } else if (char === ',') {
      rowHadSyntax = true
      finishField()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index++
      finishRow()
    } else {
      field += char
      rowHadSyntax = true
    }
  }
  if (quoted) throw invalidArgument('SkyPass CSV contains an unterminated quote')
  if (rowHadSyntax || row.length || field.length) finishRow()
  if (!rows.length) throw invalidArgument('SkyPass CSV is empty')
  if (rows[0].length !== 8 || rows.slice(1).some(value => value.length !== 8)) {
    throw invalidArgument('SkyPass CSV must contain exactly eight columns')
  }
  if (rows.length === 1) {
    throw invalidArgument('SkyPass CSV must contain at least one reward')
  }
  return rows.slice(1)
}

const uint16 = (input: string, field: string, allowEmpty: boolean) => {
  const value = input.trim()
  if (!value) {
    if (allowEmpty) return 0
    throw invalidArgument(`${field} is empty`)
  }
  if (!/^\d+$/.test(value)) throw invalidArgument(`${field} is invalid`)
  // Match the source's ParseUint(..., 64) followed by uint16 conversion.
  const parsed = BigInt(value)
  if (parsed > 0xffff_ffff_ffff_ffffn) {
    throw invalidArgument(`${field} is invalid`)
  }
  return Number(BigInt.asUintN(16, parsed))
}

const tokenIds = (input: string) => {
  const values: number[] = []
  for (const value of input.trim().split(',')) {
    const trimmed = value.trim()
    if (!trimmed) continue
    if (!/^\d+$/.test(trimmed)) throw invalidArgument('token IDs are invalid')
    const parsed = BigInt(trimmed)
    if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw invalidArgument('token ID exceeds Cloud Weasel integer precision')
    }
    values.push(Number(parsed))
  }
  return values
}

const cardSets = (input: string, field: string) => {
  const values: CardSet[] = []
  for (const value of input.trim().split(',')) {
    const name = value.trim()
    if (!name) continue
    if (!CARD_SETS.has(name)) throw invalidArgument(`${field} is invalid`)
    values.push(name as CardSet)
  }
  return values
}

const sourceBool = (input: string) => {
  const value = input.trim()
  if (!value) return false
  if (['1', 't', 'T', 'TRUE', 'true', 'True'].includes(value)) return true
  if (['0', 'f', 'F', 'FALSE', 'false', 'False'].includes(value)) return false
  throw invalidArgument('is starter is invalid')
}

const allowedOriginSet = (input?: string) => {
  const origins = new Set<string>()
  for (const value of input?.split(',') || []) {
    const trimmed = value.trim()
    if (!trimmed) continue
    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      throw new Error('SKYPASS_REWARDS_ALLOWED_ORIGINS is invalid')
    }
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.origin !== trimmed.replace(/\/$/, '')
    ) {
      throw new Error('SKYPASS_REWARDS_ALLOWED_ORIGINS must contain HTTPS origins')
    }
    origins.add(parsed.origin)
  }
  return origins
}

const checkedUrl = (input: string, origins: Set<string>, base?: URL) => {
  let parsed: URL
  try {
    parsed = base ? new URL(input, base) : new URL(input)
  } catch {
    throw invalidArgument('SkyPass CSV URL is invalid')
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw invalidArgument('SkyPass CSV URL must use HTTPS without credentials')
  }
  if (!origins.has(parsed.origin)) {
    throw invalidArgument('SkyPass CSV origin is not allowed')
  }
  return parsed
}

const responseText = async (response: Response) => {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_CSV_BYTES) {
    throw invalidArgument(`SkyPass CSV exceeds ${MAX_CSV_BYTES} bytes`)
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_CSV_BYTES) {
      await reader.cancel()
      throw invalidArgument(`SkyPass CSV exceeds ${MAX_CSV_BYTES} bytes`)
    }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body)
  } catch {
    throw invalidArgument('SkyPass CSV is not valid UTF-8')
  }
}

const contentHash = async (text: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
}

export class SkypassRewardUpdateRepository {
  private readonly origins: Set<string>

  constructor(
    private readonly database: D1Database,
    private readonly fetcher: SkypassRewardFetch = fetch,
    allowedOrigins?: string
  ) {
    this.origins = allowedOriginSet(allowedOrigins)
  }

  private async download(input: string) {
    let url = checkedUrl(input, this.origins)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      for (let redirects = 0; ; redirects++) {
        let response: Response
        try {
          response = await this.fetcher(url, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal
          })
        } catch {
          throw invalidArgument('fetch SkyPass CSV failed')
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (redirects >= MAX_REDIRECTS) {
            throw invalidArgument('SkyPass CSV has too many redirects')
          }
          const location = response.headers.get('location')
          if (!location) throw invalidArgument('SkyPass CSV redirect is missing a location')
          url = checkedUrl(location, this.origins, url)
          continue
        }
        if (response.status !== 200) {
          throw invalidArgument(`fetch SkyPass CSV returned status ${response.status}`)
        }
        if (response.headers.get('content-type') !== 'text/csv') {
          throw invalidArgument('SkyPass CSV content type must be text/csv')
        }
        return { text: await responseText(response), origin: url.origin }
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async parse(season: number, text: string): Promise<ParsedReward[]> {
    const rewards: ParsedReward[] = []
    const identities = new Set<string>()
    for (const record of parseCsv(text)) {
      const level = uint16(record[0], 'level', false)
      const tierName = record[1].trim()
      const tier = TIER_ID[tierName]
      if (!tier) throw invalidArgument('tier is invalid')
      const itemTypeName = record[2].trim()
      const itemType = ITEM_TYPE_ID[itemTypeName]
      if (!itemType) throw invalidArgument('item type is invalid')
      const amount = uint16(record[3], 'amount', true)
      const isStarter = sourceBool(record[4])
      const ids = tokenIds(record[5])
      const included = cardSets(record[6], 'card sets')
      const excluded = cardSets(record[7], 'card sets excluded')
      if (amount === 0 && !ids.length) {
        throw invalidArgument('amount cannot be zero when without token IDs')
      }
      if (amount > 0 && ids.length) {
        throw invalidArgument('amount cannot be greater than zero when there are token IDs')
      }
      if (included.some(value => excluded.includes(value))) {
        throw invalidArgument('the same card set cannot be included and excluded')
      }
      if (isStarter && tier !== TIER_ID.FREE) {
        throw invalidArgument('only free tier can be a starter')
      }
      if (itemTypeName === 'SW_HERO') {
        if (!ids.length) throw invalidArgument('hero rewards require token IDs')
        if (ids.some(id => !HERO_IDS.has(id))) {
          throw invalidArgument('hero does not exist')
        }
      }
      if (itemTypeName === 'SW_CONQUEST_TICKET' && amount === 0) {
        throw invalidArgument('Conquest ticket amount cannot be zero')
      }
      if (itemTypeName === 'SW_STICKER_POINTS' && amount === 0) {
        throw invalidArgument('sticker points amount cannot be zero')
      }
      if (
        ['SW_BASE_CARDS', 'SW_SILVER_CARDS'].includes(itemTypeName) &&
        ids.some(id => !CARD_IDS.has(id))
      ) {
        throw invalidArgument('card does not exist')
      }
      if (itemTypeName === 'SW_CARD_BACKS' && !ids.length) {
        throw invalidArgument('card back rewards require token IDs')
      }
      if (itemTypeName === 'SW_STICKERS') {
        if (!ids.length) throw invalidArgument('sticker rewards require token IDs')
        const placeholders = ids.map(() => '?').join(', ')
        const found = await this.database
          .prepare(
            `SELECT COUNT(DISTINCT token_id) AS count FROM content_stickers
             WHERE token_id IN (${placeholders})`
          )
          .bind(...ids)
          .first<number>('count')
        if (found !== ids.length) throw invalidArgument('sticker does not exist')
      }
      const identity = `${level}:${tier}:${isStarter ? 1 : 0}`
      if (identities.has(identity)) throw invalidArgument('reward duplicated')
      identities.add(identity)
      const attributes: RewardAttributes = {}
      if (ids.length) attributes.tokenIDs = ids
      if (included.length) attributes.cardSets = included
      if (excluded.length) attributes.cardSetsExcluded = excluded
      if (itemTypeName === 'SW_HERO') {
        const unlocks = ids
          .map(id => STARTER_DECK_BY_HERO_ID.get(id)?.deckClass)
          .filter((value): value is DeckClass => !!value)
        if (unlocks.length) attributes.unlockDeckClasses = unlocks
      }
      rewards.push({
        level,
        season,
        tier,
        itemType,
        amount,
        isStarter: isStarter ? 1 : 0,
        attributes: Object.keys(attributes).length ? attributes : null,
        isInfinite: 0
      })
    }
    rewards[rewards.length - 1].isInfinite = 1
    return rewards
  }

  private async rows(season: number) {
    const rows = await this.database
      .prepare(
        `SELECT id, level, season, tier, item_type, amount, is_starter,
                attributes, is_infinite
         FROM skypass_rewards WHERE season = ?
         ORDER BY level ASC, tier ASC, is_starter ASC, id ASC`
      )
      .bind(season)
      .all<RewardRow>()
    return rows.results
  }

  async update(
    actorUserId: string,
    season: number,
    sourceUrl: string,
    at = new Date()
  ): Promise<SkypassReward[]> {
    if (!Number.isSafeInteger(season) || season < 1 || season > 65535) {
      throw invalidArgument('season is invalid')
    }
    if (typeof sourceUrl !== 'string' || !sourceUrl) {
      throw invalidArgument('url is required')
    }
    const downloaded = await this.download(sourceUrl)
    const rewards = await this.parse(season, downloaded.text)
    const hash = await contentHash(downloaded.text)
    const before = await this.rows(season)
    const claimed = await this.database
      .prepare(
        `SELECT 1 FROM player_skypass_claims claim
         JOIN skypass_rewards reward ON reward.id = claim.reward_id
         WHERE reward.season = ? LIMIT 1`
      )
      .bind(season)
      .first()
    if (claimed) throw invalidArgument('a claimed SkyPass season cannot be updated')

    const actorGameAccountId = await this.database
      .prepare('SELECT id FROM game_accounts WHERE user_id = ?')
      .bind(actorUserId)
      .first<number>('id')
    if (!actorGameAccountId) throw new Error('staff game account is missing')
    const expectedVersion =
      (await this.database
        .prepare('SELECT version FROM skypass_reward_update_versions WHERE season = ?')
        .bind(season)
        .first<number>('version')) || 0
    const version = expectedVersion + 1
    const mutationId = crypto.randomUUID()
    const timestamp = at.toISOString()

    const existingByIdentity = new Map<string, RewardRow>()
    for (const row of before) {
      existingByIdentity.set(`${row.level}:${row.tier}:${row.is_starter}`, row)
    }
    const retainedIds = new Set<number>()
    for (const reward of rewards) {
      const existing = existingByIdentity.get(
        `${reward.level}:${reward.tier}:${reward.isStarter}`
      )
      if (existing) {
        reward.id = existing.id
        retainedIds.add(existing.id)
      }
    }
    const activeMutation =
      `(SELECT mutation_id FROM skypass_reward_update_versions WHERE season = ?) = ?`
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO skypass_reward_update_versions
             (season, version, mutation_id, source_origin, content_sha256,
              reward_count, updated_by_user_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(season) DO UPDATE SET
             version = excluded.version,
             mutation_id = excluded.mutation_id,
             source_origin = excluded.source_origin,
             content_sha256 = excluded.content_sha256,
             reward_count = excluded.reward_count,
             updated_by_user_id = excluded.updated_by_user_id,
             updated_at = excluded.updated_at
           WHERE skypass_reward_update_versions.version = ?`
        )
        .bind(
          season,
          version,
          mutationId,
          downloaded.origin,
          hash,
          rewards.length,
          actorUserId,
          timestamp,
          expectedVersion
        )
    ]
    for (const reward of rewards) {
      const attributes = reward.attributes ? JSON.stringify(reward.attributes) : null
      if (reward.id) {
        statements.push(
          this.database
            .prepare(
              `UPDATE skypass_rewards
               SET level = ?, season = ?, tier = ?, item_type = ?, amount = ?,
                   is_starter = ?, attributes = ?, updated_at = ?, updated_by = ?,
                   is_infinite = ?
               WHERE id = ? AND ${activeMutation}`
            )
            .bind(
              reward.level,
              season,
              reward.tier,
              reward.itemType,
              reward.amount,
              reward.isStarter,
              attributes,
              timestamp,
              actorGameAccountId,
              reward.isInfinite,
              reward.id,
              season,
              mutationId
            )
        )
      } else {
        statements.push(
          this.database
            .prepare(
              `INSERT INTO skypass_rewards
                 (level, season, tier, item_type, amount, is_starter, attributes,
                  updated_at, updated_by, is_infinite)
               SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${activeMutation}`
            )
            .bind(
              reward.level,
              season,
              reward.tier,
              reward.itemType,
              reward.amount,
              reward.isStarter,
              attributes,
              timestamp,
              actorGameAccountId,
              reward.isInfinite,
              season,
              mutationId
            )
        )
      }
    }
    for (const stale of before.filter(row => !retainedIds.has(row.id))) {
      statements.push(
        this.database
          .prepare(`DELETE FROM skypass_rewards WHERE id = ? AND ${activeMutation}`)
          .bind(stale.id, season, mutationId)
      )
    }
    statements.push(
      this.database
        .prepare(
          `INSERT INTO staff_skypass_reward_audit
             (operation, season, version, actor_user_id, source_origin,
              content_sha256, before_json, after_json, created_at)
           SELECT 'REPLACE', ?, ?, ?, ?, ?, ?, ?, ? WHERE ${activeMutation}`
        )
        .bind(
          season,
          version,
          actorUserId,
          downloaded.origin,
          hash,
          JSON.stringify(before.map(semanticSnapshot)),
          JSON.stringify(rewards.map(semanticSnapshot)),
          timestamp,
          season,
          mutationId
        )
    )
    let results: D1Result[]
    try {
      results = await this.database.batch(statements)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Claimed SkyPass')) {
        throw invalidArgument('a claimed SkyPass season cannot be updated')
      }
      throw error
    }
    if (results[0].meta.changes !== 1) {
      throw alreadyExists('SkyPass reward definitions changed concurrently')
    }
    return (await this.rows(season)).map(present)
  }
}
