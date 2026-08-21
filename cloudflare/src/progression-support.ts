import type { GameMode, PlayerRank, PlayerRankStage } from '@opensky/proto'
import { INITIAL_RANK_STATE_JSON } from '@opensky/shared/ranked-progression'

import { invalidArgument, notFound } from './errors'
import { noUnpublishedMatchExperienceSQL } from './experience-publication'
import { seasonFromDate } from './legacy-seasons'
import {
  noUnpublishedAccountStatsInScopeSQL,
  noUnpublishedAccountStatsSQL,
  publishedAccountStatsCTESQL
} from './rank-publication'

const RANKED_MODES = ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'] as const
const RP_MODES = new Set<GameMode>([
  'RANKED_CONSTRUCTED' as GameMode,
  'RANKED_DISCOVERY' as GameMode,
  'CONQUEST_CONSTRUCTED' as GameMode,
  'CONQUEST_DISCOVERY' as GameMode
])
const MAX_UINT16 = 65_535
const MINIMUM_RP = 200
const MINIMUM_SOURCE_LEVEL_FOR_RP = 15
const MAX_SOURCE_LEVEL_IN_TOTAL_EXPERIENCE = 1001
// The source account begins at level 0; Cloud Weasel's established identity
// profile begins at level 1 for the same zero lifetime XP.
const CLOUDFLARE_LEVEL_OFFSET = 1
const MAX_CLOUDFLARE_LEVEL_IN_TOTAL_EXPERIENCE =
  MAX_SOURCE_LEVEL_IN_TOTAL_EXPERIENCE + CLOUDFLARE_LEVEL_OFFSET
const MINIMUM_CLOUDFLARE_LEVEL_FOR_RP =
  MINIMUM_SOURCE_LEVEL_FOR_RP + CLOUDFLARE_LEVEL_OFFSET
export const STAFF_PROGRESSION_OPERATION_HEADER = 'x-cloud-weasel-operation-key'
const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface ProgressTargetRow {
  user_id: string
  level: number
  xp: number
  skypass_level: number
  inviter_user_id: string | null
}

interface StatRow {
  game_mode: GameMode
  score: number
  player_rank: PlayerRank
  player_rank_stage: PlayerRankStage
  player_rank_state: string
}

interface RankDefinition {
  rank: PlayerRank
  stage: PlayerRankStage
}

interface ProgressionOperationRow {
  operation_key: string
  actor_user_id: string
  target_user_id: string
  requested_levels: number
  status: 'PREPARING' | 'APPLIED'
}

const rankForRP = (rp: number): RankDefinition => {
  if (rp >= 1200) {
    return {
      rank: 'MASTER' as PlayerRank,
      stage: 'STAGE_NONE' as PlayerRankStage
    }
  }
  const bands: Array<[number, PlayerRank, PlayerRankStage]> = [
    [1100, 'EXPERT' as PlayerRank, 'STAGE_III' as PlayerRankStage],
    [1000, 'EXPERT' as PlayerRank, 'STAGE_II' as PlayerRankStage],
    [900, 'EXPERT' as PlayerRank, 'STAGE_I' as PlayerRankStage],
    [800, 'APPRENTICE' as PlayerRank, 'STAGE_III' as PlayerRankStage],
    [700, 'APPRENTICE' as PlayerRank, 'STAGE_II' as PlayerRankStage],
    [600, 'APPRENTICE' as PlayerRank, 'STAGE_I' as PlayerRankStage],
    [500, 'TRAINEE' as PlayerRank, 'STAGE_III' as PlayerRankStage],
    [400, 'TRAINEE' as PlayerRank, 'STAGE_II' as PlayerRankStage],
    [300, 'TRAINEE' as PlayerRank, 'STAGE_I' as PlayerRankStage],
    [200, 'WANDERER' as PlayerRank, 'STAGE_III' as PlayerRankStage]
  ]
  const found = bands.find(([minimum]) => rp >= minimum)!
  return { rank: found[1], stage: found[2] }
}

const statSnapshot = (stat: StatRow | null) =>
  stat
    ? {
        gameMode: stat.game_mode,
        score: stat.score,
        playerRank: stat.player_rank,
        playerRankStage: stat.player_rank_stage,
        playerRankState: stat.player_rank_state
      }
    : null

export class ProgressionSupportRepository {
  constructor(private readonly database: D1Database) {}

  private async target(accountAddress?: string): Promise<ProgressTargetRow> {
    if (!accountAddress?.startsWith('identity:')) {
      throw invalidArgument('accountAddress missing')
    }
    const userId = accountAddress.slice('identity:'.length)
    if (!userId) throw invalidArgument('accountAddress missing')
    const row = await this.database
      .prepare(
        `SELECT profile.user_id, profile.level, profile.xp,
                progression.basic_skypass_level AS skypass_level,
                invite.inviter_user_id
         FROM player_profiles profile
         JOIN player_progression progression
           ON progression.user_id = profile.user_id
         LEFT JOIN player_invites invite
           ON invite.invitee_user_id = profile.user_id
         WHERE profile.user_id = ?`
      )
      .bind(userId)
      .first<ProgressTargetRow>()
    if (!row) throw notFound('account not found')
    return row
  }

  private promotionStatements(
    userId: string,
    season: number,
    now: string
  ): D1PreparedStatement[] {
    return RANKED_MODES.flatMap(mode => [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_account_stats
             (user_id, game_mode, season, created_at, updated_at)
           SELECT ?, ?, ?, ?, ?
           WHERE ${noUnpublishedMatchExperienceSQL('?')}
             AND ${noUnpublishedAccountStatsSQL('?')}
             AND ${noUnpublishedAccountStatsInScopeSQL(String(season))}`
        )
        .bind(userId, mode, season, now, now, userId, userId),
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
               score = 0, player_rank_state = ?, updated_at = ?
           WHERE user_id = ? AND game_mode = ? AND season = ?
             AND player_rank = 'UNRANKED'
             AND ${noUnpublishedMatchExperienceSQL(
               'player_account_stats.user_id'
             )}
             AND ${noUnpublishedAccountStatsSQL('player_account_stats.user_id')}
             AND ${noUnpublishedAccountStatsInScopeSQL(String(season))}`
        )
        .bind(INITIAL_RANK_STATE_JSON, now, userId, mode, season)
    ])
  }

  private levelOperationStatements(
    operationKey: string,
    actorUserId: string,
    targetUserId: string,
    requestedLevels: number,
    season: number,
    now: string
  ): D1PreparedStatement[] {
    const availableLevels = `MAX(0, ${MAX_CLOUDFLARE_LEVEL_IN_TOTAL_EXPERIENCE} - profile.level)`
    const grantedLevels = `MIN(?, ${availableLevels})`
    const pendingOperation =
      `operation_key = ? AND actor_user_id = ? AND target_user_id = ? ` +
      `AND requested_levels = ? AND status = 'PREPARING'`

    return [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO staff_progression_operations
             (operation_key, operation, actor_user_id, target_user_id,
              requested_levels, granted_levels, season,
              before_level, before_xp, before_skypass_level,
              after_level, after_skypass_level,
              inviter_user_id, inviter_levels_before, inviter_levels_after,
              inviter_stickers_before, inviter_stickers_after,
              status, created_at, completed_at)
           SELECT ?, 'GIVE_LEVELS', ?, profile.user_id, ?,
                  ${grantedLevels}, ?, profile.level, profile.xp,
                  progression.basic_skypass_level,
                  profile.level + ${grantedLevels},
                  MAX(progression.basic_skypass_level,
                      profile.level + ${grantedLevels}),
                  invite.inviter_user_id,
                  CASE WHEN invite.inviter_user_id IS NULL THEN NULL
                       ELSE COALESCE(points.levels, 0) END,
                  CASE WHEN invite.inviter_user_id IS NULL THEN NULL
                       ELSE COALESCE(points.levels, 0) + ${grantedLevels} END,
                  CASE WHEN invite.inviter_user_id IS NULL THEN NULL
                       ELSE COALESCE(stickers.balance, 0) END,
                  CASE WHEN invite.inviter_user_id IS NULL THEN NULL
                       ELSE COALESCE(stickers.balance, 0) + ${grantedLevels} END,
                  'PREPARING', ?, NULL
           FROM player_profiles profile
           JOIN player_progression progression
             ON progression.user_id = profile.user_id
           LEFT JOIN player_invites invite
             ON invite.invitee_user_id = profile.user_id
           LEFT JOIN player_friend_points points
             ON points.invitee_user_id = profile.user_id
            AND points.inviter_user_id = invite.inviter_user_id
            AND points.season = ?
           LEFT JOIN player_items stickers
             ON stickers.user_id = invite.inviter_user_id
            AND stickers.item_type = 'SW_STICKER_POINTS'
            AND stickers.token_id = 0
           WHERE profile.user_id = ?
             AND ${noUnpublishedMatchExperienceSQL('profile.user_id')}
             AND ${noUnpublishedAccountStatsSQL('profile.user_id')}`
        )
        .bind(
          operationKey,
          actorUserId,
          requestedLevels,
          requestedLevels,
          season,
          requestedLevels,
          requestedLevels,
          requestedLevels,
          requestedLevels,
          now,
          season,
          targetUserId
        ),
      this.database
        .prepare(
          `UPDATE player_profiles
           SET level = (
                 SELECT after_level FROM staff_progression_operations
                 WHERE ${pendingOperation}
               ),
               next_level_xp = 200, updated_at = ?
           WHERE user_id = ?
             AND EXISTS (
               SELECT 1 FROM staff_progression_operations
               WHERE ${pendingOperation}
             )`
        )
        .bind(
          operationKey,
          actorUserId,
          targetUserId,
          requestedLevels,
          now,
          targetUserId,
          operationKey,
          actorUserId,
          targetUserId,
          requestedLevels
        ),
      this.database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = (
                 SELECT after_skypass_level
                 FROM staff_progression_operations
                 WHERE ${pendingOperation}
               ),
               basic_skypass_next_xp = 200, updated_at = ?
           WHERE user_id = ?
             AND EXISTS (
               SELECT 1 FROM staff_progression_operations
               WHERE ${pendingOperation}
             )`
        )
        .bind(
          operationKey,
          actorUserId,
          targetUserId,
          requestedLevels,
          now,
          targetUserId,
          operationKey,
          actorUserId,
          targetUserId,
          requestedLevels
        ),
      this.database
        .prepare(
          `INSERT INTO player_skypass_season_stats
             (user_id, season, has_premium, created_at, updated_at,
              initial_account_level, achieved_account_level)
           SELECT target_user_id, season, 0, ?, ?,
                  MAX(0, before_level - 1), MAX(0, after_level - 1)
           FROM staff_progression_operations
           WHERE ${pendingOperation}
           ON CONFLICT(user_id, season) DO UPDATE SET
             achieved_account_level = MAX(
               player_skypass_season_stats.achieved_account_level,
               excluded.achieved_account_level
             ),
             updated_at = excluded.updated_at`
        )
        .bind(
          now,
          now,
          operationKey,
          actorUserId,
          targetUserId,
          requestedLevels
        ),
      ...RANKED_MODES.flatMap(mode => [
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_account_stats
               (user_id, game_mode, season, created_at, updated_at)
             SELECT target_user_id, ?, season, ?, ?
             FROM staff_progression_operations
             WHERE ${pendingOperation}`
          )
          .bind(
            mode,
            now,
            now,
            operationKey,
            actorUserId,
            targetUserId,
            requestedLevels
          ),
        this.database
          .prepare(
            `UPDATE player_account_stats
             SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
                 score = 0, player_rank_state = ?, updated_at = ?
             WHERE user_id = ? AND game_mode = ? AND season = ?
               AND player_rank = 'UNRANKED'
               AND EXISTS (
                 SELECT 1 FROM staff_progression_operations
                 WHERE ${pendingOperation}
               )`
          )
          .bind(
            INITIAL_RANK_STATE_JSON,
            now,
            targetUserId,
            mode,
            season,
            operationKey,
            actorUserId,
            targetUserId,
            requestedLevels
          )
      ]),
      this.database
        .prepare(
          `INSERT INTO player_friend_points
             (invitee_user_id, inviter_user_id, season, levels,
              points_carried, points_spent, updated_at)
           SELECT target_user_id, inviter_user_id, season, granted_levels,
                  0, 0, ?
           FROM staff_progression_operations
           WHERE ${pendingOperation}
             AND inviter_user_id IS NOT NULL
             AND granted_levels > 0
           ON CONFLICT(invitee_user_id, inviter_user_id, season)
           DO UPDATE SET levels = player_friend_points.levels + excluded.levels,
                         updated_at = excluded.updated_at`
        )
        .bind(now, operationKey, actorUserId, targetUserId, requestedLevels),
      this.database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT inviter_user_id, 'SW_STICKER_POINTS', 0, granted_levels,
                  0, 'friend-level', ?, ?
           FROM staff_progression_operations
           WHERE ${pendingOperation}
             AND inviter_user_id IS NOT NULL
             AND granted_levels > 0
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = player_items.balance + excluded.balance,
                         updated_at = excluded.updated_at`
        )
        .bind(
          now,
          now,
          operationKey,
          actorUserId,
          targetUserId,
          requestedLevels
        ),
      this.database
        .prepare(
          `INSERT INTO staff_progression_audit
             (operation, target_user_id, actor_user_id, before_json,
              after_json, created_at, operation_key)
           SELECT operation, operation_row.target_user_id,
                  operation_row.actor_user_id,
                  json_object(
                    'requestedLevels', requested_levels,
                    'grantedLevels', granted_levels,
                    'level', before_level, 'xp', before_xp,
                    'skypassLevel', before_skypass_level,
                    'inviterUserId', inviter_user_id
                  ),
                  json_object(
                    'requestedLevels', requested_levels,
                    'grantedLevels', granted_levels,
                    'level', profile.level, 'xp', profile.xp,
                    'skypassLevel', progression.basic_skypass_level,
                    'inviterUserId', inviter_user_id
                  ), ?, operation_key
           FROM staff_progression_operations operation_row
           JOIN player_profiles profile
             ON profile.user_id = operation_row.target_user_id
           JOIN player_progression progression
             ON progression.user_id = profile.user_id
           WHERE ${pendingOperation}`
        )
        .bind(now, operationKey, actorUserId, targetUserId, requestedLevels),
      this.database
        .prepare(
          `UPDATE staff_progression_operations
           SET status = 'APPLIED', completed_at = ?
           WHERE ${pendingOperation}`
        )
        .bind(now, operationKey, actorUserId, targetUserId, requestedLevels)
    ]
  }

  private minimumLevelStatements(
    target: ProgressTargetRow,
    minimumLevel: number,
    season: number,
    now: string
  ): D1PreparedStatement[] {
    if (target.level >= minimumLevel) return []
    const statements: D1PreparedStatement[] = []
    const sourceTransactionGuard = (userIdExpression: string) =>
      `${noUnpublishedMatchExperienceSQL(userIdExpression)}
       AND ${noUnpublishedAccountStatsSQL(userIdExpression)}
       AND ${noUnpublishedAccountStatsInScopeSQL(String(season))}`
    if (target.inviter_user_id) {
      // Calculate the difference inside the same D1 transaction as the level
      // floor. A concurrent identical override therefore cannot double-credit
      // the inviter even if both requests read the old profile first.
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_friend_points
               (invitee_user_id, inviter_user_id, season, levels,
                points_carried, points_spent, updated_at)
             SELECT ?, ?, ?, ? - level, 0, 0, ?
             FROM player_profiles profile
             WHERE profile.user_id = ? AND profile.level < ?
               AND ${sourceTransactionGuard('profile.user_id')}
             ON CONFLICT(invitee_user_id, inviter_user_id, season)
             DO UPDATE SET levels = player_friend_points.levels + excluded.levels,
                           updated_at = excluded.updated_at`
          )
          .bind(
            target.user_id,
            target.inviter_user_id,
            season,
            minimumLevel,
            now,
            target.user_id,
            minimumLevel
          ),
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_STICKER_POINTS', 0, ? - level, 0,
                    'friend-level', ?, ?
             FROM player_profiles profile
             WHERE profile.user_id = ? AND profile.level < ?
               AND ${sourceTransactionGuard('profile.user_id')}
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = player_items.balance + excluded.balance,
                           updated_at = excluded.updated_at`
          )
          .bind(
            target.inviter_user_id,
            minimumLevel,
            now,
            now,
            target.user_id,
            minimumLevel
          )
      )
    }
    statements.push(
      this.database
        .prepare(
          `INSERT INTO player_skypass_season_stats
             (user_id, season, has_premium, created_at, updated_at,
              initial_account_level, achieved_account_level)
           SELECT profile.user_id, ?, 0, ?, ?,
                  MAX(0, profile.level - 1), MAX(0, ? - 1)
           FROM player_profiles profile
           WHERE profile.user_id = ?
             AND ${sourceTransactionGuard('profile.user_id')}
           ON CONFLICT(user_id, season) DO UPDATE SET
             achieved_account_level = MAX(
               player_skypass_season_stats.achieved_account_level,
               excluded.achieved_account_level
             ),
             updated_at = excluded.updated_at`
        )
        .bind(season, now, now, minimumLevel, target.user_id),
      this.database
        .prepare(
          `UPDATE player_profiles
           SET level = MAX(level, ?), next_level_xp = 200, updated_at = ?
           WHERE user_id = ?
             AND ${sourceTransactionGuard('player_profiles.user_id')}`
        )
        .bind(minimumLevel, now, target.user_id),
      this.database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(
                 basic_skypass_level,
                 (SELECT level FROM player_profiles WHERE user_id = ?)
               ),
               basic_skypass_next_xp = 200, updated_at = ?
           WHERE user_id = ?
             AND ${sourceTransactionGuard('player_progression.user_id')}`
        )
        .bind(target.user_id, now, target.user_id),
      ...this.promotionStatements(target.user_id, season, now)
    )
    return statements
  }

  private async stat(
    userId: string,
    mode: GameMode,
    season: number
  ): Promise<StatRow | null> {
    return this.database
      .prepare(
        `WITH ${publishedAccountStatsCTESQL()}
         SELECT game_mode, score, player_rank, player_rank_stage,
                player_rank_state
         FROM source_visible_account_stats
         WHERE user_id = ? AND game_mode = ? AND season = ?`
      )
      .bind(userId, mode, season)
      .first<StatRow>()
  }

  async giveLevels(
    actorUserId: string,
    accountAddress: string | undefined,
    value: unknown,
    operationKey: string | null
  ): Promise<boolean> {
    if (!operationKey || !OPERATION_KEY_PATTERN.test(operationKey)) {
      throw invalidArgument('valid Cloud Weasel operation key missing')
    }
    if (
      !Number.isSafeInteger(value) ||
      (value as number) < 0 ||
      (value as number) > MAX_UINT16
    ) {
      throw invalidArgument('levels must be an unsigned 16-bit integer')
    }
    const requestedLevels = value as number
    const target = await this.target(accountAddress)
    const sourceLevel = target.level - CLOUDFLARE_LEVEL_OFFSET
    if (sourceLevel + requestedLevels > MAX_UINT16) {
      throw invalidArgument('resulting level exceeds the source limit')
    }
    // api/lib/levels.TotalExperience only sums indices 0 through 1000. The Go
    // GM path therefore grants at most source level 1001 even though its wire
    // argument is uint16; preserve that boundary without reproducing overflow.
    const levels = Math.max(
      0,
      Math.min(
        requestedLevels,
        MAX_SOURCE_LEVEL_IN_TOTAL_EXPERIENCE - sourceLevel
      )
    )
    if (levels === 0) return true

    const existing = await this.database
      .prepare(
        `SELECT operation_key, actor_user_id, target_user_id,
                requested_levels, status
         FROM staff_progression_operations WHERE operation_key = ?`
      )
      .bind(operationKey)
      .first<ProgressionOperationRow>()
    if (existing) {
      if (
        existing.actor_user_id !== actorUserId ||
        existing.target_user_id !== target.user_id ||
        existing.requested_levels !== requestedLevels
      ) {
        throw invalidArgument(
          'operation key belongs to a different level grant'
        )
      }
      if (existing.status === 'APPLIED') return true
    }

    const now = new Date().toISOString()
    await this.database.batch(
      this.levelOperationStatements(
        operationKey,
        actorUserId,
        target.user_id,
        requestedLevels,
        seasonFromDate(),
        now
      )
    )
    const operation = await this.database
      .prepare(
        `SELECT operation_key, actor_user_id, target_user_id,
                requested_levels, status
         FROM staff_progression_operations WHERE operation_key = ?`
      )
      .bind(operationKey)
      .first<ProgressionOperationRow>()
    if (!operation || operation.status !== 'APPLIED') {
      throw new Error('staff level grant did not complete')
    }
    if (
      operation.actor_user_id !== actorUserId ||
      operation.target_user_id !== target.user_id ||
      operation.requested_levels !== requestedLevels
    ) {
      throw invalidArgument('operation key belongs to a different level grant')
    }
    return true
  }

  private grandweaverStatements(season: number): D1PreparedStatement[] {
    return RANKED_MODES.flatMap(mode => [
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET player_rank = 'MASTER', updated_at = updated_at
           WHERE game_mode = ? AND season = ?
             AND player_rank IN ('MASTER', 'GRANDWEAVER')
             AND ${noUnpublishedAccountStatsInScopeSQL(String(season))}
             AND user_id IN (
               SELECT user_id FROM player_account_settings
               WHERE account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
             )`
        )
        .bind(mode, season),
      this.database
        .prepare(
          `UPDATE player_account_stats SET player_rank = 'GRANDWEAVER'
           WHERE rowid IN (
             SELECT stats.rowid FROM player_account_stats stats
             JOIN player_account_settings account
               ON account.user_id = stats.user_id
             WHERE stats.game_mode = ? AND stats.season = ?
               AND stats.player_rank = 'MASTER'
               AND account.account_status NOT IN
                   ('BANNED', 'SUSPENDED', 'DELETED')
             ORDER BY stats.score DESC, stats.updated_at ASC,
                      stats.user_id ASC
             LIMIT 100
           )
           AND ${noUnpublishedAccountStatsInScopeSQL(String(season))}`
        )
        .bind(mode, season)
    ])
  }

  async setRP(
    actorUserId: string,
    accountAddress: string | undefined,
    mode: GameMode | undefined,
    value: unknown
  ): Promise<boolean> {
    if (!mode || mode === ('UNKNOWN' as GameMode)) {
      throw invalidArgument('gameMode missing')
    }
    if (!RP_MODES.has(mode)) {
      throw invalidArgument('can only set elo for ranked & conquest game modes')
    }
    if (
      !Number.isSafeInteger(value) ||
      (value as number) < MINIMUM_RP ||
      (value as number) > 2_147_483_647
    ) {
      throw invalidArgument('invalid rank points - must be 200 and above')
    }
    const rankPoints = value as number
    const target = await this.target(accountAddress)
    const season = seasonFromDate()
    const beforeStat = await this.stat(target.user_id, mode, season)
    const now = new Date().toISOString()
    const rank = rankForRP(rankPoints)
    const state = JSON.stringify([1, 1750, 350, rankPoints])
    const targetPublicationGuard = (userIdExpression: string) =>
      `${noUnpublishedMatchExperienceSQL(userIdExpression)}
       AND ${noUnpublishedAccountStatsSQL(userIdExpression)}`
    const scopePublicationGuard = noUnpublishedAccountStatsInScopeSQL(
      String(season)
    )
    const before = {
      mode,
      requestedRankPoints: rankPoints,
      level: target.level,
      xp: target.xp,
      skypassLevel: target.skypass_level,
      stat: statSnapshot(beforeStat)
    }
    const statements = [
      ...this.minimumLevelStatements(
        target,
        MINIMUM_CLOUDFLARE_LEVEL_FOR_RP,
        season,
        now
      ),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_account_stats
             (user_id, game_mode, season, created_at, updated_at)
           SELECT ?, ?, ?, ?, ?
           WHERE ${targetPublicationGuard('?')}
             AND ${scopePublicationGuard}`
        )
        .bind(
          target.user_id,
          mode,
          season,
          now,
          now,
          target.user_id,
          target.user_id
        ),
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET score = CASE
                 WHEN game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
                   THEN ? ELSE score
               END,
               player_rank = ?, player_rank_stage = ?,
               player_rank_state = ?, updated_at = ?
           WHERE user_id = ? AND game_mode = ? AND season = ?
             AND ${targetPublicationGuard('player_account_stats.user_id')}
             AND ${scopePublicationGuard}`
        )
        .bind(
          rankPoints,
          rank.rank,
          rank.stage,
          state,
          now,
          target.user_id,
          mode,
          season
        ),
      ...this.grandweaverStatements(season),
      this.database
        .prepare(
          `INSERT INTO staff_progression_audit
             (operation, target_user_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'SET_RP', ?, ?, ?,
                  json_object(
                    'mode', ?, 'requestedRankPoints', ?,
                    'level', profile.level, 'xp', profile.xp,
                    'skypassLevel', progression.basic_skypass_level,
                    'stat', json_object(
                      'gameMode', stats.game_mode, 'score', stats.score,
                      'playerRank', stats.player_rank,
                      'playerRankStage', stats.player_rank_stage,
                      'playerRankState', stats.player_rank_state
                    )
                  ), ?
           FROM player_profiles profile
           JOIN player_progression progression
             ON progression.user_id = profile.user_id
           JOIN player_account_stats stats
             ON stats.user_id = profile.user_id AND stats.game_mode = ?
            AND stats.season = ?
           WHERE profile.user_id = ?
             AND ${targetPublicationGuard('profile.user_id')}
             AND ${scopePublicationGuard}`
        )
        .bind(
          target.user_id,
          actorUserId,
          JSON.stringify(before),
          mode,
          rankPoints,
          now,
          mode,
          season,
          target.user_id
        )
    ]
    const results = await this.database.batch(statements)
    if ((results.at(-1)?.meta.changes ?? 0) !== 1) {
      throw new Error('rank points are waiting for match publication')
    }
    return true
  }
}
