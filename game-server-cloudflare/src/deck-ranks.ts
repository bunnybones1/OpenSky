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
  publishedGrandweaverJob,
  RankPublicationPendingError,
  runPublishedGrandweaverJob,
  type GrandweaverJobReceipt,
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

interface TerminalMatchRow extends MatchRow {
  status: string
  winner_player: number | null
  result_json: string | null
}

interface DeckRankJobRow {
  proposal_id: string
  library_revision: string
  season: number
  status: 'PENDING' | 'APPLIED' | 'FAILED'
  attempt_count: number
  created_at: string
  last_attempt_at: string | null
  next_attempt_at: string | null
  applied_at: string | null
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
  grandweaverJob: GrandweaverJobReceipt
}

export interface DeckRankJobReceipt {
  state: 'not_applicable' | 'pending' | 'applied' | 'failed'
  attemptCount: number
  createdAt?: string
  lastAttemptAt?: string
  nextAttemptAt?: string
  appliedAt?: string
}

export const DECK_RANK_UPDATE_RETRY_DELAY_MS = 5_000
export const DECK_RANK_UPDATE_MAX_ATTEMPTS = 5

export class DeckRankJobPendingError extends Error {}

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

const validTimestamp = (value: string) => {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

const readDeckRankJob = (
  database: D1Database,
  proposalId: string
): Promise<DeckRankJobRow | null> =>
  database
    .prepare(
      `SELECT proposal_id, library_revision, season, status, attempt_count,
              created_at, last_attempt_at, next_attempt_at, applied_at
       FROM multiplayer_match_deck_rank_jobs WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<DeckRankJobRow>()

const jobReceipt = (job: DeckRankJobRow): DeckRankJobReceipt => ({
  state:
    job.status === 'APPLIED'
      ? 'applied'
      : job.status === 'FAILED'
        ? 'failed'
        : 'pending',
  attemptCount: job.attempt_count,
  createdAt: job.created_at,
  ...(job.last_attempt_at ? { lastAttemptAt: job.last_attempt_at } : {}),
  ...(job.next_attempt_at ? { nextAttemptAt: job.next_attempt_at } : {}),
  ...(job.applied_at ? { appliedAt: job.applied_at } : {})
})

const readMatch = (
  database: D1Database,
  proposalId: string
): Promise<MatchRow | null> =>
  database
    .prepare(
      `SELECT mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchRow>()

/**
 * Mirrors AsyncRankUpdater.UpdateFromMatch: the end-match transaction records
 * one duplicate-safe task for ranked-constructed matches and does not touch
 * the deck aggregates. The publication barrier makes this job and the ended
 * ledger visible together to player-facing readers.
 */
export const stageDeckRankJob = async (
  database: D1Database,
  proposalId: string,
  season: number,
  createdAt: string
): Promise<DeckRankJobReceipt> => {
  if (
    !Number.isSafeInteger(season) ||
    season < 1 ||
    season > 10_000 ||
    !validTimestamp(createdAt)
  ) {
    throw new Error('deck rank job input is invalid')
  }
  const match = await readMatch(database, proposalId)
  if (!match) throw new Error('match ledger row was not found')
  if (!isRankedConstructedMatchModes(storedMatchModes(match))) {
    return { state: 'not_applicable', attemptCount: 0 }
  }
  await database
    .prepare(
      `INSERT OR IGNORE INTO multiplayer_match_deck_rank_jobs
         (proposal_id, library_revision, season, status, attempt_count,
          created_at, last_attempt_at, next_attempt_at, applied_at)
       VALUES (?, ?, ?, 'PENDING', 0, ?, NULL, NULL, NULL)`
    )
    .bind(proposalId, LIBRARY_REVISION, season, createdAt)
    .run()
  const stored = await readDeckRankJob(database, proposalId)
  if (
    !stored ||
    stored.library_revision !== LIBRARY_REVISION ||
    stored.season !== season ||
    stored.created_at !== createdAt
  ) {
    throw new Error('deck rank job conflicts with match settlement')
  }
  return jobReceipt(stored)
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

const terminalMatch = (
  database: D1Database,
  proposalId: string
): Promise<TerminalMatchRow | null> =>
  database
    .prepare(
      `SELECT mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id, status, winner_player, result_json
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<TerminalMatchRow>()

const failExhaustedDeckRankJob = async (
  database: D1Database,
  proposalId: string
) => {
  await database
    .prepare(
      `UPDATE multiplayer_match_deck_rank_jobs
       SET status = 'FAILED', next_attempt_at = NULL
       WHERE proposal_id = ? AND status = 'PENDING' AND attempt_count = ?`
    )
    .bind(proposalId, DECK_RANK_UPDATE_MAX_ATTEMPTS)
    .run()
}

/**
 * Runs one source DeckRankUpdateRunner attempt. Winner and status are derived
 * from the committed ledger rather than accepted from the caller. Starting an
 * attempt stores its linear retry deadline first, so a Durable Object eviction
 * cannot strand the responsibility between mutation and rescheduling.
 */
export const runDeckRankJob = async (
  database: D1Database,
  proposalId: string,
  attemptedAt: string
): Promise<DeckRankJobReceipt> => {
  if (!validTimestamp(attemptedAt)) {
    throw new Error('deck rank attempt time is invalid')
  }
  let job = await readDeckRankJob(database, proposalId)
  if (!job) throw new Error('deck rank job was not found')
  if (job.status !== 'PENDING') return jobReceipt(job)

  const ledger = await terminalMatch(database, proposalId)
  if (!ledger || ledger.status !== 'ended') {
    throw new DeckRankJobPendingError('waiting for terminal match publication')
  }
  if (
    job.next_attempt_at &&
    Date.parse(job.next_attempt_at) > Date.parse(attemptedAt)
  ) {
    return jobReceipt(job)
  }
  if (job.attempt_count >= DECK_RANK_UPDATE_MAX_ATTEMPTS) {
    await failExhaustedDeckRankJob(database, proposalId)
    job = await readDeckRankJob(database, proposalId)
    if (!job) throw new Error('deck rank job disappeared')
    return jobReceipt(job)
  }

  const attemptCount = job.attempt_count + 1
  const nextAttemptAt = new Date(
    Date.parse(attemptedAt) + DECK_RANK_UPDATE_RETRY_DELAY_MS * attemptCount
  ).toISOString()
  const started = await database
    .prepare(
      `UPDATE multiplayer_match_deck_rank_jobs
       SET attempt_count = attempt_count + 1, last_attempt_at = ?,
           next_attempt_at = ?
       WHERE proposal_id = ? AND status = 'PENDING'
         AND attempt_count = ?
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`
    )
    .bind(
      attemptedAt,
      nextAttemptAt,
      proposalId,
      job.attempt_count,
      attemptedAt
    )
    .run()
  if ((started.meta.changes ?? 0) < 1) {
    job = await readDeckRankJob(database, proposalId)
    if (!job) throw new Error('deck rank job disappeared')
    return jobReceipt(job)
  }

  try {
    const winner =
      ledger.winner_player === null
        ? undefined
        : ledger.winner_player === 0 || ledger.winner_player === 1
          ? ledger.winner_player
          : (() => {
              throw new Error('terminal match winner is invalid')
            })()
    const result = ledger.result_json
      ? (JSON.parse(ledger.result_json) as { status?: unknown })
      : {}
    const status = result.status ?? MatchStatus.COMPLETED
    if (!Object.values(MatchStatus).includes(status as MatchStatus)) {
      throw new Error('terminal match status is invalid')
    }
    await applyDeckRanks(
      database,
      proposalId,
      job.season,
      winner,
      status as MatchStatus,
      attemptedAt
    )
  } catch (error) {
    console.error('deck rank update task failed', proposalId, error)
    if (attemptCount >= DECK_RANK_UPDATE_MAX_ATTEMPTS) {
      await failExhaustedDeckRankJob(database, proposalId)
    }
  }

  job = await readDeckRankJob(database, proposalId)
  if (!job) throw new Error('deck rank job disappeared')
  return jobReceipt(job)
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
      const pathname = new URL(request.url).pathname
      let body: Record<string, unknown>
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
      }

      if (pathname === '/internal/apply') {
        if (
          typeof body.proposalId !== 'string' ||
          typeof body.season !== 'number' ||
          ![undefined, 0, 1].includes(body.winner as undefined | number) ||
          !Object.values(MatchStatus).includes(body.status as MatchStatus) ||
          typeof body.processedAt !== 'string'
        ) {
          return Response.json(
            { error: 'invalid ranked-stat request' },
            { status: 400 }
          )
        }
        // Both account ratings depend on their immediately preceding Glicko
        // state. The same global coordinator later serializes deck-task
        // attempts, matching each source runner's single work-group lock.
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
        const grandweaverJob = await publishedGrandweaverJob(
          this.env.AUTH_DB,
          body.proposalId
        )
        const requiresGrandweaverJob = stats.rewards
          .flat()
          .some(
            reward =>
              reward.rank?.afterMatch !== undefined &&
              [PlayerRank.MASTER, PlayerRank.GRANDWEAVER].includes(
                reward.rank.afterMatch.rank
              )
          )
        if (
          (requiresGrandweaverJob && grandweaverJob.state !== 'pending') ||
          (!requiresGrandweaverJob && grandweaverJob.state !== 'not_required')
        ) {
          throw new Error('Grandweaver job staging result is invalid')
        }
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
          grandweaverJob
        } satisfies RankedSettlementReceipt)
      }

      if (pathname === '/internal/stage-deck-rank') {
        if (
          typeof body.proposalId !== 'string' ||
          typeof body.season !== 'number' ||
          typeof body.processedAt !== 'string'
        ) {
          return Response.json(
            { error: 'invalid deck-rank job request' },
            { status: 400 }
          )
        }
        const job = await stageDeckRankJob(
          this.env.AUTH_DB,
          body.proposalId,
          body.season,
          body.processedAt
        )
        return Response.json(job)
      }

      if (pathname === '/internal/apply-grandweaver') {
        if (
          typeof body.proposalId !== 'string' ||
          typeof body.attemptedAt !== 'string'
        ) {
          return Response.json(
            { error: 'invalid Grandweaver task request' },
            { status: 400 }
          )
        }
        const job = await runPublishedGrandweaverJob(
          this.env.AUTH_DB,
          body.proposalId,
          body.attemptedAt
        )
        return Response.json(job)
      }

      if (pathname === '/internal/apply-deck-rank') {
        if (
          typeof body.proposalId !== 'string' ||
          typeof body.attemptedAt !== 'string'
        ) {
          return Response.json(
            { error: 'invalid deck-rank task request' },
            { status: 400 }
          )
        }
        try {
          return Response.json(
            await runDeckRankJob(
              this.env.AUTH_DB,
              body.proposalId,
              body.attemptedAt
            )
          )
        } catch (error) {
          if (error instanceof DeckRankJobPendingError) {
            return Response.json(
              { error: 'waiting_for_match_publication' },
              { status: 409 }
            )
          }
          throw error
        }
      }

      return Response.json({ error: 'not found' }, { status: 404 })
    })
  }
}
