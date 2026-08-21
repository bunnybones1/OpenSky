import cardLibrary from '../../cloudflare/src/generated/card-library.json'
import { DeckClass, GameMode, MatchStatus, PlayerRank } from '@opensky/proto'
import {
  isRankedConstructedMatchModes,
  isRankedGameMode,
  storedMatchModes
} from '@opensky/shared/match-modes'

import {
  readAuthoritativeMatchDecks,
  type AuthoritativeMatchDeck
} from './authoritative-decks'
import {
  initialRankState,
  parseRankState,
  serializeRankState,
  updateRankState,
  type RankState,
  type RankingOutcome
} from './ranking'
import {
  applyMatchStats,
  RankPublicationPendingError,
  type MatchStatsReceipt
} from './progression'
import { applyConquestScores } from './conquest-score'

const LIBRARY_REVISION = cardLibrary.sourceSha256
const activeCardIds = new Set(cardLibrary.cards.map(card => card.id))
const RANK_ORDER: Record<PlayerRank, number> = {
  [PlayerRank.UNKNOWN]: 0,
  [PlayerRank.UNRANKED]: 1,
  [PlayerRank.WANDERER]: 2,
  [PlayerRank.TRAINEE]: 3,
  [PlayerRank.APPRENTICE]: 4,
  [PlayerRank.EXPERT]: 5,
  [PlayerRank.MASTER]: 6,
  [PlayerRank.GRANDWEAVER]: 7
}

interface MatchRow {
  mode: GameMode
  player1_mode: GameMode | null
  player2_mode: GameMode | null
  player1_user_id: string | null
  player2_user_id: string | null
}

interface RankRow {
  deck_string: string
  deck_class: DeckClass
  card_ids_json: string
  rank_state_json: string
  score: number
  highest_player_user_id: string | null
  win_count: number
  loss_count: number
  forfeit_count: number
  abandon_count: number
  tie_count: number
  created_at: string
}

interface PlayerStatsRow {
  player_rank: PlayerRank
}

interface MutableRank {
  deckString: string
  deckClass: DeckClass
  cardIds: number[]
  rankState: RankState
  score: number
  highestPlayerUserId: string | null
  winCount: number
  lossCount: number
  forfeitCount: number
  abandonCount: number
  tieCount: number
  createdAt: string
}

interface PersistedRank extends MutableRank {
  highestSeason: number
}

export interface DeckRankReceipt {
  applied: boolean
  deckStrings: [string | null, string | null]
  processedAt: string
}

export interface RankedSettlementReceipt {
  stats: MatchStatsReceipt
  deckRanks: DeckRankReceipt
}

const parseDeck = (
  deck: AuthoritativeMatchDeck,
  userId: string,
  processedAt: string
): MutableRank => {
  if (deck.cardIds.some(cardId => !activeCardIds.has(cardId))) {
    throw new Error('ranked authoritative deck contains an inactive card')
  }
  return {
    deckString: deck.deckString,
    deckClass: deck.deckClass,
    cardIds: [...deck.cardIds].sort((left, right) => left - right),
    rankState: initialRankState(),
    score: 0,
    highestPlayerUserId: userId,
    winCount: 0,
    lossCount: 0,
    forfeitCount: 0,
    abandonCount: 0,
    tieCount: 0,
    createdAt: processedAt
  }
}

const mutableRank = (row: RankRow): MutableRank => ({
  deckString: row.deck_string,
  deckClass: row.deck_class,
  cardIds: JSON.parse(row.card_ids_json) as number[],
  rankState: parseRankState(row.rank_state_json, row.score),
  score: row.score,
  highestPlayerUserId: row.highest_player_user_id,
  winCount: row.win_count,
  lossCount: row.loss_count,
  forfeitCount: row.forfeit_count,
  abandonCount: row.abandon_count,
  tieCount: row.tie_count,
  createdAt: row.created_at
})

const eligible = (rank: PlayerRank) =>
  (RANK_ORDER[rank] ?? 0) >= RANK_ORDER[PlayerRank.APPRENTICE]

const copyForPersistence = (
  rank: MutableRank,
  highestSeason: number
): PersistedRank => ({
  ...rank,
  cardIds: [...rank.cardIds],
  rankState: { ...rank.rankState },
  highestSeason
})

const rankInsert = (
  database: D1Database,
  rank: MutableRank,
  processedAt: string
) =>
  database
    .prepare(
      `INSERT OR IGNORE INTO player_deck_ranks
         (library_revision, deck_string, deck_class, card_ids_json,
          rank_state_json, score, highest_player_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
    )
    .bind(
      LIBRARY_REVISION,
      rank.deckString,
      rank.deckClass,
      JSON.stringify(rank.cardIds),
      serializeRankState(initialRankState()),
      rank.highestPlayerUserId,
      rank.createdAt,
      processedAt
    )

const rankUpdate = (
  database: D1Database,
  rank: PersistedRank,
  processedAt: string
) =>
  database
    .prepare(
      `UPDATE player_deck_ranks
       SET rank_state_json = ?, score = ?, win_count = ?, loss_count = ?,
           forfeit_count = ?, abandon_count = ?, tie_count = ?,
           highest_player_user_id = (
             SELECT wins.user_id FROM player_deck_rank_wins wins
             WHERE wins.library_revision = ? AND wins.deck_string = ?
               AND wins.season = ?
             ORDER BY wins.win_count DESC, wins.user_id ASC LIMIT 1
           ),
           updated_at = ?
       WHERE library_revision = ? AND deck_string = ?`
    )
    .bind(
      serializeRankState(rank.rankState),
      rank.score,
      rank.winCount,
      rank.lossCount,
      rank.forfeitCount,
      rank.abandonCount,
      rank.tieCount,
      LIBRARY_REVISION,
      rank.deckString,
      rank.highestSeason,
      processedAt,
      LIBRARY_REVISION,
      rank.deckString
    )

const storedReceipt = async (
  database: D1Database,
  proposalId: string,
  applied: boolean
): Promise<DeckRankReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT player1_deck_string, player2_deck_string, processed_at
       FROM multiplayer_match_deck_ranks_applied WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<{
      player1_deck_string: string | null
      player2_deck_string: string | null
      processed_at: string
    }>()
  return row
    ? {
        applied,
        deckStrings: [row.player1_deck_string, row.player2_deck_string],
        processedAt: row.processed_at
      }
    : undefined
}

/**
 * Faithful port of api/lib/decks/rank_updater.go. Calls must be serialized by
 * DeckRankCoordinator because the source mutates both Glicko states in order.
 */
export const applyDeckRanks = async (
  database: D1Database,
  proposalId: string,
  season: number,
  winner: 0 | 1 | undefined,
  status: MatchStatus,
  processedAt: string
): Promise<DeckRankReceipt> => {
  const existing = await storedReceipt(database, proposalId, false)
  if (existing) return existing
  if (!Number.isSafeInteger(season) || season < 1 || season > 10_000) {
    throw new Error('match season is invalid')
  }
  const match = await database
    .prepare(
      `SELECT mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  const modes = storedMatchModes(match)
  if (!isRankedConstructedMatchModes(modes)) {
    return { applied: false, deckStrings: [null, null], processedAt }
  }
  if (!match.player1_user_id || !match.player2_user_id) {
    throw new Error(
      'ranked constructed deck ranks require two identity players'
    )
  }

  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const authoritativeDecks = await readAuthoritativeMatchDecks(
    database,
    proposalId
  )
  const parsed = [
    parseDeck(authoritativeDecks[0], userIds[0], processedAt),
    parseDeck(authoritativeDecks[1], userIds[1], processedAt)
  ] as const
  const deckStrings: [string | null, string | null] = [
    parsed[0].deckString,
    parsed[1].deckString
  ]

  const uniqueDeckStrings = [
    ...new Set(deckStrings.filter(Boolean))
  ] as string[]
  const placeholders = uniqueDeckStrings.map(() => '?').join(',')
  const existingRows = uniqueDeckStrings.length
    ? await database
        .prepare(
          `SELECT deck_string, deck_class, card_ids_json, rank_state_json,
                  score, highest_player_user_id, win_count, loss_count,
                  forfeit_count, abandon_count, tie_count, created_at
           FROM player_deck_ranks
           WHERE library_revision = ? AND deck_string IN (${placeholders})`
        )
        .bind(LIBRARY_REVISION, ...uniqueDeckStrings)
        .all<RankRow>()
    : { results: [] as RankRow[] }
  const existingByDeckString = new Map(
    existingRows.results.map(row => [row.deck_string, row])
  )
  // The Go store returns separate records even for a mirror match. Keep two
  // working copies so draws save one tie (not two); winner matches explicitly
  // alias the copies below, exactly where the source does.
  const working = parsed.map(deck => {
    const row = existingByDeckString.get(deck.deckString)
    return row ? mutableRank(row) : deck
  }) as [MutableRank, MutableRank]
  const playerRanks = await Promise.all(
    userIds.map((userId, player) =>
      isRankedGameMode(modes[player])
        ? database
            .prepare(
              `SELECT player_rank FROM player_account_stats
               WHERE user_id = ? AND game_mode = ? AND season = ?`
            )
            .bind(userId, modes[player], season)
            .first<PlayerStatsRow>()
        : Promise.resolve({ player_rank: PlayerRank.UNKNOWN })
    )
  )
  if (!playerRanks[0] || !playerRanks[1]) {
    throw new Error('ranked account stats are missing')
  }

  // Source winner value 0 is a draw but still uses player one as the first
  // state transition; Cloud Weasel represents that value as undefined.
  const winnerPlayer: 0 | 1 = winner ?? 0
  const loserPlayer: 0 | 1 = winnerPlayer === 0 ? 1 : 0
  let winnerRank = working[winnerPlayer]
  let loserRank = working[loserPlayer]
  const saveWinner = eligible(playerRanks[winnerPlayer]!.player_rank)
  const saveLoser = eligible(playerRanks[loserPlayer]!.player_rank)

  if (winner === undefined) {
    if (winnerRank) winnerRank.tieCount++
    if (loserRank) loserRank.tieCount++
  } else {
    // Preserve the source aliasing behavior for mirror matches: one record gets
    // both counters and the ordered win-then-loss Glicko transitions.
    if (
      winnerRank &&
      loserRank &&
      winnerRank.deckString === loserRank.deckString
    ) {
      winnerRank = loserRank
    }
    if (winnerRank) winnerRank.winCount++
    if (loserRank) {
      if (status === MatchStatus.COMPLETED) loserRank.lossCount++
      if (status === MatchStatus.ABANDONED) {
        loserRank.lossCount++
        loserRank.abandonCount++
      }
      if (status === MatchStatus.FORFEITED) {
        loserRank.lossCount++
        loserRank.forfeitCount++
      }
    }
  }

  const persisted: PersistedRank[] = []
  if (winnerRank) {
    const outcome: RankingOutcome = winner === undefined ? 0.5 : 1
    if (loserRank) {
      winnerRank.rankState = updateRankState(
        outcome,
        winnerRank.rankState,
        loserRank.rankState
      )
      winnerRank.score = winnerRank.rankState.points
    }
    if (saveWinner) persisted.push(copyForPersistence(winnerRank, season))
  }
  if (loserRank) {
    const outcome: RankingOutcome = winner === undefined ? 0.5 : 0
    if (winnerRank) {
      loserRank.rankState = updateRankState(
        outcome,
        loserRank.rankState,
        winnerRank.rankState
      )
      loserRank.score = loserRank.rankState.points
    }
    if (saveLoser) persisted.push(copyForPersistence(loserRank, season))
  }

  const statements: D1PreparedStatement[] = []
  const inserts = new Map<string, MutableRank>()
  for (const deck of working) {
    if (deck) inserts.set(deck.deckString, deck)
  }
  for (const deck of inserts.values()) {
    statements.push(rankInsert(database, deck, processedAt))
  }
  if (
    winner !== undefined &&
    status === MatchStatus.COMPLETED &&
    winnerRank &&
    saveWinner
  ) {
    statements.push(
      database
        .prepare(
          `INSERT INTO player_deck_rank_wins
             (library_revision, deck_string, season, user_id, win_count, updated_at)
           VALUES (?, ?, ?, ?, 1, ?)
           ON CONFLICT(library_revision, deck_string, season, user_id)
           DO UPDATE SET win_count = win_count + 1, updated_at = excluded.updated_at`
        )
        .bind(
          LIBRARY_REVISION,
          winnerRank.deckString,
          season,
          userIds[winnerPlayer],
          processedAt
        )
    )
  }
  for (const rank of persisted) {
    statements.push(rankUpdate(database, rank, processedAt))
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_deck_ranks_applied
           (proposal_id, library_revision, player1_deck_string,
            player2_deck_string, processed_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        proposalId,
        LIBRARY_REVISION,
        deckStrings[0],
        deckStrings[1],
        processedAt
      )
  )
  await database.batch(statements)
  const stored = await storedReceipt(database, proposalId, true)
  if (!stored) throw new Error('deck rank receipt was not persisted')
  return stored
}

export class DeckRankCoordinator implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: { AUTH_DB: D1Database; INTERNAL_AUTH_SECRET: string }
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (
      request.method !== 'POST' ||
      request.headers.get('x-cloud-weasel-internal-auth') !==
        this.env.INTERNAL_AUTH_SECRET
    ) {
      return Response.json({ error: 'not found' }, { status: 404 })
    }
    return this.state.blockConcurrencyWhile(async () => {
      const body = (await request.json()) as {
        proposalId?: unknown
        season?: unknown
        winner?: unknown
        status?: unknown
        processedAt?: unknown
      }
      if (
        typeof body.proposalId !== 'string' ||
        typeof body.season !== 'number' ||
        ![undefined, 0, 1].includes(body.winner as undefined | number) ||
        !Object.values(MatchStatus).includes(body.status as MatchStatus) ||
        typeof body.processedAt !== 'string'
      ) {
        return Response.json(
          { error: 'invalid deck-rank request' },
          { status: 400 }
        )
      }
      // Player and deck ratings both depend on their immediately preceding
      // Glicko state. Keep them under one global coordinator lock and preserve
      // the source order: player stats first, then deck ranks.
      let stats: MatchStatsReceipt
      try {
        stats = await applyMatchStats(
          this.env.AUTH_DB,
          body.proposalId,
          body.season,
          body.winner as 0 | 1 | undefined,
          body.status as MatchStatus,
          body.processedAt
        )
      } catch (error) {
        if (error instanceof RankPublicationPendingError) {
          return Response.json(
            { error: 'waiting_for_match_publication' },
            { status: 409 }
          )
        }
        throw error
      }
      const deckRanks = await applyDeckRanks(
        this.env.AUTH_DB,
        body.proposalId,
        body.season,
        body.winner as 0 | 1 | undefined,
        body.status as MatchStatus,
        body.processedAt
      )
      // The source recalculates this rolling matchmaking score after saving
      // the match and deliberately treats a score failure as non-fatal.
      try {
        await applyConquestScores(
          this.env.AUTH_DB,
          body.proposalId,
          body.season,
          body.winner as 0 | 1 | undefined,
          body.status as MatchStatus,
          body.processedAt
        )
      } catch (error) {
        console.error('recalculate Conquest scores failed', error)
      }
      return Response.json({
        stats,
        deckRanks
      } satisfies RankedSettlementReceipt)
    })
  }
}
