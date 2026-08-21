import { invalidArgument } from './errors'
import {
  publishedAccountLevelSQL,
  publishedAccountXpSQL,
  publishedSeasonAchievedLevelSQL,
  publishedSeasonInitialLevelSQL,
  sourceVisibleAccountLevel,
  sourceVisibleExperienceXp,
  sourceVisibleSeasonProgress
} from './experience-publication'
import { seasonFromDate } from './legacy-seasons'

const TUTORIAL_LEVELS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'] as const

type TutorialLevel = (typeof TUTORIAL_LEVELS)[number] | 'UNKNOWN'
type MatchStatus =
  | 'UNKNOWN'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'FORFEITED'
  | 'IN_PROGRESS'
  | 'CRASHED'

export interface BotMatchEndRequest {
  mode?: string
  status?: MatchStatus
  winningPlayer?: number
  deckString?: string
  turnNonce?: number
  tutorialLevel?: TutorialLevel
  matchStartedAt?: string
  playerSessionId?: string
  playerQuestProgressUpdates?: Record<string, number>
}

interface PlayerProgressRow {
  level: number
  xp: number
  next_level_xp: number
  initial_account_level: number
  achieved_account_level: number
}

interface QuestRow {
  row_id: number
  progress: number
  target: number
  status: 'active' | 'complete' | 'claimed'
  active: number
}

interface ReportRow {
  rewards_json: string
}

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  )
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

const validTutorialLevel = (
  level: TutorialLevel | undefined
): level is Exclude<TutorialLevel, 'UNKNOWN'> =>
  !!level &&
  TUTORIAL_LEVELS.includes(level as Exclude<TutorialLevel, 'UNKNOWN'>)

const normalizedQuestProgress = (
  updates: Record<string, number> | undefined
): Array<readonly [number, number]> => {
  if (!updates) return []
  const entries = Object.entries(updates)
  if (entries.length > 64) {
    throw invalidArgument('at most 64 quest progress updates are allowed')
  }
  return entries.map(([rawId, rawDelta]) => {
    const questId = Number(rawId)
    const delta = Number(rawDelta)
    if (
      !Number.isSafeInteger(questId) ||
      questId <= 0 ||
      !Number.isSafeInteger(delta) ||
      delta < 0 ||
      delta > 65_535
    ) {
      throw invalidArgument(
        'quest progress updates must contain valid IDs and uint16 deltas'
      )
    }
    return [questId, delta] as const
  })
}

const parseRewards = (value: string): Array<Record<string, unknown>> => {
  try {
    const rewards = JSON.parse(value)
    return Array.isArray(rewards) ? rewards : []
  } catch {
    return []
  }
}

/**
 * Persists the legacy BotMatchEnd contract for the browser-hosted tutorial.
 * A report key is derived from stable match identity fields, so a network retry
 * returns the original reward receipt and cannot apply quest deltas twice.
 */
export class BotMatchRepository {
  constructor(private readonly database: D1Database) {}

  async endTutorial(
    userId: string,
    request: BotMatchEndRequest
  ): Promise<Array<Record<string, unknown>>> {
    if (request.mode !== 'TUTORIAL') {
      throw invalidArgument(
        'identity bot matches currently support tutorial mode only'
      )
    }
    if (!request.status) throw invalidArgument('status is required')
    if (request.status === 'IN_PROGRESS') {
      throw invalidArgument('match is still in-progress')
    }

    const winningPlayer =
      request.status === 'CRASHED' && request.winningPlayer === undefined
        ? 0
        : request.winningPlayer
    if (
      !Number.isSafeInteger(winningPlayer) ||
      winningPlayer === undefined ||
      winningPlayer < 0 ||
      winningPlayer > 2
    ) {
      throw invalidArgument('winningPlayer must be 0, 1, or 2')
    }

    const turnNonce = request.turnNonce ?? 0
    if (
      !Number.isSafeInteger(turnNonce) ||
      turnNonce < 0 ||
      turnNonce > 4_294_967_295
    ) {
      throw invalidArgument('turnNonce must be a uint32')
    }
    if (
      !request.matchStartedAt ||
      !Number.isFinite(Date.parse(request.matchStartedAt))
    ) {
      throw invalidArgument('matchStartedAt must be a timestamp')
    }
    if (
      request.tutorialLevel !== undefined &&
      request.tutorialLevel !== 'UNKNOWN' &&
      !validTutorialLevel(request.tutorialLevel)
    ) {
      throw invalidArgument('tutorialLevel is invalid')
    }

    const questProgress = normalizedQuestProgress(
      request.playerQuestProgressUpdates
    )
    const reportId = await sha256(
      JSON.stringify([
        userId,
        request.mode,
        request.tutorialLevel || null,
        request.matchStartedAt,
        request.playerSessionId || null
      ])
    )
    const existing = await this.report(reportId)
    if (existing) return parseRewards(existing.rewards_json)

    const player = await this.database
      .prepare(
        `WITH current_season(season) AS (VALUES (?))
         SELECT ${publishedAccountLevelSQL(
           'profile.user_id',
           'profile.level'
         )} AS level,
                ${publishedAccountXpSQL('profile.user_id', 'profile.xp')} AS xp,
                profile.next_level_xp,
                ${publishedSeasonInitialLevelSQL(
                  'profile.user_id',
                  'current_season.season',
                  'stats.initial_account_level'
                )} AS initial_account_level,
                ${publishedSeasonAchievedLevelSQL(
                  'profile.user_id',
                  'current_season.season',
                  'stats.achieved_account_level'
                )} AS achieved_account_level
         FROM player_profiles profile
         CROSS JOIN current_season
         JOIN player_progression progression
           ON progression.user_id = profile.user_id
         LEFT JOIN player_skypass_season_stats stats
           ON stats.user_id = profile.user_id
          AND stats.season = current_season.season
         WHERE profile.user_id = ?`
      )
      .bind(seasonFromDate(), userId)
      .first<PlayerProgressRow>()
    if (!player) throw new Error('player progression is missing')
    sourceVisibleAccountLevel(player.level)
    const visibleXp = sourceVisibleExperienceXp(player.xp)
    const visibleSeason = sourceVisibleSeasonProgress(
      player.initial_account_level,
      player.achieved_account_level
    )
    const visibleSeasonLevel =
      visibleSeason.initial === null || visibleSeason.achieved === null
        ? 0
        : visibleSeason.achieved - visibleSeason.initial

    await this.questRows(userId, questProgress)
    const now = new Date().toISOString()
    const tutorialReward = [
      {
        accountID: 0,
        type: 'EXP',
        exp: {
          amount: 0,
          reason: 'TutorialCompleted',
          currentLevel: visibleSeasonLevel,
          requiredExp: player.next_level_xp,
          beforeMatchExp: visibleXp
        }
      }
    ]
    const shouldCompleteTutorial =
      winningPlayer === 1 && validTutorialLevel(request.tutorialLevel)

    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_bot_match_reports
             (report_id, user_id, mode, status, winning_player, tutorial_level,
              match_started_at, turn_nonce, deck_string, player_session_id,
              quest_progress_json, rewards_json, created_at)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  CASE
                    WHEN ? = 1 AND ? IS NOT NULL AND NOT EXISTS (
                      SELECT 1 FROM player_tutorial_progress
                      WHERE user_id = ? AND level = ? AND completed = 1
                    ) THEN ?
                    ELSE '[]'
                  END,
                  ?`
        )
        .bind(
          reportId,
          userId,
          request.mode,
          request.status,
          winningPlayer,
          validTutorialLevel(request.tutorialLevel)
            ? request.tutorialLevel
            : null,
          new Date(request.matchStartedAt).toISOString(),
          turnNonce,
          request.deckString || '',
          request.playerSessionId || null,
          JSON.stringify(Object.fromEntries(questProgress)),
          shouldCompleteTutorial ? 1 : 0,
          validTutorialLevel(request.tutorialLevel)
            ? request.tutorialLevel
            : null,
          userId,
          validTutorialLevel(request.tutorialLevel)
            ? request.tutorialLevel
            : null,
          JSON.stringify(tutorialReward),
          now
        )
    ]

    for (const [questId, delta] of questProgress) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_bot_match_quest_progress
               (report_id, quest_id, applied_delta, before_progress,
                after_progress, application_status)
             SELECT ?, quest.rowid,
                    CASE
                      WHEN quest.active = 1 AND quest.status = 'active'
                        THEN MIN(?, MAX(0, quest.target - quest.progress))
                      ELSE 0
                    END,
                    quest.progress,
                    quest.progress + CASE
                      WHEN quest.active = 1 AND quest.status = 'active'
                        THEN MIN(?, MAX(0, quest.target - quest.progress))
                      ELSE 0
                    END,
                    'PREPARING'
             FROM player_quests quest
             JOIN player_bot_match_reports report
               ON report.report_id = ? AND report.user_id = quest.user_id
             WHERE quest.user_id = ? AND quest.rowid = ?`
          )
          .bind(reportId, delta, delta, reportId, userId, questId),
        this.database
          .prepare(
            `UPDATE player_quests
             SET progress = (
                   SELECT receipt.after_progress
                   FROM player_bot_match_quest_progress receipt
                   WHERE receipt.report_id = ? AND receipt.quest_id = ?
                 ),
                 status = CASE
                   WHEN (
                     SELECT receipt.after_progress
                     FROM player_bot_match_quest_progress receipt
                     WHERE receipt.report_id = ? AND receipt.quest_id = ?
                   ) >= target THEN 'complete'
                   ELSE status
                 END,
                 updated_at = ?
             WHERE user_id = ? AND rowid = ? AND active = 1
               AND status = 'active'
               AND EXISTS (
                 SELECT 1 FROM player_bot_match_quest_progress
                 WHERE report_id = ? AND quest_id = ?
                   AND application_status = 'PREPARING'
               )`
          )
          .bind(
            reportId,
            questId,
            reportId,
            questId,
            now,
            userId,
            questId,
            reportId,
            questId
          ),
        this.database
          .prepare(
            `UPDATE player_bot_match_quest_progress
             SET application_status = 'APPLIED'
             WHERE report_id = ? AND quest_id = ?
               AND application_status = 'PREPARING'`
          )
          .bind(reportId, questId)
      )
    }

    if (shouldCompleteTutorial) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_tutorial_progress
               (user_id, level, completed, completed_at)
             VALUES (?, ?, 1, ?)
             ON CONFLICT(user_id, level) DO UPDATE SET completed = 1`
          )
          .bind(userId, request.tutorialLevel, now)
      )
      if (request.tutorialLevel === 'LEVEL_4') {
        statements.push(
          this.database
            .prepare(
              `UPDATE player_progression
               SET tutorial_completed = 1, updated_at = ?
               WHERE user_id = ?`
            )
            .bind(now, userId)
        )
      }
    }

    await this.database.batch(statements)
    const stored = await this.report(reportId)
    if (!stored) throw new Error('bot match report was not persisted')
    return parseRewards(stored.rewards_json)
  }

  private report(reportId: string): Promise<ReportRow | null> {
    return this.database
      .prepare(
        `SELECT rewards_json FROM player_bot_match_reports WHERE report_id = ?`
      )
      .bind(reportId)
      .first<ReportRow>()
  }

  private async questRows(
    userId: string,
    progress: Array<readonly [number, number]>
  ): Promise<Map<number, QuestRow>> {
    if (!progress.length) return new Map()
    const ids = progress.map(([questId]) => questId)
    const rows = await this.database
      .prepare(
        `SELECT rowid AS row_id, progress, target, status, active
         FROM player_quests
         WHERE user_id = ? AND rowid IN (${ids.map(() => '?').join(',')})`
      )
      .bind(userId, ...ids)
      .all<QuestRow>()
    if (rows.results.length !== new Set(ids).size) {
      throw invalidArgument(
        'quest progress update does not belong to this player'
      )
    }
    return new Map(rows.results.map(row => [row.row_id, row]))
  }
}
