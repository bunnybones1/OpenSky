import type { GameMode, PlayerRank, PlayerRankStage } from '@opensky/proto'
import { INITIAL_RANK_STATE_JSON } from '@opensky/shared/ranked-progression'

import { invalidArgument, notFound } from './errors'
import { seasonFromDate } from './legacy-seasons'

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
const MINIMUM_CLOUDFLARE_LEVEL_FOR_RP =
  MINIMUM_SOURCE_LEVEL_FOR_RP + CLOUDFLARE_LEVEL_OFFSET

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
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(userId, mode, season, now, now),
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
               score = 0, player_rank_state = ?, updated_at = ?
           WHERE user_id = ? AND game_mode = ? AND season = ?
             AND player_rank = 'UNRANKED'`
        )
        .bind(INITIAL_RANK_STATE_JSON, now, userId, mode, season)
    ])
  }

  private levelStatements(
    target: ProgressTargetRow,
    levels: number,
    season: number,
    now: string
  ): D1PreparedStatement[] {
    if (levels === 0) return []
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `UPDATE player_profiles
           SET level = level + ?, next_level_xp = 200, updated_at = ?
           WHERE user_id = ?`
        )
        .bind(levels, now, target.user_id),
      this.database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(
                 basic_skypass_level,
                 (SELECT level FROM player_profiles WHERE user_id = ?)
               ),
               basic_skypass_next_xp = 200, updated_at = ?
           WHERE user_id = ?`
        )
        .bind(target.user_id, now, target.user_id),
      ...this.promotionStatements(target.user_id, season, now)
    ]
    if (target.inviter_user_id) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_friend_points
               (invitee_user_id, inviter_user_id, season, levels,
                points_carried, points_spent, updated_at)
             VALUES (?, ?, ?, ?, 0, 0, ?)
             ON CONFLICT(invitee_user_id, inviter_user_id, season)
             DO UPDATE SET levels = player_friend_points.levels + excluded.levels,
                           updated_at = excluded.updated_at`
          )
          .bind(
            target.user_id,
            target.inviter_user_id,
            season,
            levels,
            now
          ),
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             VALUES (?, 'SW_STICKER_POINTS', 0, ?, 0, 'friend-level', ?, ?)
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = player_items.balance + excluded.balance,
                           updated_at = excluded.updated_at`
          )
          .bind(target.inviter_user_id, levels, now, now)
      )
    }
    return statements
  }

  private minimumLevelStatements(
    target: ProgressTargetRow,
    minimumLevel: number,
    season: number,
    now: string
  ): D1PreparedStatement[] {
    if (target.level >= minimumLevel) return []
    const statements: D1PreparedStatement[] = []
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
             FROM player_profiles WHERE user_id = ? AND level < ?
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
             FROM player_profiles WHERE user_id = ? AND level < ?
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
          `UPDATE player_profiles
           SET level = MAX(level, ?), next_level_xp = 200, updated_at = ?
           WHERE user_id = ?`
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
           WHERE user_id = ?`
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
        `SELECT game_mode, score, player_rank, player_rank_stage,
                player_rank_state
         FROM player_account_stats
         WHERE user_id = ? AND game_mode = ? AND season = ?`
      )
      .bind(userId, mode, season)
      .first<StatRow>()
  }

  async giveLevels(
    actorUserId: string,
    accountAddress: string | undefined,
    value: unknown
  ): Promise<boolean> {
    if (!Number.isSafeInteger(value) || (value as number) < 0 ||
        (value as number) > MAX_UINT16) {
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

    const now = new Date().toISOString()
    const season = seasonFromDate()
    const before = {
      requestedLevels,
      grantedLevels: levels,
      level: target.level,
      xp: target.xp,
      skypassLevel: target.skypass_level,
      inviterUserId: target.inviter_user_id
    }
    await this.database.batch([
      ...this.levelStatements(target, levels, season, now),
      this.database
        .prepare(
          `INSERT INTO staff_progression_audit
             (operation, target_user_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'GIVE_LEVELS', ?, ?, ?,
                  json_object(
                    'requestedLevels', ?, 'grantedLevels', ?,
                    'level', profile.level, 'xp', profile.xp,
                    'skypassLevel', progression.basic_skypass_level,
                    'inviterUserId', ?
                  ), ?
           FROM player_profiles profile
           JOIN player_progression progression
             ON progression.user_id = profile.user_id
           WHERE profile.user_id = ?`
        )
        .bind(
          target.user_id,
          actorUserId,
          JSON.stringify(before),
          requestedLevels,
          levels,
          target.inviter_user_id,
          now,
          target.user_id
        )
    ])
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
           )`
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
    if (!Number.isSafeInteger(value) || (value as number) < MINIMUM_RP ||
        (value as number) > 2_147_483_647) {
      throw invalidArgument('invalid rank points - must be 200 and above')
    }
    const rankPoints = value as number
    const target = await this.target(accountAddress)
    const season = seasonFromDate()
    const beforeStat = await this.stat(target.user_id, mode, season)
    const now = new Date().toISOString()
    const rank = rankForRP(rankPoints)
    const state = JSON.stringify([1, 1750, 350, rankPoints])
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
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(target.user_id, mode, season, now, now),
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET score = CASE
                 WHEN game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
                   THEN ? ELSE score
               END,
               player_rank = ?, player_rank_stage = ?,
               player_rank_state = ?, updated_at = ?
           WHERE user_id = ? AND game_mode = ? AND season = ?`
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
           WHERE profile.user_id = ?`
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
    await this.database.batch(statements)
    return true
  }
}
