import {
  ConquestMatchResult,
  ConquestStatus,
  DeckClass,
  GameMode,
  Hero,
  type Conquest,
  type ConquestStats,
  type ConquestV2TreasureProgress
} from '@opensky/proto'

import { invalidArgument } from './errors'

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

interface ConquestRow {
  id: number
  user_id: string
  status: ConquestStatus
  nonce: number
  mode: GameMode
  hero: Hero
  deck_class: DeckClass
  match_progress: string
  created_at: string
  ended_at: string | null
}

const matchProgress = (value: string): Record<number, ConquestMatchResult> => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const result: Record<number, ConquestMatchResult> = {}
    for (const [key, entry] of Object.entries(parsed)) {
      if (
        /^\d+$/.test(key) &&
        [
          ConquestMatchResult.WIN,
          ConquestMatchResult.LOSS,
          ConquestMatchResult.DRAW
        ].includes(entry as ConquestMatchResult)
      ) {
        result[Number(key)] = entry as ConquestMatchResult
      }
    }
    return result
  } catch {
    return {}
  }
}

const conquest = (row: ConquestRow): Conquest => ({
  id: row.id,
  status: row.status,
  nonce: row.nonce,
  mode: row.mode,
  hero: row.hero,
  deckClass: row.deck_class,
  matchProgress: matchProgress(row.match_progress),
  createdAt: row.created_at,
  ...(row.ended_at ? { endedAt: row.ended_at } : {})
})

const rewardsForWins = (wins: number) => ({
  silver: wins === 1 ? 1 : wins === 2 ? 2 : wins === 3 ? 1 : 0,
  gold: wins === 3 ? 1 : 0
})

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
              match_progress, created_at)
           SELECT ?, ?, 'IN_PROGRESS', ?, 'CONQUEST_CONSTRUCTED', ?, ?, '{}', ?
           WHERE EXISTS (
             SELECT 1 FROM player_account_stats
             WHERE user_id = ?
               AND player_rank IN (
                 'TRAINEE', 'APPRENTICE', 'EXPERT', 'MASTER', 'GRANDWEAVER'
               )
           ) AND EXISTS (
             SELECT 1 FROM player_items
             WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
               AND token_id = 2 AND balance > 0
           )`
        )
        .bind(
          entryKey,
          userId,
          nonce?.nonce ?? 1,
          hero,
          deckClass,
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
        `SELECT id, user_id, status, nonce, mode, hero, deck_class,
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
        `SELECT id, user_id, status, nonce, mode, hero, deck_class,
                match_progress, created_at, ended_at
         FROM player_conquests WHERE user_id = ?
         ORDER BY created_at ASC, id ASC`
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
      const progress = Object.values(matchProgress(row.match_progress))
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
      result.discoveryWinRate =
        (discoveryWins / result.discoveryMatchesPlayed) * 100
    }
    if (result.constructedMatchesPlayed > 0) {
      result.constructedWinRate =
        (constructedWins / result.constructedMatchesPlayed) * 100
    }
    return result
  }

  async points(userId: string, eventId = 2) {
    const row = await this.database
      .prepare(
        `SELECT current_points, total_points FROM player_conquest_points
         WHERE user_id = ? AND event_id = ?`
      )
      .bind(userId, eventId)
      .first<{ current_points: number; total_points: number }>()
    return {
      current: row?.current_points ?? 0,
      total: row?.total_points ?? 0
    }
  }
}
