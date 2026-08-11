import {
  GameMode,
  PlayerRank,
  PlayerRankStage,
  Reward,
  RewardType
} from '@opensky/proto'

import {
  applySourceRankProtections,
  lookupRankByScore,
  nextRankPoints,
  parseRankState,
  serializeRankState,
  updateRankState,
  type RankDefinition,
  type RankingOutcome
} from './ranking'

interface MatchPlayersRow {
  player1_user_id: string | null
  player2_user_id: string | null
}

interface MatchStatsRow extends MatchPlayersRow {
  mode: string
}

interface AccountStatsRow {
  user_id: string
  account_id: number | null
  score: number
  player_rank: PlayerRank
  player_rank_stage: PlayerRankStage
  player_rank_state: string
}

interface MatchStatsReceiptRow {
  player1_rewards_json: string
  player2_rewards_json: string
  processed_at: string
}

interface QuestProgressRow {
  row_id: number
  progress: number
  target: number
  status: 'active' | 'complete' | 'claimed'
  active: number
}

interface ProgressionReceiptRow {
  player1_quest_progress_json: string
  player2_quest_progress_json: string
  rewards_json: string
  processed_at: string
}

export interface MatchProgressionReceipt {
  questProgress: [Record<number, number>, Record<number, number>]
  rewards: [Array<Record<string, unknown>>, Array<Record<string, unknown>>]
  processedAt: string
}

export interface MatchStatsReceipt {
  applied: boolean
  rewards: [Reward[], Reward[]]
  processedAt: string
}

const parseReceipt = (row: ProgressionReceiptRow): MatchProgressionReceipt => ({
  questProgress: [
    JSON.parse(row.player1_quest_progress_json),
    JSON.parse(row.player2_quest_progress_json)
  ],
  rewards: JSON.parse(row.rewards_json),
  processedAt: row.processed_at
})

const normalizedDeltas = (value: Record<number, number>) =>
  Object.entries(value)
    .map(([questId, delta]) => [Number(questId), Number(delta)] as const)
    .filter(
      ([questId, delta]) =>
        Number.isSafeInteger(questId) &&
        questId > 0 &&
        Number.isSafeInteger(delta) &&
        delta > 0 &&
        delta <= 65_535
    )

const receipt = (database: D1Database, proposalId: string) =>
  database
    .prepare(
      `SELECT player1_quest_progress_json, player2_quest_progress_json,
              rewards_json, processed_at
       FROM multiplayer_match_progression
       WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ProgressionReceiptRow>()

const parseRewardList = (value: string): Reward[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as Reward[]) : []
  } catch {
    return []
  }
}

const statsReceipt = async (
  database: D1Database,
  proposalId: string,
  applied: boolean
): Promise<MatchStatsReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT player1_rewards_json, player2_rewards_json, processed_at
       FROM multiplayer_match_stats_applied WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchStatsReceiptRow>()
  if (!row) return undefined
  return {
    applied,
    rewards: [
      parseRewardList(row.player1_rewards_json),
      parseRewardList(row.player2_rewards_json)
    ],
    processedAt: row.processed_at
  }
}

/**
 * Applies the source quest engine's trusted deltas once per accepted match.
 * Every conditional quest update and the receipt insert run in one D1 batch;
 * a retry sees the receipt and cannot increment a quest twice.
 */
export const applyMatchProgression = async (
  database: D1Database,
  proposalId: string,
  questProgress: [Record<number, number>, Record<number, number>],
  processedAt: string
): Promise<MatchProgressionReceipt> => {
  const alreadyProcessed = await receipt(database, proposalId)
  if (alreadyProcessed) return parseReceipt(alreadyProcessed)

  const players = await database
    .prepare(
      `SELECT player1_user_id, player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchPlayersRow>()
  if (!players) throw new Error('match ledger row was not found')

  const userIds = [players.player1_user_id, players.player2_user_id] as const
  const applied: [Record<number, number>, Record<number, number>] = [{}, {}]
  const statements: D1PreparedStatement[] = []

  for (const player of [0, 1] as const) {
    const userId = userIds[player]
    const requested = normalizedDeltas(questProgress[player])
    if (!userId || requested.length === 0) continue

    const placeholders = requested.map(() => '?').join(',')
    const rows = await database
      .prepare(
        `SELECT rowid AS row_id, progress, target, status, active
         FROM player_quests
         WHERE user_id = ? AND rowid IN (${placeholders})`
      )
      .bind(userId, ...requested.map(([questId]) => questId))
      .all<QuestProgressRow>()
    const byId = new Map(rows.results.map(row => [row.row_id, row]))

    for (const [questId, delta] of requested) {
      const quest = byId.get(questId)
      if (!quest || quest.active !== 1 || quest.status !== 'active') continue
      const actualDelta = Math.min(
        delta,
        Math.max(0, quest.target - quest.progress)
      )
      if (actualDelta <= 0) continue
      applied[player][questId] = actualDelta
      statements.push(
        database
          .prepare(
            `UPDATE player_quests
             SET progress = MIN(target, progress + ?),
                 status = CASE
                   WHEN progress + ? >= target THEN 'complete'
                   ELSE status
                 END,
                 updated_at = ?
             WHERE user_id = ? AND rowid = ? AND active = 1
               AND status = 'active'
               AND NOT EXISTS (
                 SELECT 1 FROM multiplayer_match_progression
                 WHERE proposal_id = ?
               )`
          )
          .bind(
            actualDelta,
            actualDelta,
            processedAt,
            userId,
            questId,
            proposalId
          )
      )
    }
  }

  const rewards: MatchProgressionReceipt['rewards'] = [[], []]
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_progression
           (proposal_id, player1_quest_progress_json,
            player2_quest_progress_json, rewards_json, processed_at)
         SELECT ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_progression WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        JSON.stringify(applied[0]),
        JSON.stringify(applied[1]),
        JSON.stringify(rewards),
        processedAt,
        proposalId
      )
  )

  await database.batch(statements)
  const stored = await receipt(database, proposalId)
  if (!stored) throw new Error('match progression receipt was not persisted')
  return parseReceipt(stored)
}

/**
 * Applies the source match counters once. The guard row and every counter
 * mutation share one D1 batch so Durable Object/alarm retries cannot count a
 * completed match twice.
 */
const ranked = (rank: PlayerRank) =>
  ![PlayerRank.UNKNOWN, PlayerRank.UNRANKED].includes(rank)

const rankData = (
  rank: PlayerRank,
  stage: PlayerRankStage,
  definition: RankDefinition,
  score: number
) => ({
  rank,
  rankStage: stage,
  requiredRankPoints: nextRankPoints(definition),
  rankPosition: 0,
  score,
  scoreAbove: 0,
  scoreBelow: 0
})

/**
 * Applies ranked counters and the source Glicko/RP transition exactly once.
 * The exact reward payload is stored with the guard row, so an alarm retry
 * returns the original transition instead of applying or reporting it twice.
 */
export const applyMatchStats = async (
  database: D1Database,
  proposalId: string,
  season: number,
  winner: 0 | 1 | undefined,
  processedAt: string
): Promise<MatchStatsReceipt> => {
  const match = await database
    .prepare(
      `SELECT mode, player1_user_id, player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchStatsRow>()
  if (!match) throw new Error('match ledger row was not found')
  if (!['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'].includes(match.mode)) {
    return { applied: false, rewards: [[], []], processedAt }
  }
  if (!Number.isSafeInteger(season) || season < 1 || season > 10_000) {
    throw new Error('match season is invalid')
  }

  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const existing = await statsReceipt(database, proposalId, false)
  if (existing) return existing

  const initializers = userIds
    .filter((userId): userId is string => userId !== null)
    .map(userId =>
      database
        .prepare(
          `INSERT OR IGNORE INTO player_account_stats
             (user_id, game_mode, season, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(userId, match.mode, season, processedAt, processedAt)
    )
  if (initializers.length > 0) await database.batch(initializers)

  const accountStats = await Promise.all(
    userIds.map(userId =>
      userId
        ? database
            .prepare(
              `SELECT stats.user_id, account.id AS account_id, stats.score,
                      stats.player_rank, stats.player_rank_stage,
                      stats.player_rank_state
               FROM player_account_stats stats
               LEFT JOIN game_accounts account ON account.user_id = stats.user_id
               WHERE stats.user_id = ? AND stats.game_mode = ? AND stats.season = ?`
            )
            .bind(userId, match.mode, season)
            .first<AccountStatsRow>()
        : Promise.resolve(null)
    )
  )

  const outcomes: [RankingOutcome, RankingOutcome] =
    winner === undefined
      ? [0.5, 0.5]
      : winner === 0
        ? [1, 0]
        : [0, 1]
  const oldStates = accountStats.map(stats =>
    stats ? parseRankState(stats.player_rank_state, stats.score) : undefined
  )
  const statements: D1PreparedStatement[] = []
  const rewards: [Reward[], Reward[]] = [[], []]

  for (const player of [0, 1] as const) {
    const userId = userIds[player]
    const stats = accountStats[player]
    if (!userId || !stats) continue
    const won = winner === player ? 1 : 0
    const tied = winner === undefined ? 1 : 0
    const lost = winner !== undefined && winner !== player ? 1 : 0
    const opponent = player === 0 ? 1 : 0
    const canUpdateRank =
      ranked(stats.player_rank) &&
      oldStates[player] !== undefined &&
      oldStates[opponent] !== undefined
    let score = stats.score
    let playerRank = stats.player_rank
    let playerRankStage = stats.player_rank_stage
    let playerRankState = stats.player_rank_state

    if (canUpdateRank) {
      const currentDefinition = lookupRankByScore(stats.score)
      const updated = updateRankState(
        outcomes[player],
        oldStates[player]!,
        oldStates[opponent]!
      )
      const protectedResult = applySourceRankProtections(
        currentDefinition,
        oldStates[player]!,
        updated
      )
      score = protectedResult.state.points
      playerRank = protectedResult.rank.rank
      playerRankStage = protectedResult.rank.stage
      playerRankState = serializeRankState(protectedResult.state)
      rewards[player].push({
        accountID: stats.account_id ?? 0,
        type: RewardType.RANK,
        gameMode: match.mode as GameMode,
        rank: {
          beforeMatch: rankData(
            stats.player_rank,
            stats.player_rank_stage,
            currentDefinition,
            stats.score
          ),
          afterMatch: rankData(
            playerRank,
            playerRankStage,
            protectedResult.rank,
            score
          )
        }
      })
    }

    statements.push(
      database
        .prepare(
          `UPDATE player_account_stats
           SET win_count = win_count + ?,
               loss_count = loss_count + ?,
               tie_count = tie_count + ?,
               win_streak = CASE WHEN ? = 1 THEN win_streak + 1 ELSE 0 END,
               loss_streak = CASE WHEN ? = 1 THEN loss_streak + 1 ELSE 0 END,
               score = ?,
               player_rank = ?,
               player_rank_stage = ?,
               player_rank_state = ?,
               updated_at = ?
           WHERE user_id = ? AND game_mode = ? AND season = ?
             AND NOT EXISTS (
               SELECT 1 FROM multiplayer_match_stats_applied
               WHERE proposal_id = ?
             )`
        )
        .bind(
          won,
          lost,
          tied,
          won,
          lost,
          score,
          playerRank,
          playerRankStage,
          playerRankState,
          processedAt,
          userId,
          match.mode,
          season,
          proposalId
        )
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_stats_applied
           (proposal_id, player1_rewards_json, player2_rewards_json, processed_at)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_stats_applied WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        JSON.stringify(rewards[0]),
        JSON.stringify(rewards[1]),
        processedAt,
        proposalId
      )
  )
  await database.batch(statements)
  const stored = await statsReceipt(database, proposalId, true)
  if (!stored) throw new Error('ranked match receipt was not persisted')
  return stored
}
