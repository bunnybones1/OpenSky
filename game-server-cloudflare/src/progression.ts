import {
  ConquestMatchResult,
  ConquestStatus,
  GameMode,
  MatchStatus,
  PlayerRank,
  PlayerRankStage,
  Reward,
  RewardExpReason,
  RewardType
} from '@opensky/proto'
import {
  hasUnlockedRanked,
  INITIAL_RANK_STATE_JSON
} from '@opensky/shared/ranked-progression'

import {
  addExperience,
  awardMatchExperience,
  experienceReward,
  type MatchExperiencePlayer
} from './experience'
import {
  applySourceRankProtections,
  lookupRankByScore,
  rankStageIncreased,
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

interface ConquestMatchRow extends MatchStatsRow {
  id: number
}

interface ActiveConquestRow {
  id: number
  match_progress: string
}

interface ConquestProgressReceiptRow {
  player1_result: ConquestMatchResult
  player2_result: ConquestMatchResult
  processed_at: string
}

interface MatchExperienceRow extends MatchPlayersRow {
  player1_principal: string
  player2_principal: string
}

interface AccountStatsRow {
  user_id: string
  account_id: number | null
  score: number
  player_rank: PlayerRank
  player_rank_stage: PlayerRankStage
  player_rank_state: string
  level: number | null
  xp: number | null
  basic_skypass_level: number | null
}

interface MatchStatsReceiptRow {
  player1_rewards_json: string
  player2_rewards_json: string
  processed_at: string
}

interface MatchExperienceReceiptRow extends MatchStatsReceiptRow {}

interface PlayerExperienceRow {
  account_id: number | null
  level: number
  xp: number
  basic_skypass_level: number
  hero_count: number
  ranked_constructed_rank: PlayerRank
  inviter_user_id: string | null
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

export interface MatchExperienceReceipt extends MatchStatsReceipt {}

export interface ConquestProgressReceipt {
  applied: boolean
  results: [ConquestMatchResult, ConquestMatchResult]
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

const conquestProgressReceipt = async (
  database: D1Database,
  proposalId: string,
  applied: boolean
): Promise<ConquestProgressReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT player1_result, player2_result, processed_at
       FROM multiplayer_match_conquest_progress WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ConquestProgressReceiptRow>()
  return row
    ? {
        applied,
        results: [row.player1_result, row.player2_result],
        processedAt: row.processed_at
      }
    : undefined
}

const parsedConquestProgress = (
  value: string
): Record<string, ConquestMatchResult> => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const progress: Record<string, ConquestMatchResult> = {}
    for (const [key, result] of Object.entries(parsed)) {
      if (
        /^\d+$/.test(key) &&
        [
          ConquestMatchResult.WIN,
          ConquestMatchResult.LOSS,
          ConquestMatchResult.DRAW
        ].includes(result as ConquestMatchResult)
      ) {
        progress[key] = result as ConquestMatchResult
      }
    }
    return progress
  } catch {
    return {}
  }
}

/**
 * Recreates the source Conquest state-manager transition at authoritative match
 * completion. The per-proposal receipt and both player updates share one D1
 * batch, so an alarm retry cannot append the same match twice.
 */
export const applyConquestProgress = async (
  database: D1Database,
  proposalId: string,
  winner: 0 | 1 | undefined,
  processedAt: string
): Promise<ConquestProgressReceipt> => {
  const existing = await conquestProgressReceipt(database, proposalId, false)
  if (existing) return existing

  const match = await database
    .prepare(
      `SELECT id, mode, player1_user_id, player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ConquestMatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  if (
    ![GameMode.CONQUEST_CONSTRUCTED, GameMode.CONQUEST_DISCOVERY].includes(
      match.mode as GameMode
    )
  ) {
    return {
      applied: false,
      results: [ConquestMatchResult.DRAW, ConquestMatchResult.DRAW],
      processedAt
    }
  }

  const userIds = [match.player1_user_id, match.player2_user_id] as const
  if (!userIds[0] || !userIds[1]) {
    throw new Error('conquest matches require two identity players')
  }
  const results: [ConquestMatchResult, ConquestMatchResult] =
    winner === undefined
      ? [ConquestMatchResult.DRAW, ConquestMatchResult.DRAW]
      : winner === 0
      ? [ConquestMatchResult.WIN, ConquestMatchResult.LOSS]
      : [ConquestMatchResult.LOSS, ConquestMatchResult.WIN]
  const rows = await Promise.all(
    userIds.map(userId =>
      database
        .prepare(
          `SELECT id, match_progress FROM player_conquests
           WHERE user_id = ? AND status = 'IN_PROGRESS' AND mode = ?
           LIMIT 1`
        )
        .bind(userId, match.mode)
        .first<ActiveConquestRow>()
    )
  )
  if (!rows[0] || !rows[1]) {
    throw new Error('there is no conquest in progress')
  }

  const statements: D1PreparedStatement[] = []
  for (const player of [0, 1] as const) {
    const progress = parsedConquestProgress(rows[player]!.match_progress)
    progress[String(match.id)] = results[player]
    const values = Object.values(progress)
    const wins = values.filter(value => value === ConquestMatchResult.WIN).length
    const ended =
      wins >= 3 || values.includes(ConquestMatchResult.LOSS)
    const status = !ended
      ? ConquestStatus.IN_PROGRESS
      : wins === 0
      ? ConquestStatus.COMPLETED
      : ConquestStatus.REWARDS_PENDING
    statements.push(
      database
        .prepare(
          `UPDATE player_conquests
           SET match_progress = ?, status = ?,
               ended_at = CASE WHEN ? = 1 THEN ? ELSE ended_at END
           WHERE id = ? AND status = 'IN_PROGRESS'
             AND match_progress = ?
             AND NOT EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_progress
               WHERE proposal_id = ?
             )`
        )
        .bind(
          JSON.stringify(progress),
          status,
          ended ? 1 : 0,
          processedAt,
          rows[player]!.id,
          rows[player]!.match_progress,
          proposalId
        )
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_conquest_progress
           (proposal_id, player1_result, player2_result, processed_at)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_conquest_progress
           WHERE proposal_id = ?
         ) AND EXISTS (
           SELECT 1 FROM player_conquests
           WHERE id = ? AND json_extract(match_progress, ?) = ?
         ) AND EXISTS (
           SELECT 1 FROM player_conquests
           WHERE id = ? AND json_extract(match_progress, ?) = ?
         )`
      )
      .bind(
        proposalId,
        results[0],
        results[1],
        processedAt,
        proposalId,
        rows[0].id,
        `$."${match.id}"`,
        results[0],
        rows[1].id,
        `$."${match.id}"`,
        results[1]
      )
  )
  await database.batch(statements)
  const stored = await conquestProgressReceipt(database, proposalId, true)
  if (!stored) throw new Error('conquest progress receipt was not persisted')
  return stored
}

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

const experienceReceipt = async (
  database: D1Database,
  proposalId: string,
  applied: boolean
): Promise<MatchExperienceReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT player1_rewards_json, player2_rewards_json, processed_at
       FROM multiplayer_match_experience WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchExperienceReceiptRow>()
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

const rankedUnlockReward = (accountID: number): Reward => ({
  accountID,
  type: RewardType.RANK,
  gameMode: GameMode.RANKED_CONSTRUCTED,
  rank: {
    beforeMatch: {
      rank: PlayerRank.UNRANKED,
      rankStage: PlayerRankStage.STAGE_I,
      requiredRankPoints: 0,
      rankPosition: 0,
      score: 0,
      scoreAbove: 0,
      scoreBelow: 0
    },
    afterMatch: {
      rank: PlayerRank.WANDERER,
      rankStage: PlayerRankStage.STAGE_I,
      requiredRankPoints: 100,
      rankPosition: 0,
      score: 0,
      scoreAbove: 0,
      scoreBelow: 0
    }
  }
})

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
 * Applies the Go source match XP awarder and linear level-up behavior once.
 * The reward payload and every profile mutation share a durable D1 receipt.
 */
export const applyMatchExperience = async (
  database: D1Database,
  proposalId: string,
  season: number,
  gameModes: [GameMode, GameMode],
  winner: 0 | 1 | undefined,
  status: MatchStatus,
  turnCount: number,
  processedAt: string,
  priorRewards: [Reward[], Reward[]] = [[], []]
): Promise<MatchExperienceReceipt> => {
  const existing = await experienceReceipt(database, proposalId, false)
  if (existing) return existing
  if (!Number.isSafeInteger(season) || season < 1 || season > 10_000) {
    throw new Error('match season is invalid')
  }
  if (
    !Number.isSafeInteger(turnCount) ||
    turnCount < 0 ||
    turnCount > 4_294_967_295
  ) {
    throw new Error('match turn count is invalid')
  }

  const match = await database
    .prepare(
      `SELECT player1_user_id, player2_user_id, player1_principal,
              player2_principal
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchExperienceRow>()
  if (!match) throw new Error('match ledger row was not found')

  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const principals = [match.player1_principal, match.player2_principal] as const
  const rows = await Promise.all(
    userIds.map(userId =>
      userId
        ? database
            .prepare(
              `SELECT account.id AS account_id, profile.level, profile.xp,
                      progression.basic_skypass_level,
                      (SELECT COUNT(*) FROM player_items item
                       WHERE item.user_id = profile.user_id
                         AND item.item_type = 'SW_HERO' AND item.balance > 0)
                        AS hero_count,
                      COALESCE(
                        (SELECT stats.player_rank FROM player_account_stats stats
                         WHERE stats.user_id = profile.user_id
                           AND stats.game_mode = 'RANKED_CONSTRUCTED'
                           AND stats.season = ?),
                        'UNRANKED'
                      ) AS ranked_constructed_rank,
                      (SELECT invite.inviter_user_id FROM player_invites invite
                       WHERE invite.invitee_user_id = profile.user_id)
                        AS inviter_user_id
               FROM player_profiles profile
               JOIN player_progression progression
                 ON progression.user_id = profile.user_id
               LEFT JOIN game_accounts account ON account.user_id = profile.user_id
               WHERE profile.user_id = ?`
            )
            .bind(season, userId)
            .first<PlayerExperienceRow>()
        : Promise.resolve(null)
    )
  )
  const players = rows.map((row, index) =>
    row
      ? ({
          accountID: row.account_id ?? 0,
          principal: principals[index],
          gameMode: gameModes[index],
          level: row.level,
          experience: row.xp,
          seasonLevel: row.basic_skypass_level,
          heroCount: row.hero_count
        } satisfies MatchExperiencePlayer)
      : undefined
  ) as [MatchExperiencePlayer | undefined, MatchExperiencePlayer | undefined]
  const rewards = awardMatchExperience({
    players,
    winner,
    status,
    turnCount
  })
  const statements: D1PreparedStatement[] = []

  for (const player of [0, 1] as const) {
    const userId = userIds[player]
    const row = rows[player]
    if (!userId || !row) continue
    const experienceGain = [...priorRewards[player], ...rewards[player]].reduce(
      (total, reward) => total + (reward.exp?.amount ?? 0),
      0
    )
    if (experienceGain <= 0) continue

    const rankedWasUnlocked = hasUnlockedRanked(row.level, row.xp)
    const next = addExperience(row.level, row.xp, experienceGain)
    statements.push(
      database
        .prepare(
          `UPDATE player_profiles
           SET level = ?, xp = ?, next_level_xp = 200, updated_at = ?
           WHERE user_id = ? AND NOT EXISTS (
             SELECT 1 FROM multiplayer_match_experience WHERE proposal_id = ?
           )`
        )
        .bind(next.level, next.experience, processedAt, userId, proposalId),
      database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(basic_skypass_level, ?),
               basic_skypass_xp = ?, basic_skypass_next_xp = 200,
               updated_at = ?
           WHERE user_id = ? AND NOT EXISTS (
             SELECT 1 FROM multiplayer_match_experience WHERE proposal_id = ?
           )`
        )
        .bind(next.level, next.experience, processedAt, userId, proposalId)
    )

    const levelsGained = next.level - row.level
    if (levelsGained > 0 && row.inviter_user_id) {
      statements.push(
        database
          .prepare(
            `INSERT INTO player_friend_points
               (invitee_user_id, inviter_user_id, season, levels,
                points_carried, points_spent, updated_at)
             SELECT ?, ?, ?, ?, 0, 0, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM multiplayer_match_experience
               WHERE proposal_id = ?
             )
             ON CONFLICT(invitee_user_id, inviter_user_id, season)
             DO UPDATE SET
               levels = player_friend_points.levels + excluded.levels,
               updated_at = excluded.updated_at`
          )
          .bind(
            userId,
            row.inviter_user_id,
            season,
            levelsGained,
            processedAt,
            proposalId
          ),
        database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_STICKER_POINTS', 0, ?, 0, 'friend-level', ?, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM multiplayer_match_experience
               WHERE proposal_id = ?
             )
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET
               balance = player_items.balance + excluded.balance,
               updated_at = excluded.updated_at`
          )
          .bind(
            row.inviter_user_id,
            levelsGained,
            processedAt,
            processedAt,
            proposalId
          )
      )
    }

    if (!rankedWasUnlocked && hasUnlockedRanked(next.level, next.experience)) {
      for (const mode of [
        GameMode.RANKED_CONSTRUCTED,
        GameMode.RANKED_DISCOVERY
      ]) {
        statements.push(
          database
            .prepare(
              `INSERT OR IGNORE INTO player_account_stats
                 (user_id, game_mode, season, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)`
            )
            .bind(userId, mode, season, processedAt, processedAt),
          database
            .prepare(
              `UPDATE player_account_stats
               SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
                   score = 0, player_rank_state = ?, updated_at = ?
               WHERE user_id = ? AND game_mode = ? AND season = ?
                 AND player_rank = 'UNRANKED'
                 AND NOT EXISTS (
                   SELECT 1 FROM multiplayer_match_experience
                   WHERE proposal_id = ?
                 )`
            )
            .bind(
              INITIAL_RANK_STATE_JSON,
              processedAt,
              userId,
              mode,
              season,
              proposalId
            )
        )
      }
      if (row.ranked_constructed_rank === PlayerRank.UNRANKED) {
        rewards[player].push(rankedUnlockReward(row.account_id ?? 0))
      }
    }
  }

  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_experience
           (proposal_id, player1_rewards_json, player2_rewards_json, processed_at)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_experience WHERE proposal_id = ?
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
  const stored = await experienceReceipt(database, proposalId, true)
  if (!stored) throw new Error('match experience receipt was not persisted')
  return stored
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
                      stats.player_rank_state, profile.level, profile.xp,
                      progression.basic_skypass_level
               FROM player_account_stats stats
               LEFT JOIN game_accounts account ON account.user_id = stats.user_id
               LEFT JOIN player_profiles profile ON profile.user_id = stats.user_id
               LEFT JOIN player_progression progression
                 ON progression.user_id = stats.user_id
               WHERE stats.user_id = ? AND stats.game_mode = ? AND stats.season = ?`
            )
            .bind(userId, match.mode, season)
            .first<AccountStatsRow>()
        : Promise.resolve(null)
    )
  )

  const outcomes: [RankingOutcome, RankingOutcome] =
    winner === undefined ? [0.5, 0.5] : winner === 0 ? [1, 0] : [0, 1]
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

      if (
        outcomes[player] === 1 &&
        rankStageIncreased(protectedResult.rank, currentDefinition) &&
        protectedResult.rank.experienceReward > 0 &&
        stats.level !== null &&
        stats.xp !== null &&
        stats.basic_skypass_level !== null
      ) {
        const alreadyAwarded = await database
          .prepare(
            `SELECT 1 FROM player_rank_up_rewards
             WHERE user_id = ? AND game_mode = ? AND season = ?
               AND player_rank = ? AND player_rank_stage = ?`
          )
          .bind(userId, match.mode, season, playerRank, playerRankStage)
          .first()
        if (!alreadyAwarded) {
          rewards[player].push(
            experienceReward(
              {
                accountID: stats.account_id ?? 0,
                principal: '',
                gameMode: match.mode as GameMode,
                level: stats.level,
                experience: stats.xp,
                seasonLevel: stats.basic_skypass_level,
                heroCount: 0
              },
              protectedResult.rank.experienceReward,
              RewardExpReason.RankUp
            )
          )
          statements.push(
            database
              .prepare(
                `INSERT OR IGNORE INTO player_rank_up_rewards
                   (user_id, game_mode, season, player_rank,
                    player_rank_stage, proposal_id, awarded_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                userId,
                match.mode,
                season,
                playerRank,
                playerRankStage,
                proposalId,
                processedAt
              )
          )
        }
      }
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
