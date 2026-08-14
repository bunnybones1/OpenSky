import { GameMode, MatchStatus } from '@opensky/proto'
import {
  conquestMatchMode,
  storedMatchModes
} from '@opensky/shared/match-modes'

const OBSERVED_HISTORY_SIZE = 20

interface MatchRow {
  id: number
  mode: GameMode
  player1_mode: GameMode | null
  player2_mode: GameMode | null
  player1_user_id: string | null
  player2_user_id: string | null
}

interface OutcomeRow {
  match_id: number
  proposal_id: string
  player1_user_id: string
  player2_user_id: string
  winner_player: 0 | 1
  processed_at: string
}

interface ReceiptRow {
  score_key: string
  player1_score: number
  player2_score: number
  processed_at: string
}

export interface ConquestScoreReceipt {
  applied: boolean
  scores: [number, number]
  processedAt: string
}

const storedReceipt = async (
  database: D1Database,
  proposalId: string,
  scoreKey?: string
): Promise<ConquestScoreReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT score_key, player1_score, player2_score, processed_at
       FROM multiplayer_match_conquest_scores WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ReceiptRow>()
  return row
    ? {
        applied: scoreKey !== undefined && row.score_key === scoreKey,
        scores: [row.player1_score, row.player2_score],
        processedAt: row.processed_at
      }
    : undefined
}

const recentOutcomes = async (
  database: D1Database,
  proposalId: string,
  userId: string,
  mode: GameMode
): Promise<OutcomeRow[]> => {
  const rows = await database
    .prepare(
      `SELECT match_id, proposal_id, player1_user_id, player2_user_id,
              winner_player, processed_at
       FROM (
         SELECT match.id AS match_id, match.proposal_id,
                match.player1_user_id, match.player2_user_id,
                match.winner_player, match.ended_at AS processed_at
         FROM multiplayer_matches match
         WHERE match.proposal_id <> ? AND match.status = 'ended'
           AND match.winner_player IN (0, 1) AND match.ended_at IS NOT NULL
           AND CASE WHEN json_valid(match.result_json)
                    THEN json_extract(match.result_json, '$.status') END =
               'COMPLETED'
           AND (COALESCE(match.player1_mode, match.mode) = ?
                OR COALESCE(match.player2_mode, match.mode) = ?)
           AND (match.player1_user_id = ? OR match.player2_user_id = ?)
           AND NOT EXISTS (
             SELECT 1 FROM multiplayer_match_conquest_scores receipt
             WHERE receipt.proposal_id = match.proposal_id
           )
         UNION ALL
         SELECT receipt.match_id, receipt.proposal_id,
                receipt.player1_user_id, receipt.player2_user_id,
                receipt.winner_player, receipt.processed_at
         FROM multiplayer_match_conquest_scores receipt
         WHERE receipt.proposal_id <> ? AND receipt.game_mode = ?
           AND receipt.match_status = 'COMPLETED'
           AND receipt.winner_player IN (0, 1)
           AND (receipt.player1_user_id = ? OR receipt.player2_user_id = ?)
       ) outcomes
       ORDER BY processed_at DESC, match_id DESC
       LIMIT ?`
    )
    .bind(
      proposalId,
      mode,
      mode,
      userId,
      userId,
      proposalId,
      mode,
      userId,
      userId,
      OBSERVED_HISTORY_SIZE
    )
    .all<OutcomeRow>()
  for (const row of rows.results) {
    if (
      !Number.isSafeInteger(row.match_id) ||
      row.match_id < 1 ||
      !Number.isFinite(Date.parse(row.processed_at))
    ) {
      throw new Error('Conquest score history is malformed')
    }
  }
  return rows.results
}

const scoreFromOutcomes = (outcomes: OutcomeRow[], userId: string): number =>
  outcomes.reduce((score, outcome) => {
    const winner =
      outcome.winner_player === 0
        ? outcome.player1_user_id
        : outcome.player2_user_id
    return score + (winner === userId ? 1 : -1)
  }, 0)

/**
 * Restores the source Conquest matchmaking score: each player receives +1 or
 * -1 for each of their latest 20 completed, decisive matches in that Conquest
 * mode. Draws, abandons, and forfeits do not enter the observed history.
 *
 * The global deck-rank coordinator serializes calls. A receipt makes retries
 * idempotent and also exposes an earlier completion to a following coordinator
 * call before the originating game Durable Object marks its ledger row ended.
 */
export const applyConquestScores = async (
  database: D1Database,
  proposalId: string,
  season: number,
  winner: 0 | 1 | undefined,
  status: MatchStatus,
  processedAt: string
): Promise<ConquestScoreReceipt> => {
  const match = await database
    .prepare(
      `SELECT id, mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  const mode = conquestMatchMode(storedMatchModes(match))
  if (!mode) {
    return { applied: false, scores: [0, 0], processedAt }
  }

  const existing = await storedReceipt(database, proposalId)
  if (existing) return existing
  if (!Number.isSafeInteger(season) || season < 1 || season > 10_000) {
    throw new Error('match season is invalid')
  }
  if (!Number.isFinite(Date.parse(processedAt))) {
    throw new Error('Conquest score time is invalid')
  }
  if (
    ![
      MatchStatus.COMPLETED,
      MatchStatus.ABANDONED,
      MatchStatus.FORFEITED
    ].includes(status)
  ) {
    throw new Error('Conquest score match status is invalid')
  }
  if (!match.player1_user_id || !match.player2_user_id) {
    throw new Error('conquest matches require two identity players')
  }
  if (match.player1_user_id === match.player2_user_id) {
    throw new Error('conquest matches require distinct identity players')
  }

  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const histories = await Promise.all(
    userIds.map(userId => recentOutcomes(database, proposalId, userId, mode))
  )
  if (status === MatchStatus.COMPLETED && winner !== undefined) {
    const current: OutcomeRow = {
      match_id: match.id,
      proposal_id: proposalId,
      player1_user_id: userIds[0],
      player2_user_id: userIds[1],
      winner_player: winner,
      processed_at: processedAt
    }
    for (const history of histories) history.push(current)
  }
  const scores = histories.map((history, player) =>
    scoreFromOutcomes(
      history
        .sort(
          (left, right) =>
            right.processed_at.localeCompare(left.processed_at) ||
            right.match_id - left.match_id
        )
        .slice(0, OBSERVED_HISTORY_SIZE),
      userIds[player]
    )
  ) as [number, number]

  const scoreKey = crypto.randomUUID()
  await database.batch([
    ...userIds.map(userId =>
      database
        .prepare(
          `INSERT OR IGNORE INTO player_account_stats
             (user_id, game_mode, season, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(userId, mode, season, processedAt, processedAt)
    ),
    database
      .prepare(
        `INSERT OR IGNORE INTO multiplayer_match_conquest_scores
           (proposal_id, score_key, match_id, game_mode, player1_user_id,
            player2_user_id, match_status, winner_player, player1_score,
            player2_score, processed_at)
         SELECT proposal_id, ?, id, ?, player1_user_id, player2_user_id,
                ?, ?, ?, ?, ?
         FROM multiplayer_matches
         WHERE proposal_id = ? AND id = ?
           AND player1_user_id = ? AND player2_user_id = ?
           AND COALESCE(player1_mode, mode) = ?
           AND COALESCE(player2_mode, mode) = ?`
      )
      .bind(
        scoreKey,
        mode,
        status,
        winner ?? null,
        scores[0],
        scores[1],
        processedAt,
        proposalId,
        match.id,
        userIds[0],
        userIds[1],
        mode,
        mode
      ),
    ...userIds.map((userId, player) =>
      database
        .prepare(
          `UPDATE player_account_stats
           SET score = ?, updated_at = ?
           WHERE user_id = ? AND game_mode = ? AND season = ?
             AND EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_scores receipt
               WHERE receipt.proposal_id = ? AND receipt.score_key = ?
             )`
        )
        .bind(
          scores[player],
          processedAt,
          userId,
          mode,
          season,
          proposalId,
          scoreKey
        )
    )
  ])
  const stored = await storedReceipt(database, proposalId, scoreKey)
  if (!stored) throw new Error('Conquest score receipt was not persisted')
  return stored
}
