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
  conquestMatchMode,
  isRankedGameMode,
  isRankedMatchModes,
  storedMatchModes
} from '@opensky/shared/match-modes'
import { parseConquestMatchProgress } from '@opensky/shared/conquest-progress'
import { INITIAL_RANK_STATE_JSON } from '@opensky/shared/ranked-progression'
import {
  noUnpublishedAccountStatsInScopeSQL,
  publishedAccountStatsCTESQL
} from '../../cloudflare/src/rank-publication'

import {
  awardMatchExperience,
  experienceReward,
  practiceExperienceCutoffLevel,
  type MatchExperiencePlayer
} from './experience'
import { conquestRewardBundle } from './conquest-settlement'
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
import { sourceRewardListWire, sourceRewardWire } from './reward-wire'

interface MatchPlayersRow {
  player1_user_id: string | null
  player2_user_id: string | null
}

interface MatchStatsRow extends MatchPlayersRow {
  mode: GameMode
  player1_mode: GameMode | null
  player2_mode: GameMode | null
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
  win_count: number
  loss_count: number
  tie_count: number
  forfeit_count: number
  abandon_count: number
  score: number
  player_rank: PlayerRank
  player_rank_stage: PlayerRankStage
  player_rank_state: string
  win_streak: number
  loss_streak: number
  created_at: string
  level: number | null
  xp: number | null
  season_level: number | null
  updated_at: string
}

interface RankProjection {
  user_id: string
  account_id: number | null
  game_mode?: GameMode
  score: number
  player_rank: PlayerRank
  updated_at: string
}

interface RankContextRow {
  rank_position: number
  master_position: number
  score_below: number | null
  score_above: number | null
  grandweaver_floor: number | null
}

interface RankRewardContext {
  rankPosition: number
  scoreBelow: number
  scoreAbove: number
  displayRank: PlayerRank
}

interface RankedTransition {
  score: number
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  playerRankState: string
  currentDefinition?: RankDefinition
  nextDefinition?: RankDefinition
}

interface MatchStatsReceiptRow {
  player1_rewards_json: string
  player2_rewards_json: string
  processed_at: string
}

interface MatchExperienceReceiptRow extends MatchStatsReceiptRow {
  settlement_token: string
}

interface PlayerExperienceRow {
  account_id: number | null
  level: number
  xp: number
  season_level: number
  hero_count: number
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

type WarmUpMatchRow = MatchPlayersRow

interface WarmUpSettingsRow {
  warm_ups: number
}

interface WarmUpReceiptRow {
  credited_player: 0 | 1
  user_id: string
  warm_ups_before: number
  warm_ups_after: number
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

export interface WarmUpProgressReceipt {
  applied: boolean
  creditedPlayer?: 0 | 1
  userId?: string
  before: number
  after: number
  processedAt: string
}

const PRACTICE_MODES = new Set<GameMode>([
  GameMode.PRACTICE_PVP,
  GameMode.PRACTICE_BOT,
  GameMode.WARM_UP
])

export const warmUpProgressPlayer = (
  gameModes: [GameMode, GameMode],
  winner: 0 | 1 | undefined,
  status: MatchStatus
): 0 | 1 | undefined => {
  const practiceBot = gameModes.includes(GameMode.PRACTICE_BOT)
  const creditedPlayer = winner ?? (!practiceBot ? 0 : undefined)
  if (
    status !== MatchStatus.COMPLETED ||
    creditedPlayer === undefined ||
    !gameModes.some(mode => PRACTICE_MODES.has(mode)) ||
    (practiceBot && creditedPlayer !== 0)
  ) {
    return undefined
  }
  return creditedPlayer
}

const warmUpReceipt = async (
  database: D1Database,
  proposalId: string,
  applied: boolean
): Promise<WarmUpProgressReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT credited_player, user_id, warm_ups_before, warm_ups_after,
              processed_at
       FROM multiplayer_match_warmups_applied WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<WarmUpReceiptRow>()
  return row
    ? {
        applied,
        creditedPlayer: row.credited_player,
        userId: row.user_id,
        before: row.warm_ups_before,
        after: row.warm_ups_after,
        processedAt: row.processed_at
      }
    : undefined
}

/**
 * Applies the source 0-3 practice counter exactly once. Practice-bot only
 * counts a human win. The Go source credits player one on a completed draw in
 * practice PvP/Warm Up, so preserve that unusual legacy edge case too.
 */
export const applyWarmUpProgress = async (
  database: D1Database,
  proposalId: string,
  gameModes: [GameMode, GameMode],
  winner: 0 | 1 | undefined,
  status: MatchStatus,
  processedAt: string
): Promise<WarmUpProgressReceipt> => {
  const existing = await warmUpReceipt(database, proposalId, false)
  if (existing) return existing

  const creditedPlayer = warmUpProgressPlayer(gameModes, winner, status)
  if (creditedPlayer === undefined) {
    return { applied: false, before: 0, after: 0, processedAt }
  }

  const match = await database
    .prepare(
      `SELECT player1_user_id, player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<WarmUpMatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  const userId =
    creditedPlayer === 0 ? match.player1_user_id : match.player2_user_id
  if (!userId) {
    return { applied: false, before: 0, after: 0, processedAt }
  }
  const settings = await database
    .prepare(`SELECT warm_ups FROM player_account_settings WHERE user_id = ?`)
    .bind(userId)
    .first<WarmUpSettingsRow>()
  if (!settings) throw new Error('winning player account settings are missing')
  const before = Math.min(3, Math.max(0, settings.warm_ups))
  const after = Math.min(3, before + 1)

  await database.batch([
    database
      .prepare(
        `UPDATE player_account_settings
         SET warm_ups = ?, updated_at = ?
         WHERE user_id = ? AND NOT EXISTS (
           SELECT 1 FROM multiplayer_match_warmups_applied
           WHERE proposal_id = ?
         )`
      )
      .bind(after, processedAt, userId, proposalId),
    database
      .prepare(
        `INSERT INTO multiplayer_match_warmups_applied
           (proposal_id, credited_player, user_id, warm_ups_before,
            warm_ups_after, processed_at)
         SELECT ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_warmups_applied
           WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        creditedPlayer,
        userId,
        before,
        after,
        processedAt,
        proposalId
      )
  ])
  const stored = await warmUpReceipt(database, proposalId, true)
  if (!stored) throw new Error('warm-up progress receipt was not persisted')
  return stored
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
      `SELECT id, mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ConquestMatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  const conquestMode = conquestMatchMode(storedMatchModes(match))
  if (!conquestMode) {
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
        .bind(userId, conquestMode)
        .first<ActiveConquestRow>()
    )
  )
  if (!rows[0] || !rows[1]) {
    throw new Error('there is no conquest in progress')
  }

  const statements: D1PreparedStatement[] = []
  for (const player of [0, 1] as const) {
    const progress = parseConquestMatchProgress(rows[player]!.match_progress)
    progress[String(match.id)] = results[player]
    const values = Object.values(progress)
    const wins = values.filter(
      value => value === ConquestMatchResult.WIN
    ).length
    const ended = wins >= 3 || values.includes(ConquestMatchResult.LOSS)
    const rewardBundle = conquestRewardBundle(wins)
    const status = !ended
      ? ConquestStatus.IN_PROGRESS
      : rewardBundle.silver === 0 && rewardBundle.gold === 0
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
    return Array.isArray(parsed) ? sourceRewardListWire(parsed as Reward[]) : []
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
  settlementToken?: string
): Promise<MatchExperienceReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT player1_rewards_json, player2_rewards_json, processed_at,
              settlement_token
       FROM multiplayer_match_experience WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchExperienceReceiptRow>()
  if (!row) return undefined
  return {
    applied:
      settlementToken !== undefined && row.settlement_token === settlementToken,
    rewards: [
      parseRewardList(row.player1_rewards_json),
      parseRewardList(row.player2_rewards_json)
    ],
    processedAt: row.processed_at
  }
}

const rankedUnlockReward = (accountID: number): Reward =>
  sourceRewardWire({
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
  const existing = await experienceReceipt(database, proposalId)
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
                      COALESCE(MAX(
                        0,
                        stats.achieved_account_level
                          - stats.initial_account_level
                      ), 0) AS season_level,
                      (SELECT COUNT(*) FROM player_items item
                       WHERE item.user_id = profile.user_id
                         AND item.item_type = 'SW_HERO' AND item.balance > 0)
                        AS hero_count
               FROM player_profiles profile
               JOIN player_progression progression
                 ON progression.user_id = profile.user_id
               LEFT JOIN game_accounts account ON account.user_id = profile.user_id
               LEFT JOIN player_skypass_season_stats stats
                 ON stats.user_id = profile.user_id AND stats.season = ?
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
          seasonLevel: row.season_level,
          heroCount: row.hero_count
        } satisfies MatchExperiencePlayer)
      : undefined
  ) as [MatchExperiencePlayer | undefined, MatchExperiencePlayer | undefined]
  // The eligibility inputs other than level are stable for a completed match.
  // Level is deliberately forced below the source cutoff here; the serialized
  // receipt INSERT evaluates the real current level after earlier D1 batches.
  const candidatePlayers = players.map(player =>
    player ? { ...player, level: 1 } : undefined
  ) as [MatchExperiencePlayer | undefined, MatchExperiencePlayer | undefined]
  const rewards = awardMatchExperience({
    players: candidatePlayers,
    winner,
    status,
    turnCount
  })
  const statements: D1PreparedStatement[] = []
  const settlementToken = crypto.randomUUID()
  const practiceModes = new Set<GameMode>([
    GameMode.PRACTICE_PVP,
    GameMode.PRACTICE_BOT,
    GameMode.WARM_UP
  ])
  const challengeModes = new Set<GameMode>([
    GameMode.CHALLENGE_CONSTRUCTED,
    GameMode.CHALLENGE_DISCOVERY
  ])
  const matchIsPractice = players.some(
    player => player && practiceModes.has(player.gameMode)
  )
  const matchIsChallenge = players.every(
    player => !player || challengeModes.has(player.gameMode)
  )

  for (const player of [0, 1] as const) {
    const userId = userIds[player]
    const row = rows[player]
    if (!userId || !row) continue
    const priorExperienceGain = priorRewards[player].reduce(
      (total, reward) => total + (reward.exp?.amount ?? 0),
      0
    )
    const matchExperienceGain = rewards[player].reduce(
      (total, reward) => total + (reward.exp?.amount ?? 0),
      0
    )
    const cutoffApplies =
      (matchIsPractice && practiceModes.has(gameModes[player])) ||
      matchIsChallenge
    const suppressedAtLevel = cutoffApplies
      ? practiceExperienceCutoffLevel(principals[player])
      : null
    const rankRewardJson = JSON.stringify(
      rankedUnlockReward(row.account_id ?? 0)
    )
    statements.push(
      database
        .prepare(
          `WITH input(
             prior_gain, match_gain, suppressed_at_level, match_rewards_json
           ) AS (VALUES (?, ?, ?, ?)),
           state AS (
             SELECT profile.level AS before_level,
                    profile.xp AS before_xp,
                    profile.updated_at AS profile_updated_at_before,
                    progression.basic_skypass_level AS before_skypass_level,
                    progression.basic_skypass_xp AS before_skypass_xp,
                    CASE WHEN season_stats.user_id IS NULL THEN 0 ELSE 1 END
                      AS season_stats_existed_before,
                    COALESCE(season_stats.initial_account_level, -1)
                      AS season_initial_account_level_before,
                    COALESCE(season_stats.achieved_account_level, -1)
                      AS season_achieved_account_level_before,
                    input.prior_gain + CASE
                      WHEN input.suppressed_at_level IS NOT NULL
                       AND profile.level >= input.suppressed_at_level THEN 0
                      ELSE input.match_gain
                    END AS experience_gain,
                    CASE
                      WHEN input.suppressed_at_level IS NOT NULL
                       AND profile.level >= input.suppressed_at_level THEN '[]'
                      ELSE COALESCE((
                        SELECT json_group_array(json_set(
                          reward.value,
                          '$.exp.currentLevel',
                            COALESCE(MAX(
                              0,
                              season_stats.achieved_account_level
                                - season_stats.initial_account_level
                            ), 0),
                          '$.exp.beforeMatchExp', profile.xp
                        ))
                        FROM json_each(input.match_rewards_json) reward
                      ), '[]')
                    END AS rewards_json,
                    COALESCE((
                      SELECT stats.player_rank FROM player_account_stats stats
                      WHERE stats.user_id = profile.user_id
                        AND stats.game_mode = 'RANKED_CONSTRUCTED'
                        AND stats.season = ?
                    ), 'UNRANKED') AS ranked_constructed_before,
                    COALESCE((
                      SELECT stats.player_rank FROM player_account_stats stats
                      WHERE stats.user_id = profile.user_id
                        AND stats.game_mode = 'RANKED_DISCOVERY'
                        AND stats.season = ?
                    ), 'UNRANKED') AS ranked_discovery_before,
                    invite.inviter_user_id,
                    COALESCE((
                      SELECT points.levels FROM player_friend_points points
                      WHERE points.invitee_user_id = profile.user_id
                        AND points.inviter_user_id = invite.inviter_user_id
                        AND points.season = ?
                    ), 0) AS inviter_levels_before,
                    COALESCE(inviter_stickers.balance, 0)
                      AS inviter_sticker_points_before,
                    CASE WHEN inviter_stickers.id IS NULL THEN 0 ELSE 1 END
                      AS inviter_sticker_points_existed_before,
                    COALESCE(inviter_stickers.created_at, '')
                      AS inviter_sticker_points_created_at_before,
                    COALESCE(inviter_stickers.updated_at, '')
                      AS inviter_sticker_points_updated_at_before
             FROM player_profiles profile
             JOIN player_progression progression
               ON progression.user_id = profile.user_id
             CROSS JOIN input
             LEFT JOIN player_invites invite
               ON invite.invitee_user_id = profile.user_id
             LEFT JOIN player_items inviter_stickers
               ON inviter_stickers.user_id = invite.inviter_user_id
              AND inviter_stickers.item_type = 'SW_STICKER_POINTS'
              AND inviter_stickers.token_id = 0
             LEFT JOIN player_skypass_season_stats season_stats
               ON season_stats.user_id = profile.user_id
              AND season_stats.season = ?
             WHERE profile.user_id = ?
               AND NOT EXISTS (
                 SELECT 1 FROM multiplayer_match_experience
                 WHERE proposal_id = ?
               )
               AND NOT EXISTS (
                 SELECT 1 FROM multiplayer_match_experience_players
                 WHERE proposal_id = ? AND player_index = ?
               )
           ),
           calculated AS (
             SELECT *,
                    before_level + CAST(
                      (before_xp + experience_gain) / 200 AS INTEGER
                    ) AS after_level,
                    (before_xp + experience_gain) % 200 AS after_xp
             FROM state
           )
           INSERT INTO multiplayer_match_experience_players
             (proposal_id, player_index, user_id, season, settlement_token,
              experience_gain, before_level, before_xp, before_skypass_level,
              before_skypass_xp, season_stats_existed_before,
              season_initial_account_level_before,
              season_achieved_account_level_before,
              profile_updated_at_before,
              after_level, after_xp, ranked_constructed_before,
              ranked_discovery_before,
              inviter_user_id, inviter_levels_before,
              inviter_sticker_points_before,
              inviter_sticker_points_existed_before,
              inviter_sticker_points_created_at_before,
              inviter_sticker_points_updated_at_before,
              rewards_json, processed_at)
           SELECT ?, ?, ?, ?, ?, experience_gain, before_level, before_xp,
                  before_skypass_level, before_skypass_xp,
                  season_stats_existed_before,
                  season_initial_account_level_before,
                  season_achieved_account_level_before,
                  profile_updated_at_before,
                  after_level, after_xp,
                  ranked_constructed_before, ranked_discovery_before,
                  inviter_user_id,
                  inviter_levels_before, inviter_sticker_points_before,
                  inviter_sticker_points_existed_before,
                  inviter_sticker_points_created_at_before,
                  inviter_sticker_points_updated_at_before,
                  CASE
                    WHEN ((before_level - 1) * 200 + before_xp) < 200
                     AND ((after_level - 1) * 200 + after_xp) >= 200
                     AND ranked_constructed_before = 'UNRANKED'
                    THEN json_insert(json(rewards_json), '$[#]', json(?))
                    ELSE rewards_json
                  END,
                  ?
           FROM calculated`
        )
        .bind(
          priorExperienceGain,
          matchExperienceGain,
          suppressedAtLevel,
          JSON.stringify(rewards[player]),
          season,
          season,
          season,
          season,
          userId,
          proposalId,
          proposalId,
          player,
          proposalId,
          player,
          userId,
          season,
          settlementToken,
          rankRewardJson,
          processedAt
        ),
      database
        .prepare(
          `UPDATE player_profiles
           SET level = (
                 SELECT after_level
                 FROM multiplayer_match_experience_players receipt
                 WHERE receipt.proposal_id = ? AND receipt.player_index = ?
                   AND receipt.settlement_token = ?
               ),
               xp = (
                 SELECT after_xp
                 FROM multiplayer_match_experience_players receipt
                 WHERE receipt.proposal_id = ? AND receipt.player_index = ?
                   AND receipt.settlement_token = ?
               ),
               next_level_xp = 200, updated_at = ?
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM multiplayer_match_experience_players receipt
             WHERE receipt.proposal_id = ? AND receipt.player_index = ?
               AND receipt.settlement_token = ?
           )`
        )
        .bind(
          proposalId,
          player,
          settlementToken,
          proposalId,
          player,
          settlementToken,
          processedAt,
          userId,
          proposalId,
          player,
          settlementToken
        ),
      database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(basic_skypass_level, (
                 SELECT after_level
                 FROM multiplayer_match_experience_players receipt
                 WHERE receipt.proposal_id = ? AND receipt.player_index = ?
                   AND receipt.settlement_token = ?
               )),
               basic_skypass_xp = (
                 SELECT after_xp
                 FROM multiplayer_match_experience_players receipt
                 WHERE receipt.proposal_id = ? AND receipt.player_index = ?
                   AND receipt.settlement_token = ?
               ),
               basic_skypass_next_xp = 200, updated_at = ?
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM multiplayer_match_experience_players receipt
             WHERE receipt.proposal_id = ? AND receipt.player_index = ?
               AND receipt.settlement_token = ?
           )`
        )
        .bind(
          proposalId,
          player,
          settlementToken,
          proposalId,
          player,
          settlementToken,
          processedAt,
          userId,
          proposalId,
          player,
          settlementToken
        ),
      database
        .prepare(
          `INSERT INTO player_skypass_season_stats
             (user_id, season, has_premium, created_at, updated_at,
              initial_account_level, achieved_account_level)
           SELECT receipt.user_id, receipt.season, 0, ?, ?,
                  MAX(0, receipt.before_level - 1),
                  MAX(0, receipt.after_level - 1)
           FROM multiplayer_match_experience_players receipt
           WHERE receipt.proposal_id = ? AND receipt.player_index = ?
             AND receipt.settlement_token = ?
           ON CONFLICT(user_id, season) DO UPDATE SET
             achieved_account_level = MAX(
               player_skypass_season_stats.achieved_account_level,
               excluded.achieved_account_level
             ),
             updated_at = excluded.updated_at`
        )
        .bind(processedAt, processedAt, proposalId, player, settlementToken)
    )

    statements.push(
      database
        .prepare(
          `INSERT INTO player_friend_points
             (invitee_user_id, inviter_user_id, season, levels,
              points_carried, points_spent, updated_at)
           SELECT receipt.user_id, receipt.inviter_user_id, receipt.season,
                  receipt.inviter_levels_before
                    + receipt.after_level - receipt.before_level,
                  0, 0, ?
           FROM multiplayer_match_experience_players receipt
           WHERE receipt.proposal_id = ? AND receipt.player_index = ?
             AND receipt.settlement_token = ?
             AND receipt.inviter_user_id IS NOT NULL
             AND receipt.after_level > receipt.before_level
           ON CONFLICT(invitee_user_id, inviter_user_id, season)
           DO UPDATE SET levels = excluded.levels, updated_at = excluded.updated_at`
        )
        .bind(processedAt, proposalId, player, settlementToken),
      database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT receipt.inviter_user_id, 'SW_STICKER_POINTS', 0,
                  receipt.inviter_sticker_points_before
                    + receipt.after_level - receipt.before_level,
                  0, 'friend-level', ?, ?
           FROM multiplayer_match_experience_players receipt
           WHERE receipt.proposal_id = ? AND receipt.player_index = ?
             AND receipt.settlement_token = ?
             AND receipt.inviter_user_id IS NOT NULL
             AND receipt.after_level > receipt.before_level
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = excluded.balance, updated_at = excluded.updated_at`
        )
        .bind(processedAt, processedAt, proposalId, player, settlementToken)
    )

    for (const mode of [
      GameMode.RANKED_CONSTRUCTED,
      GameMode.RANKED_DISCOVERY
    ]) {
      const rankedBeforeColumn =
        mode === GameMode.RANKED_CONSTRUCTED
          ? 'ranked_constructed_before'
          : 'ranked_discovery_before'
      const unlockGuard = `EXISTS (
        SELECT 1 FROM multiplayer_match_experience_players receipt
        WHERE receipt.proposal_id = ? AND receipt.player_index = ?
          AND receipt.settlement_token = ?
          AND ((receipt.before_level - 1) * 200 + receipt.before_xp) < 200
          AND ((receipt.after_level - 1) * 200 + receipt.after_xp) >= 200
          AND receipt.${rankedBeforeColumn} = 'UNRANKED'
      )`
      statements.push(
        accountStatSnapshotStatement(
          database,
          proposalId,
          'EXPERIENCE_UNLOCK',
          player,
          userId,
          mode,
          season,
          settlementToken
        ),
        database
          .prepare(
            `INSERT OR IGNORE INTO player_account_stats
               (user_id, game_mode, season, created_at, updated_at)
             SELECT ?, ?, ?, ?, ? WHERE ${unlockGuard}`
          )
          .bind(
            userId,
            mode,
            season,
            processedAt,
            processedAt,
            proposalId,
            player,
            settlementToken
          ),
        database
          .prepare(
            `UPDATE player_account_stats
             SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
                 score = 0, player_rank_state = ?, updated_at = ?
             WHERE user_id = ? AND game_mode = ? AND season = ?
               AND player_rank = 'UNRANKED' AND ${unlockGuard}`
          )
          .bind(
            INITIAL_RANK_STATE_JSON,
            processedAt,
            userId,
            mode,
            season,
            proposalId,
            player,
            settlementToken
          ),
        accountStatOutcomeStatement(
          database,
          proposalId,
          'EXPERIENCE_UNLOCK',
          player,
          userId,
          mode,
          season,
          settlementToken
        )
      )
    }
  }

  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_experience
           (proposal_id, player1_rewards_json, player2_rewards_json,
            processed_at, player_count, settlement_token)
         SELECT ?,
                COALESCE((
                  SELECT rewards_json
                  FROM multiplayer_match_experience_players receipt
                  WHERE receipt.proposal_id = ? AND receipt.player_index = 0
                    AND receipt.settlement_token = ?
                ), '[]'),
                COALESCE((
                  SELECT rewards_json
                  FROM multiplayer_match_experience_players receipt
                  WHERE receipt.proposal_id = ? AND receipt.player_index = 1
                    AND receipt.settlement_token = ?
                ), '[]'),
                ?, (
                  SELECT COUNT(*)
                  FROM multiplayer_match_experience_players receipt
                  WHERE receipt.proposal_id = ?
                    AND receipt.settlement_token = ?
                ), ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_experience WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        proposalId,
        settlementToken,
        proposalId,
        settlementToken,
        processedAt,
        proposalId,
        settlementToken,
        settlementToken,
        proposalId
      )
  )
  await database.batch(statements)
  const stored = await experienceReceipt(database, proposalId, settlementToken)
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

const MASTER_POINTS = 1_200
const GRANDWEAVER_COUNT = 100
const MISSING_ACCOUNT_SORT_ID = Number.MAX_SAFE_INTEGER

type AccountStatPublicationPhase = 'RANKED_STATS' | 'EXPERIENCE_UNLOCK'

export class RankPublicationPendingError extends Error {
  constructor() {
    super('waiting_for_match_publication')
    this.name = 'RankPublicationPendingError'
  }
}

const conflictingRankPublication = async (
  database: D1Database,
  proposalId: string,
  participants: ReadonlyArray<{
    userId: string
    gameMode: GameMode
  }>,
  season: number
) => {
  if (participants.length === 0) return false
  const participantSQL = participants
    .map(() => '(pending.user_id = ? AND pending.game_mode = ?)')
    .join(' OR ')
  const conflict = await database
    .prepare(
      `SELECT 1
       FROM multiplayer_match_account_stat_snapshots pending
       JOIN multiplayer_matches pending_match
         ON pending_match.proposal_id = pending.proposal_id
       WHERE pending.proposal_id <> ? AND pending.season = ?
         AND pending_match.status <> 'ended'
         AND (${participantSQL})
       LIMIT 1`
    )
    .bind(
      proposalId,
      season,
      ...participants.flatMap(participant => [
        participant.userId,
        participant.gameMode
      ])
    )
    .first()
  return conflict !== null
}

const accountStatSnapshotStatement = (
  database: D1Database,
  proposalId: string,
  phase: AccountStatPublicationPhase,
  player: 0 | 1,
  userId: string,
  gameMode: GameMode,
  season: number,
  experienceSettlementToken?: string
) => {
  const experienceRankColumn =
    gameMode === GameMode.RANKED_CONSTRUCTED
      ? 'ranked_constructed_before'
      : 'ranked_discovery_before'
  return database
    .prepare(
      `INSERT OR IGNORE INTO multiplayer_match_account_stat_snapshots
         (proposal_id, phase, player_index, user_id, game_mode, season,
          stat_existed_before, before_win_count, before_loss_count,
          before_tie_count, before_forfeit_count, before_abandon_count,
          before_score, before_player_rank, before_player_rank_stage,
          before_player_rank_state, before_win_streak, before_loss_streak,
          before_created_at, before_updated_at)
       SELECT ?, ?, ?, account.id, ?, ?,
              CASE WHEN stats.user_id IS NULL THEN 0 ELSE 1 END,
              COALESCE(stats.win_count, 0), COALESCE(stats.loss_count, 0),
              COALESCE(stats.tie_count, 0), COALESCE(stats.forfeit_count, 0),
              COALESCE(stats.abandon_count, 0), COALESCE(stats.score, 0),
              COALESCE(stats.player_rank, 'UNRANKED'),
              COALESCE(stats.player_rank_stage, 'STAGE_NONE'),
              COALESCE(stats.player_rank_state, ''),
              COALESCE(stats.win_streak, 0),
              COALESCE(stats.loss_streak, 0),
              COALESCE(stats.created_at, ''), COALESCE(stats.updated_at, '')
       FROM users account
       LEFT JOIN player_account_stats stats
         ON stats.user_id = account.id AND stats.game_mode = ?
        AND stats.season = ?
       WHERE account.id = ?
         ${
           experienceSettlementToken
             ? `AND EXISTS (
           SELECT 1 FROM multiplayer_match_experience_players receipt
           WHERE receipt.proposal_id = ? AND receipt.player_index = ?
             AND receipt.settlement_token = ?
             AND ((receipt.before_level - 1) * 200 + receipt.before_xp) < 200
             AND ((receipt.after_level - 1) * 200 + receipt.after_xp) >= 200
             AND receipt.${experienceRankColumn} = 'UNRANKED'
         )`
             : ''
         }
         AND NOT EXISTS (
           SELECT 1
           FROM multiplayer_match_account_stat_snapshots pending
           JOIN multiplayer_matches pending_match
             ON pending_match.proposal_id = pending.proposal_id
           WHERE pending.user_id = account.id
             AND pending.game_mode = ? AND pending.season = ?
             AND pending.proposal_id <> ?
             AND pending_match.status <> 'ended'
         )`
    )
    .bind(
      proposalId,
      phase,
      player,
      gameMode,
      season,
      gameMode,
      season,
      userId,
      ...(experienceSettlementToken
        ? [proposalId, player, experienceSettlementToken]
        : []),
      gameMode,
      season,
      proposalId
    )
}

const accountStatOutcomeStatement = (
  database: D1Database,
  proposalId: string,
  phase: AccountStatPublicationPhase,
  player: 0 | 1,
  userId: string,
  gameMode: GameMode,
  season: number,
  experienceSettlementToken?: string
) =>
  database
    .prepare(
      `INSERT INTO multiplayer_match_account_stat_outcomes
         (proposal_id, phase, player_index, user_id, game_mode, season,
          after_win_count, after_loss_count, after_tie_count,
          after_forfeit_count, after_abandon_count, after_score,
          after_player_rank, after_player_rank_stage,
          after_player_rank_state, after_win_streak, after_loss_streak,
          after_created_at, after_updated_at)
       SELECT snapshot.proposal_id, snapshot.phase, snapshot.player_index,
              stats.user_id, stats.game_mode, stats.season,
              stats.win_count, stats.loss_count, stats.tie_count,
              stats.forfeit_count, stats.abandon_count, stats.score,
              stats.player_rank, stats.player_rank_stage,
              stats.player_rank_state, stats.win_streak, stats.loss_streak,
              stats.created_at, stats.updated_at
       FROM multiplayer_match_account_stat_snapshots snapshot
       JOIN player_account_stats stats
         ON stats.user_id = snapshot.user_id
        AND stats.game_mode = snapshot.game_mode
        AND stats.season = snapshot.season
       WHERE snapshot.proposal_id = ? AND snapshot.phase = ?
         AND snapshot.player_index = ? AND snapshot.user_id = ?
         AND snapshot.game_mode = ? AND snapshot.season = ?
         ${
           experienceSettlementToken
             ? `AND EXISTS (
           SELECT 1 FROM multiplayer_match_experience_players receipt
           WHERE receipt.proposal_id = snapshot.proposal_id
             AND receipt.player_index = snapshot.player_index
             AND receipt.settlement_token = ?
         )`
             : ''
         }`
    )
    .bind(
      proposalId,
      phase,
      player,
      userId,
      gameMode,
      season,
      ...(experienceSettlementToken ? [experienceSettlementToken] : [])
    )

const rankContext = async (
  database: D1Database,
  gameMode: GameMode,
  season: number,
  target: RankProjection,
  projections: RankProjection[] = []
): Promise<RankRewardContext> => {
  const overrides = projections.filter(projection => projection.user_id !== '')
  const overrideValues = overrides.length
    ? `VALUES ${overrides.map(() => '(?, ?, ?, ?)').join(', ')}`
    : 'SELECT NULL, NULL, NULL, NULL WHERE 0'
  const overrideBindings = overrides.flatMap(projection => [
    projection.user_id,
    projection.score,
    projection.player_rank,
    projection.updated_at
  ])
  const row = await database
    .prepare(
      `WITH ${publishedAccountStatsCTESQL()},
       overrides(user_id, score, player_rank, updated_at) AS (
         ${overrideValues}
       ),
       standings AS (
         SELECT stats.user_id,
                COALESCE(account.id, ${MISSING_ACCOUNT_SORT_ID})
                  AS account_sort_id,
                COALESCE(overrides.score, stats.score) AS score,
                COALESCE(overrides.player_rank, stats.player_rank)
                  AS player_rank,
                COALESCE(overrides.updated_at, stats.updated_at) AS updated_at
         FROM source_visible_account_stats stats
         LEFT JOIN overrides ON overrides.user_id = stats.user_id
         LEFT JOIN game_accounts account ON account.user_id = stats.user_id
         LEFT JOIN player_account_settings settings
           ON settings.user_id = stats.user_id
         WHERE stats.game_mode = ? AND stats.season = ?
           AND COALESCE(settings.account_status, 'ACTIVE') NOT IN (
             'BANNED', 'SUSPENDED', 'DELETED'
           )
       ),
       target(user_id, account_sort_id, score, player_rank, updated_at) AS (
         VALUES (?, ?, ?, ?, ?)
       )
       SELECT
         (
           SELECT COUNT(*) FROM standings above, target
           WHERE (
             (target.player_rank NOT IN ('MASTER', 'GRANDWEAVER')
               AND above.player_rank = target.player_rank)
             OR (target.player_rank = 'MASTER'
               AND above.player_rank IN ('MASTER', 'GRANDWEAVER'))
             OR (target.player_rank = 'GRANDWEAVER'
               AND above.player_rank = 'GRANDWEAVER')
           )
           AND (
             above.score > target.score
             OR (above.score = target.score
               AND above.updated_at < target.updated_at)
             OR (above.score = target.score
               AND above.updated_at = target.updated_at
               AND above.account_sort_id < target.account_sort_id)
             OR (above.score = target.score
               AND above.updated_at = target.updated_at
               AND above.account_sort_id = target.account_sort_id
               AND above.user_id < target.user_id)
             OR above.user_id = target.user_id
           )
         ) AS rank_position,
         (
           SELECT COUNT(*) FROM standings above, target
           WHERE above.player_rank IN ('MASTER', 'GRANDWEAVER')
             AND (
               above.score > target.score
               OR (above.score = target.score
                 AND above.updated_at < target.updated_at)
               OR (above.score = target.score
                 AND above.updated_at = target.updated_at
                 AND above.account_sort_id < target.account_sort_id)
               OR (above.score = target.score
                 AND above.updated_at = target.updated_at
                 AND above.account_sort_id = target.account_sort_id
                 AND above.user_id < target.user_id)
               OR above.user_id = target.user_id
             )
         ) AS master_position,
         (
           SELECT candidate.score FROM standings candidate, target
           WHERE candidate.player_rank IN ('MASTER', 'GRANDWEAVER')
             AND candidate.user_id <> target.user_id
             AND candidate.score <= target.score
           ORDER BY candidate.score DESC, candidate.updated_at ASC,
                    candidate.account_sort_id ASC, candidate.user_id ASC
           LIMIT 1
         ) AS score_below,
         (
           SELECT candidate.score FROM standings candidate, target
           WHERE candidate.player_rank IN ('MASTER', 'GRANDWEAVER')
             AND candidate.user_id <> target.user_id
             AND candidate.score >= target.score
           ORDER BY candidate.score ASC, candidate.updated_at DESC,
                    candidate.account_sort_id DESC, candidate.user_id DESC
           LIMIT 1
         ) AS score_above,
         (
           SELECT score FROM (
             SELECT candidate.score, candidate.updated_at,
                    candidate.account_sort_id, candidate.user_id
             FROM standings candidate
             WHERE candidate.player_rank IN ('MASTER', 'GRANDWEAVER')
             ORDER BY candidate.score DESC, candidate.updated_at ASC,
                      candidate.account_sort_id ASC, candidate.user_id ASC
             LIMIT ${GRANDWEAVER_COUNT}
           ) grandweavers
           ORDER BY score ASC, updated_at DESC, account_sort_id DESC,
                    user_id DESC
           LIMIT 1
         ) AS grandweaver_floor`
    )
    .bind(
      ...overrideBindings,
      gameMode,
      season,
      target.user_id,
      target.account_id ?? MISSING_ACCOUNT_SORT_ID,
      target.score,
      target.player_rank,
      target.updated_at
    )
    .first<RankContextRow>()
  if (!row) throw new Error('rank context could not be calculated')

  const masterEligible = target.score >= MASTER_POINTS
  const isGrandweaver =
    masterEligible &&
    row.master_position > 0 &&
    row.master_position <= GRANDWEAVER_COUNT
  const adjustedPosition =
    [PlayerRank.MASTER, PlayerRank.GRANDWEAVER].includes(target.player_rank) &&
    row.rank_position > GRANDWEAVER_COUNT
      ? row.rank_position - GRANDWEAVER_COUNT
      : row.rank_position
  return {
    rankPosition: adjustedPosition,
    scoreBelow: isGrandweaver ? (row.score_below ?? 0) : 0,
    scoreAbove: isGrandweaver
      ? (row.score_above ?? 0)
      : masterEligible
        ? (row.grandweaver_floor ?? 0)
        : 0,
    displayRank: masterEligible
      ? isGrandweaver
        ? PlayerRank.GRANDWEAVER
        : PlayerRank.MASTER
      : target.player_rank
  }
}

const rankData = (
  rank: PlayerRank,
  stage: PlayerRankStage,
  definition: RankDefinition,
  score: number,
  context: RankRewardContext,
  displayRank = rank
) => ({
  rank: displayRank,
  rankStage: stage,
  requiredRankPoints: nextRankPoints(definition),
  rankPosition: context.rankPosition,
  score,
  scoreAbove: context.scoreAbove,
  scoreBelow: context.scoreBelow
})

const grandweaverStatements = (
  database: D1Database,
  proposalId: string,
  gameMode: GameMode,
  season: number,
  attemptCount: number,
  attemptedAt: string
): D1PreparedStatement[] => [
  database
    .prepare(
      `UPDATE player_account_stats
       SET player_rank = 'MASTER'
       WHERE game_mode = ? AND season = ?
         AND player_rank IN ('MASTER', 'GRANDWEAVER')
         AND NOT EXISTS (
           SELECT 1 FROM player_account_settings settings
           WHERE settings.user_id = player_account_stats.user_id
             AND settings.account_status IN ('BANNED', 'SUSPENDED', 'DELETED')
         )
         AND ${noUnpublishedAccountStatsInScopeSQL(
           String(season),
           `'${gameMode}'`
         )}
         AND EXISTS (
           SELECT 1 FROM multiplayer_grandweaver_jobs job
           WHERE job.proposal_id = ? AND job.status = 'PENDING'
             AND job.attempt_count = ? AND job.last_attempt_at = ?
         )`
    )
    .bind(gameMode, season, proposalId, attemptCount, attemptedAt),
  database
    .prepare(
      `UPDATE player_account_stats SET player_rank = 'GRANDWEAVER'
       WHERE rowid IN (
         SELECT stats.rowid FROM player_account_stats stats
         LEFT JOIN game_accounts account ON account.user_id = stats.user_id
         LEFT JOIN player_account_settings settings
           ON settings.user_id = stats.user_id
         WHERE stats.game_mode = ? AND stats.season = ?
           AND stats.player_rank = 'MASTER'
           AND COALESCE(settings.account_status, 'ACTIVE') NOT IN (
             'BANNED', 'SUSPENDED', 'DELETED'
           )
         ORDER BY stats.score DESC, stats.updated_at ASC,
                  COALESCE(account.id, ${MISSING_ACCOUNT_SORT_ID}) ASC,
                  stats.user_id ASC
         LIMIT ${GRANDWEAVER_COUNT}
       )
       AND ${noUnpublishedAccountStatsInScopeSQL(
         String(season),
         `'${gameMode}'`
       )}
       AND EXISTS (
         SELECT 1 FROM multiplayer_grandweaver_jobs job
         WHERE job.proposal_id = ? AND job.status = 'PENDING'
           AND job.attempt_count = ? AND job.last_attempt_at = ?
       )`
    )
    .bind(gameMode, season, proposalId, attemptCount, attemptedAt)
]

interface GrandweaverJobRow {
  proposal_id: string
  game_mode: GameMode
  season: number
  status: 'PENDING' | 'APPLIED' | 'FAILED'
  attempt_count: number
  created_at: string
  last_attempt_at: string | null
  next_attempt_at: string | null
  applied_at: string | null
}

export interface GrandweaverJobReceipt {
  state: 'not_required' | 'pending' | 'applied' | 'failed'
  attemptCount: number
  createdAt?: string
  lastAttemptAt?: string
  nextAttemptAt?: string
  appliedAt?: string
}

export const GRANDWEAVER_RETRY_DELAY_MS = 15_000
export const GRANDWEAVER_MAX_ATTEMPTS = 5

const canonicalTimestamp = (value: string) => {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

const readGrandweaverJob = (
  database: D1Database,
  proposalId: string
): Promise<GrandweaverJobRow | null> =>
  database
    .prepare(
      `SELECT proposal_id, game_mode, season, status, attempt_count,
              created_at, last_attempt_at, next_attempt_at, applied_at
       FROM multiplayer_grandweaver_jobs WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<GrandweaverJobRow>()

const grandweaverJobReceipt = (
  job: GrandweaverJobRow | null
): GrandweaverJobReceipt =>
  job
    ? {
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
      }
    : { state: 'not_required', attemptCount: 0 }

/**
 * Reads the post-commit responsibility without running it. InternalMatchEnd
 * only enqueues PromoteGrandmastersTask; terminal clients must not wait for
 * the worker's first attempt.
 */
export const publishedGrandweaverJob = async (
  database: D1Database,
  proposalId: string
): Promise<GrandweaverJobReceipt> =>
  grandweaverJobReceipt(await readGrandweaverJob(database, proposalId))

const failExhaustedGrandweaverJob = async (
  database: D1Database,
  proposalId: string
) => {
  const failed = await database
    .prepare(
      `UPDATE multiplayer_grandweaver_jobs
       SET status = 'FAILED', next_attempt_at = NULL
       WHERE proposal_id = ? AND status = 'PENDING' AND attempt_count = ?`
    )
    .bind(proposalId, GRANDWEAVER_MAX_ATTEMPTS)
    .run()
  if ((failed.meta.changes ?? 0) !== 1) {
    throw new Error('Grandweaver job exhaustion was not persisted')
  }
}

/**
 * Runs one source PromoteGrandmastersRunner attempt after terminal
 * publication. Attempt state is committed before the atomic rank batch so an
 * eviction cannot lose its linear retry deadline.
 */
export const runPublishedGrandweaverJob = async (
  database: D1Database,
  proposalId: string,
  attemptedAt: string
): Promise<GrandweaverJobReceipt> => {
  if (!canonicalTimestamp(attemptedAt)) {
    throw new Error('Grandweaver attempt time is invalid')
  }
  let job = await readGrandweaverJob(database, proposalId)
  if (!job || job.status !== 'PENDING') return grandweaverJobReceipt(job)

  const ledgerStatus = await database
    .prepare('SELECT status FROM multiplayer_matches WHERE proposal_id = ?')
    .bind(proposalId)
    .first<string>('status')
  if (ledgerStatus !== 'ended') return grandweaverJobReceipt(job)
  if (
    job.next_attempt_at &&
    Date.parse(job.next_attempt_at) > Date.parse(attemptedAt)
  ) {
    return grandweaverJobReceipt(job)
  }
  if (job.attempt_count >= GRANDWEAVER_MAX_ATTEMPTS) {
    await failExhaustedGrandweaverJob(database, proposalId)
    return grandweaverJobReceipt(await readGrandweaverJob(database, proposalId))
  }

  const attemptCount = job.attempt_count + 1
  const nextAttemptAt = new Date(
    Date.parse(attemptedAt) + GRANDWEAVER_RETRY_DELAY_MS * attemptCount
  ).toISOString()
  const started = await database
    .prepare(
      `UPDATE multiplayer_grandweaver_jobs
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
    return grandweaverJobReceipt(await readGrandweaverJob(database, proposalId))
  }

  job = await readGrandweaverJob(database, proposalId)
  if (!job) throw new Error('Grandweaver job disappeared')
  const scopeReady = noUnpublishedAccountStatsInScopeSQL(
    String(job.season),
    `'${job.game_mode}'`
  )
  try {
    await database.batch([
      ...grandweaverStatements(
        database,
        proposalId,
        job.game_mode,
        job.season,
        attemptCount,
        attemptedAt
      ),
      database
        .prepare(
          `UPDATE multiplayer_grandweaver_jobs
           SET status = 'APPLIED', next_attempt_at = NULL, applied_at = ?
           WHERE proposal_id = ? AND status = 'PENDING'
             AND attempt_count = ? AND last_attempt_at = ?
             AND ${scopeReady}`
        )
        .bind(attemptedAt, proposalId, attemptCount, attemptedAt)
    ])
  } catch (error) {
    console.error('Grandweaver task failed', proposalId, error)
  }

  job = await readGrandweaverJob(database, proposalId)
  if (!job) throw new Error('Grandweaver job disappeared')
  if (job.status === 'PENDING' && attemptCount >= GRANDWEAVER_MAX_ATTEMPTS) {
    await failExhaustedGrandweaverJob(database, proposalId)
    job = await readGrandweaverJob(database, proposalId)
    if (!job) throw new Error('Grandweaver job disappeared')
  }
  return grandweaverJobReceipt(job)
}

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
  status: MatchStatus,
  processedAt: string
): Promise<MatchStatsReceipt> => {
  const match = await database
    .prepare(
      `SELECT mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchStatsRow>()
  if (!match) throw new Error('match ledger row was not found')
  const modes = storedMatchModes(match)
  if (!isRankedMatchModes(modes)) {
    return { applied: false, rewards: [[], []], processedAt }
  }
  if (!Number.isSafeInteger(season) || season < 1 || season > 10_000) {
    throw new Error('match season is invalid')
  }

  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const existing = await statsReceipt(database, proposalId, false)
  if (existing) return existing

  const rankedParticipants = userIds.flatMap((userId, player) =>
    userId && isRankedGameMode(modes[player])
      ? [{ userId, player: player as 0 | 1, gameMode: modes[player] }]
      : []
  )
  if (rankedParticipants.length > 0) {
    if (
      await conflictingRankPublication(
        database,
        proposalId,
        rankedParticipants,
        season
      )
    ) {
      throw new RankPublicationPendingError()
    }
    await database.batch(
      rankedParticipants.map(participant =>
        accountStatSnapshotStatement(
          database,
          proposalId,
          'RANKED_STATS',
          participant.player,
          participant.userId,
          participant.gameMode,
          season
        )
      )
    )
    const snapshotCount = await database
      .prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_account_stat_snapshots
         WHERE proposal_id = ? AND phase = 'RANKED_STATS'`
      )
      .bind(proposalId)
      .first<{ count: number }>()
    if (snapshotCount?.count !== rankedParticipants.length) {
      if (
        await conflictingRankPublication(
          database,
          proposalId,
          rankedParticipants,
          season
        )
      ) {
        throw new RankPublicationPendingError()
      }
      throw new Error('ranked account-stat snapshot is incomplete')
    }
  }

  const initializers = rankedParticipants.map(participant =>
    database
      .prepare(
        `INSERT OR IGNORE INTO player_account_stats
           (user_id, game_mode, season, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        participant.userId,
        participant.gameMode,
        season,
        processedAt,
        processedAt
      )
  )
  if (initializers.length > 0) await database.batch(initializers)

  const accountStats = await Promise.all(
    userIds.map((userId, player) =>
      userId
        ? isRankedGameMode(modes[player])
          ? database
              .prepare(
                `SELECT stats.user_id, account.id AS account_id,
                      stats.win_count, stats.loss_count, stats.tie_count,
                      stats.forfeit_count, stats.abandon_count, stats.score,
                      stats.player_rank, stats.player_rank_stage,
                      stats.player_rank_state, stats.win_streak,
                      stats.loss_streak, stats.created_at, stats.updated_at,
                      profile.level, profile.xp,
                      CASE WHEN progression.user_id IS NULL THEN NULL
                        ELSE COALESCE(MAX(
                          0,
                          skypass.achieved_account_level
                            - skypass.initial_account_level
                        ), 0)
                      END AS season_level
               FROM player_account_stats stats
               LEFT JOIN game_accounts account ON account.user_id = stats.user_id
               LEFT JOIN player_profiles profile ON profile.user_id = stats.user_id
               LEFT JOIN player_progression progression
                 ON progression.user_id = stats.user_id
               LEFT JOIN player_skypass_season_stats skypass
                 ON skypass.user_id = stats.user_id
                AND skypass.season = stats.season
               WHERE stats.user_id = ? AND stats.game_mode = ? AND stats.season = ?`
              )
              .bind(userId, modes[player], season)
              .first<AccountStatsRow>()
          : Promise.resolve({
              user_id: userId,
              account_id: null,
              win_count: 0,
              loss_count: 0,
              tie_count: 0,
              forfeit_count: 0,
              abandon_count: 0,
              score: 0,
              player_rank: PlayerRank.UNKNOWN,
              player_rank_stage: PlayerRankStage.STAGE_NONE,
              // FindOrCreateByAccountIDAndMode returns an ephemeral zero-value
              // AccountStat for Practice. It still participates in the ordered
              // Glicko calculation, but mayPersistStats prevents saving it.
              player_rank_state: '[-1,0,0,0]',
              win_streak: 0,
              loss_streak: 0,
              created_at: processedAt,
              level: null,
              xp: null,
              season_level: null,
              updated_at: processedAt
            } satisfies AccountStatsRow)
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
  const transitions: [
    RankedTransition | undefined,
    RankedTransition | undefined
  ] = [undefined, undefined]

  for (const player of [0, 1] as const) {
    const userId = userIds[player]
    const stats = accountStats[player]
    if (!userId || !stats) continue
    if (!isRankedGameMode(modes[player])) continue
    const won = winner === player ? 1 : 0
    const tied = winner === undefined ? 1 : 0
    const lost = winner !== undefined && winner !== player ? 1 : 0
    // The source counts a terminal abandonment/forfeit in addition to the
    // ordinary loss, and only against the losing ranked account.
    const abandoned = status === MatchStatus.ABANDONED && lost === 1 ? 1 : 0
    const forfeited = status === MatchStatus.FORFEITED && lost === 1 ? 1 : 0
    const opponent = player === 0 ? 1 : 0
    const canUpdateRank =
      ranked(stats.player_rank) &&
      oldStates[player] !== undefined &&
      oldStates[opponent] !== undefined
    let score = stats.score
    let playerRank = stats.player_rank
    let playerRankStage = stats.player_rank_stage
    let playerRankState = stats.player_rank_state
    let currentDefinition: RankDefinition | undefined
    let nextDefinition: RankDefinition | undefined

    if (canUpdateRank) {
      currentDefinition = lookupRankByScore(stats.score)
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
      nextDefinition = protectedResult.rank

      if (
        outcomes[player] === 1 &&
        rankStageIncreased(protectedResult.rank, currentDefinition) &&
        protectedResult.rank.experienceReward > 0 &&
        stats.level !== null &&
        stats.xp !== null &&
        stats.season_level !== null
      ) {
        const alreadyAwarded = await database
          .prepare(
            `SELECT 1 FROM player_rank_up_rewards
             WHERE user_id = ? AND game_mode = ? AND season = ?
               AND player_rank = ? AND player_rank_stage = ?`
          )
          .bind(userId, modes[player], season, playerRank, playerRankStage)
          .first()
        if (!alreadyAwarded) {
          rewards[player].push(
            experienceReward(
              {
                accountID: stats.account_id ?? 0,
                principal: '',
                gameMode: modes[player],
                level: stats.level,
                experience: stats.xp,
                seasonLevel: stats.season_level,
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
                modes[player],
                season,
                playerRank,
                playerRankStage,
                proposalId,
                processedAt
              )
          )
        }
      }
    }

    transitions[player] = {
      score,
      playerRank,
      playerRankStage,
      playerRankState,
      currentDefinition,
      nextDefinition
    }

    statements.push(
      database
        .prepare(
          `UPDATE player_account_stats
           SET win_count = win_count + ?,
               loss_count = loss_count + ?,
               tie_count = tie_count + ?,
               forfeit_count = forfeit_count + ?,
               abandon_count = abandon_count + ?,
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
          forfeited,
          abandoned,
          won,
          lost,
          score,
          playerRank,
          playerRankStage,
          playerRankState,
          processedAt,
          userId,
          modes[player],
          season,
          proposalId
        ),
      accountStatOutcomeStatement(
        database,
        proposalId,
        'RANKED_STATS',
        player,
        userId,
        modes[player],
        season
      )
    )
  }

  const projectedRanks = transitions.flatMap((transition, player) => {
    const stats = accountStats[player]
    if (!transition || !stats || !ranked(stats.player_rank)) return []
    return [
      {
        user_id: stats.user_id,
        account_id: stats.account_id,
        game_mode: modes[player],
        score: transition.score,
        player_rank: transition.playerRank,
        updated_at: processedAt
      } satisfies RankProjection
    ]
  })
  for (const player of [0, 1] as const) {
    const stats = accountStats[player]
    const transition = transitions[player]
    if (
      !stats ||
      !transition?.currentDefinition ||
      !transition.nextDefinition ||
      !isRankedGameMode(modes[player])
    ) {
      continue
    }
    const afterProjection = projectedRanks.find(
      projection => projection.user_id === stats.user_id
    )!
    const modeProjections = projectedRanks.filter(
      projection => projection.game_mode === modes[player]
    )
    const [beforeContext, afterContext] = await Promise.all([
      rankContext(database, modes[player], season, stats),
      winner === undefined
        ? Promise.resolve({
            rankPosition: 0,
            scoreBelow: 0,
            scoreAbove: 0,
            displayRank: transition.playerRank
          } satisfies RankRewardContext)
        : rankContext(
            database,
            modes[player],
            season,
            afterProjection,
            modeProjections
          )
    ])
    rewards[player].push(
      sourceRewardWire({
        accountID: stats.account_id ?? 0,
        type: RewardType.RANK,
        gameMode: modes[player],
        rank: {
          beforeMatch: rankData(
            stats.player_rank,
            stats.player_rank_stage,
            transition.currentDefinition,
            stats.score,
            beforeContext
          ),
          afterMatch: rankData(
            transition.playerRank,
            transition.playerRankStage,
            transition.nextDefinition,
            transition.score,
            afterContext,
            afterContext.displayRank
          )
        }
      })
    )
  }
  const grandweaverMode = modes.find(isRankedGameMode)
  const requiresGrandweaverJob = rewards
    .flat()
    .some(
      reward =>
        reward.type === RewardType.RANK &&
        reward.rank?.afterMatch !== undefined &&
        [PlayerRank.MASTER, PlayerRank.GRANDWEAVER].includes(
          reward.rank.afterMatch.rank
        )
    )
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
  if (requiresGrandweaverJob && grandweaverMode) {
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO multiplayer_grandweaver_jobs
             (proposal_id, game_mode, season, status, created_at, applied_at)
           SELECT ?, ?, ?, 'PENDING', ?, NULL
           WHERE EXISTS (
             SELECT 1 FROM multiplayer_match_stats_applied
             WHERE proposal_id = ?
           )`
        )
        .bind(proposalId, grandweaverMode, season, processedAt, proposalId)
    )
  }
  await database.batch(statements)
  const stored = await statsReceipt(database, proposalId, true)
  if (!stored) throw new Error('ranked match receipt was not persisted')
  return stored
}
