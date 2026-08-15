import {
  ConquestMatchResult,
  ConquestStatus,
  DeckClass,
  GameMode,
  Hero,
  type Conquest,
  type ConquestStats,
  type ConquestV2TreasureProgress,
  type WeeklyGolds
} from '@opensky/proto'
import { parseConquestMatchProgress } from '@opensky/shared/conquest-progress'

import { sourceConquestWire } from './conquest-wire'
import { invalidArgument } from './errors'
import { goFloat32Percentage } from './go-numbers'

const HERO_DECK_CLASS: Partial<Record<Hero, DeckClass>> = {
  [Hero.ADA]: DeckClass.STR,
  [Hero.SAMYA]: DeckClass.AGY,
  [Hero.FOX]: DeckClass.STA,
  [Hero.LOTUS]: DeckClass.WIS,
  [Hero.TITUS]: DeckClass.STW,
  [Hero.IRIS]: DeckClass.AGW,
  [Hero.BOURAN]: DeckClass.HRT,
  [Hero.HORIK]: DeckClass.STH,
  [Hero.ZOEY]: DeckClass.HRA,
  [Hero.AXEL]: DeckClass.HRW,
  [Hero.ARI]: DeckClass.INT,
  [Hero.MIRA]: DeckClass.STI,
  [Hero.MAI]: DeckClass.AGI,
  [Hero.BANJO]: DeckClass.INW,
  [Hero.SITTI]: DeckClass.HRI
}

const TREASURE_TOTAL_POINTS = [
  0, 250, 750, 1_500, 2_500, 3_750, 5_250, 7_000, 9_000, 11_250, 13_750
] as const

export const LEGACY_CONQUEST_EVENT_ID = 1
export const CONQUEST_V2_EVENT_ID = 2

interface ConquestRow {
  id: number
  user_id: string
  status: ConquestStatus
  nonce: number
  mode: GameMode
  hero: Hero
  match_progress: string
  created_at: string
  ended_at: string | null
}

interface WeeklyGoldRow {
  starts_at: string
  ends_at: string
  card_id: number
  total_supply: number
}

const conquest = (row: ConquestRow): Conquest =>
  sourceConquestWire({
    id: row.id,
    status: row.status,
    nonce: row.nonce,
    mode: row.mode,
    hero: row.hero,
    // The source ConquestStatus RPC never reads a persisted deck class. It
    // derives the optional projection from the locked hero on every response.
    deckClass: HERO_DECK_CLASS[row.hero] ?? DeckClass.UNKNOWN_CLASS,
    matchProgress: parseConquestMatchProgress(row.match_progress),
    createdAt: row.created_at,
    endedAt: row.ended_at ?? undefined
  })

const rewardsForWins = (wins: number) => ({
  silver: wins === 1 ? 1 : wins === 2 ? 2 : wins === 3 ? 1 : 0,
  gold: wins === 3 ? 1 : 0
})

const conquestStatsResults = (value: string): unknown[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Conquest match progress is malformed')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Conquest match progress is malformed')
  }

  // ConquestStats uses PostgreSQL jsonb_object_keys/jsonb_each directly in
  // the source. It counts every raw object key and only the exact JSON string
  // "WIN" as a win; unlike ConquestStatus, it never decodes map[uint64].
  return Object.values(parsed)
}

export const conquestTreasureProgress = (
  currentPoints: number
): ConquestV2TreasureProgress => {
  const points = Math.max(0, Math.trunc(currentPoints))
  let level = TREASURE_TOTAL_POINTS.length - 1
  for (let index = 0; index < TREASURE_TOTAL_POINTS.length - 1; index++) {
    if (points < TREASURE_TOTAL_POINTS[index + 1]) {
      level = index
      break
    }
  }
  const accounted = TREASURE_TOTAL_POINTS[level]
  return {
    treasureLevel: level,
    treasurePoints: points - accounted,
    treasurePointsRequired:
      level < TREASURE_TOTAL_POINTS.length - 1
        ? TREASURE_TOTAL_POINTS[level + 1] - points
        : 0
  }
}

export class ConquestRepository {
  constructor(private readonly database: D1Database) {}

  async isDrainable(userId: string, mode: GameMode): Promise<boolean> {
    if (
      mode !== GameMode.CONQUEST_CONSTRUCTED &&
      mode !== GameMode.CONQUEST_DISCOVERY
    ) {
      return false
    }
    const row = await this.database
      .prepare(
        `SELECT 1
         FROM player_conquests conquest
         JOIN conquest_approved_queue_pools pool
           ON pool.version = conquest.reward_pool_version
         JOIN game_mode_status mode
           ON mode.game_mode = conquest.mode AND mode.enabled = 1
         WHERE conquest.user_id = ?
           AND conquest.status = 'IN_PROGRESS'
           AND conquest.mode = ?
           AND strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)
               IS conquest.created_at
           AND pool.starts_at <= conquest.created_at
           AND pool.ends_at >= conquest.created_at
         LIMIT 1`
      )
      .bind(userId, mode)
      .first()
    return Boolean(row)
  }

  async drainingModes(): Promise<Set<GameMode>> {
    const rows = await this.database
      .prepare(
        `SELECT DISTINCT conquest.mode
         FROM player_conquests conquest
         JOIN conquest_approved_queue_pools pool
           ON pool.version = conquest.reward_pool_version
         JOIN game_mode_status mode
           ON mode.game_mode = conquest.mode AND mode.enabled = 1
         WHERE conquest.status = 'IN_PROGRESS'
           AND conquest.mode IN (
             'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'
           )
           AND strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)
               IS conquest.created_at
           AND pool.starts_at <= conquest.created_at
           AND pool.ends_at >= conquest.created_at`
      )
      .all<{ mode: GameMode }>()
    return new Set(rows.results.map(row => row.mode))
  }

  async enter(userId: string, hero: Hero, at = new Date()): Promise<boolean> {
    const deckClass = HERO_DECK_CLASS[hero]
    if (hero === Hero.UNKNOWN) throw new Error('hero is missing')
    if (!deckClass) throw invalidArgument('hero is invalid')
    if (await this.status(userId)) return true

    const [rank, ticket, nonce] = await Promise.all([
      this.database
        .prepare(
          `SELECT 1 FROM player_account_stats
           WHERE user_id = ?
             AND player_rank IN (
               'TRAINEE', 'APPRENTICE', 'EXPERT', 'MASTER', 'GRANDWEAVER'
             )
           LIMIT 1`
        )
        .bind(userId)
        .first(),
      this.database
        .prepare(
          `SELECT balance FROM player_items
           WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
             AND token_id = 2 AND balance > 0`
        )
        .bind(userId)
        .first<{ balance: number }>(),
      this.database
        .prepare(
          `SELECT COALESCE(MAX(nonce), 0) + 1 AS nonce
           FROM player_conquests WHERE user_id = ?`
        )
        .bind(userId)
        .first<{ nonce: number }>()
    ])
    // EnterConquest intentionally maps state-manager failures to a generic
    // internal error in the source service. Plain errors preserve that wire
    // behavior through the shared RPC error boundary.
    if (!rank) throw new Error('the rank is too low')
    if (!ticket) throw new Error('not enough conquest tickets')

    const entryKey = crypto.randomUUID()
    const createdAt = at.toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_conquests
             (entry_key, user_id, status, nonce, mode, hero, deck_class,
              match_progress, created_at, reward_pool_version)
           SELECT ?, ?, 'IN_PROGRESS', ?, 'CONQUEST_CONSTRUCTED', ?, ?, '{}',
                  ?, verified.pool_version
           FROM conquest_verified_queue_pools verified
           JOIN conquest_approved_active_reward_pools approved
             ON approved.version = verified.pool_version
           WHERE verified.starts_at <= ? AND verified.ends_at >= ?
             AND EXISTS (
             SELECT 1 FROM player_account_stats
             WHERE user_id = ?
               AND player_rank IN (
                 'TRAINEE', 'APPRENTICE', 'EXPERT', 'MASTER', 'GRANDWEAVER'
               )
           ) AND EXISTS (
             SELECT 1 FROM player_items
             WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
               AND token_id = 2 AND balance > 0
           ) AND EXISTS (
             SELECT 1 FROM game_mode_status
             WHERE game_mode = 'CONQUEST_CONSTRUCTED' AND enabled = 1
           )
           ORDER BY verified.starts_at DESC, verified.pool_version DESC
           LIMIT 1`
        )
        .bind(
          entryKey,
          userId,
          nonce?.nonce ?? 1,
          hero,
          deckClass,
          createdAt,
          createdAt,
          createdAt,
          userId,
          userId
        ),
      this.database
        .prepare(
          `UPDATE player_items SET balance = balance - 1, updated_at = ?
           WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
             AND token_id = 2 AND balance > 0
             AND EXISTS (
               SELECT 1 FROM player_conquests WHERE entry_key = ?
             )`
        )
        .bind(createdAt, userId, entryKey)
    ])
    const inserted = await this.database
      .prepare('SELECT 1 FROM player_conquests WHERE entry_key = ?')
      .bind(entryKey)
      .first()
    if (inserted || (await this.status(userId))) return true
    throw new Error('enter conquest')
  }

  async status(userId: string): Promise<Conquest | null> {
    const row = await this.database
      .prepare(
        `SELECT id, user_id, status, nonce, mode, hero,
                match_progress, created_at, ended_at
         FROM player_conquests
         WHERE user_id = ? AND status = 'IN_PROGRESS'
         LIMIT 1`
      )
      .bind(userId)
      .first<ConquestRow>()
    return row ? conquest(row) : null
  }

  async stats(userId: string): Promise<
    Omit<ConquestStats, 'firstConquestMatchPlayed'> & {
      firstConquestMatchPlayed: string | null
    }
  > {
    const rows = await this.database
      .prepare(
        `SELECT id, user_id, status, nonce, mode, hero,
                match_progress, created_at, ended_at
         FROM player_conquests WHERE user_id = ?
         ORDER BY id ASC`
      )
      .bind(userId)
      .all<ConquestRow>()
    const result = {
      discoveryTicketsUsed: 0,
      constructedTicketsUsed: 0,
      discoveryMatchesPlayed: 0,
      constructedMatchesPlayed: 0,
      discoveryWinRate: 0,
      constructedWinRate: 0,
      discoverySilverCardsWon: 0,
      constructedSilverCardsWon: 0,
      discoveryGoldCardsWon: 0,
      constructedGoldCardsWon: 0,
      firstConquestMatchPlayed: rows.results[0]?.created_at ?? null
    }
    let discoveryWins = 0
    let constructedWins = 0
    for (const row of rows.results) {
      const progress = conquestStatsResults(row.match_progress)
      const wins = progress.filter(
        value => value === ConquestMatchResult.WIN
      ).length
      if (row.mode === GameMode.CONQUEST_DISCOVERY) {
        result.discoveryTicketsUsed++
        result.discoveryMatchesPlayed += progress.length
        discoveryWins += wins
        if (row.status === ConquestStatus.COMPLETED) {
          const reward = rewardsForWins(wins)
          result.discoverySilverCardsWon += reward.silver
          result.discoveryGoldCardsWon += reward.gold
        }
      } else {
        result.constructedTicketsUsed++
        result.constructedMatchesPlayed += progress.length
        constructedWins += wins
        if (row.status === ConquestStatus.COMPLETED) {
          const reward = rewardsForWins(wins)
          result.constructedSilverCardsWon += reward.silver
          result.constructedGoldCardsWon += reward.gold
        }
      }
    }
    if (result.discoveryMatchesPlayed > 0) {
      result.discoveryWinRate = goFloat32Percentage(
        discoveryWins,
        result.discoveryMatchesPlayed
      )
    }
    if (result.constructedMatchesPlayed > 0) {
      result.constructedWinRate = goFloat32Percentage(
        constructedWins,
        result.constructedMatchesPlayed
      )
    }
    return result
  }

  async points(userId: string, eventId: number, at = new Date()) {
    // Both source RPCs call FindOrCreateByAddressAndEventID before projecting
    // zero points. Preserve that state contract instead of synthesizing a
    // response for a row that does not exist.
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO player_conquest_points
           (user_id, event_id, current_points, total_points, updated_at)
         VALUES (?, ?, 0, 0, ?)`
      )
      .bind(userId, eventId, at.toISOString())
      .run()
    const row = await this.database
      .prepare(
        `SELECT current_points, total_points FROM player_conquest_points
         WHERE user_id = ? AND event_id = ?`
      )
      .bind(userId, eventId)
      .first<{ current_points: number; total_points: number }>()
    if (!row) throw new Error('Conquest points could not be created')
    return {
      current: row.current_points,
      total: row.total_points
    }
  }

  async rewards(at = new Date()): Promise<WeeklyGolds[]> {
    const timestamp = at.toISOString()
    const rows = await this.database
      .prepare(
        `SELECT pool.starts_at, pool.ends_at, cards.card_id,
                COALESCE(SUM(items.balance), 0) AS total_supply
         FROM conquest_approved_active_reward_pools pool
         JOIN conquest_reward_pool_cards cards
           ON cards.pool_version = pool.version
          AND cards.item_type = 'SW_GOLD_CARDS'
         LEFT JOIN player_items items
           ON items.item_type = 'SW_GOLD_CARDS'
          AND items.token_id = cards.card_id AND items.balance > 0
         WHERE pool.starts_at <= ? AND pool.ends_at >= ?
         GROUP BY pool.version, pool.starts_at, pool.ends_at, cards.card_id
         ORDER BY pool.starts_at DESC, pool.version DESC, cards.card_id`
      )
      .bind(timestamp, timestamp)
      .all<WeeklyGoldRow>()
    return rows.results.map(row => ({
      startAt: row.starts_at,
      endAt: row.ends_at,
      tokenId: (2 << 16) + row.card_id,
      totalSupply: row.total_supply
    }))
  }
}
