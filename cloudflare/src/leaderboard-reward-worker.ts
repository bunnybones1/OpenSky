import cardLibrary from './generated/card-library.json'

import { leaderboardRewardsForRank } from './leaderboard-rewards'
import { applyLeaderboardRankReset } from './leaderboard-rank-reset'
import { seasonStart, seasonWeekFromDate } from './legacy-seasons'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_ATTEMPTS = 5
const MAX_PLAYERS_PER_RUN = 20
const CONQUEST_TICKET_TOKEN_ID = 16_646_145
const RANKED_MODES = ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'] as const

type RankedMode = (typeof RANKED_MODES)[number]

interface ScheduleRow {
  version: number
  enabled: number
  weekday_utc: number | null
  hour_utc: number | null
  minute_utc: number | null
  first_run_at: string | null
  starts_at: string
}

interface CycleRow {
  id: number
  schedule_version: number
  scheduled_at: string
  season: number
  week: number
  random_seed: string
  status: 'PREPARING' | 'DELIVERING' | 'COMPLETED' | 'FAILED'
  attempt_count: number
}

interface EntryRow {
  user_id: string
  game_mode: RankedMode
  rank: number
}

interface RankUpRow {
  game_mode: RankedMode
  player_rank: string
  player_rank_stage: string
  awarded_at: string
}

interface ModeAward {
  rank: number
  silverCardIds: number[]
  tickets: number
}

interface PlayerAward {
  silverCardAmounts: Record<number, number>
  ticketAmount: number
  rankedConstructedRank: number
  rankedDiscoveryRank: number
  earnedConstructedPlayerRanks: Array<{
    playerRank: string
    playerRankStage: string
  }>
  earnedDiscoveryPlayerRanks: Array<{
    playerRank: string
    playerRankStage: string
  }>
}

export interface LeaderboardRewardRun {
  status:
    | 'disabled'
    | 'not_due'
    | 'completed'
    | 'in_progress'
    | 'already_completed'
    | 'failed'
  cycleId?: number
  delivered: number
}

const rewardCards = cardLibrary.cards.filter(
  card => card.set !== 'HEXBOUND_INVASION'
)

export const leaderboardRewardCardIds = (season: number): number[] =>
  rewardCards
    .filter(card => card.validFromSeason <= season)
    .map(card => card.id)

export const mostRecentLeaderboardRewardTime = (
  firstRunAt: Date,
  now: Date
): Date | null => {
  if (
    !Number.isFinite(firstRunAt.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    now.getTime() < firstRunAt.getTime()
  ) {
    return null
  }
  const weeks = Math.floor((now.getTime() - firstRunAt.getTime()) / WEEK_MS)
  return new Date(firstRunAt.getTime() + weeks * WEEK_MS)
}

const activeSchedule = async (
  database: D1Database,
  now: Date
): Promise<ScheduleRow | null> => {
  const schedule = await database
    .prepare(
      `SELECT version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
              starts_at
       FROM leaderboard_reward_schedule_versions
       WHERE starts_at <= ?
       ORDER BY version DESC LIMIT 1`
    )
    .bind(now.toISOString())
    .first<ScheduleRow>()
  return schedule?.enabled === 1 ? schedule : null
}

const validatedFirstRun = (schedule: ScheduleRow): Date => {
  if (
    schedule.first_run_at === null ||
    schedule.weekday_utc === null ||
    schedule.hour_utc === null ||
    schedule.minute_utc === null
  ) {
    throw new Error('leaderboard reward schedule is malformed')
  }
  const first = new Date(schedule.first_run_at)
  const startsAt = new Date(schedule.starts_at)
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isFinite(startsAt.getTime()) ||
    first.getTime() < startsAt.getTime() ||
    first.getUTCDay() !== schedule.weekday_utc ||
    first.getUTCHours() !== schedule.hour_utc ||
    first.getUTCMinutes() !== schedule.minute_utc ||
    first.getUTCSeconds() !== 0 ||
    first.getUTCMilliseconds() !== 0
  ) {
    throw new Error('leaderboard reward schedule is malformed')
  }
  return first
}

/**
 * Returns the next configured weekly boundary strictly after `now`, matching
 * the legacy GetNextRewardsTime contract. A missing or explicitly disabled
 * schedule stays distinguishable from a real date so callers never advertise
 * an invented reward cadence.
 */
export const nextLeaderboardRewardTime = async (
  database: D1Database,
  now = new Date()
): Promise<Date | null> => {
  const schedule = await activeSchedule(database, now)
  if (!schedule) return null
  const first = validatedFirstRun(schedule)
  if (first.getTime() > now.getTime()) return first
  const elapsedWeeks = Math.floor((now.getTime() - first.getTime()) / WEEK_MS)
  return new Date(first.getTime() + (elapsedWeeks + 1) * WEEK_MS)
}

const cycleBySchedule = async (
  database: D1Database,
  scheduleVersion: number,
  scheduledAt: string
): Promise<CycleRow | null> =>
  database
    .prepare(
      `SELECT id, schedule_version, scheduled_at, season, week, random_seed,
              status, attempt_count
       FROM leaderboard_reward_cycles
       WHERE schedule_version = ? AND scheduled_at = ?`
    )
    .bind(scheduleVersion, scheduledAt)
    .first<CycleRow>()

const nextDueTime = async (
  database: D1Database,
  schedule: ScheduleRow,
  now: Date
): Promise<Date | null> => {
  const first = validatedFirstRun(schedule)
  const latest = await database
    .prepare(
      `SELECT scheduled_at, status FROM leaderboard_reward_cycles
       WHERE schedule_version = ?
       ORDER BY scheduled_at DESC LIMIT 1`
    )
    .bind(schedule.version)
    .first<{ scheduled_at: string; status: CycleRow['status'] }>()
  if (latest && latest.status !== 'COMPLETED') {
    return new Date(latest.scheduled_at)
  }
  const candidate = latest
    ? new Date(Date.parse(latest.scheduled_at) + WEEK_MS)
    : first
  return candidate.getTime() <= now.getTime() ? candidate : null
}

const ensureCycle = async (
  database: D1Database,
  schedule: ScheduleRow,
  scheduledAt: Date,
  now: Date
): Promise<CycleRow> => {
  const rewarded = seasonWeekFromDate(new Date(scheduledAt.getTime() - DAY_MS))
  if (rewarded.week < 1 || rewarded.week > 4) {
    throw new Error('leaderboard reward cycle week is invalid')
  }
  await database
    .prepare(
      `INSERT OR IGNORE INTO leaderboard_reward_cycles
         (schedule_version, scheduled_at, season, week, random_seed, status,
          attempt_count, started_at)
       VALUES (?, ?, ?, ?, ?, 'PREPARING', 0, ?)`
    )
    .bind(
      schedule.version,
      scheduledAt.toISOString(),
      rewarded.season,
      rewarded.week,
      crypto.randomUUID(),
      now.toISOString()
    )
    .run()
  const cycle = await cycleBySchedule(
    database,
    schedule.version,
    scheduledAt.toISOString()
  )
  if (!cycle) throw new Error('leaderboard reward cycle was not created')
  return cycle
}

const snapshotCycle = async (
  database: D1Database,
  cycle: CycleRow,
  now: Date
): Promise<void> => {
  const statements: D1PreparedStatement[] = []
  for (const mode of RANKED_MODES) {
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO leaderboard_reward_entries
             (cycle_id, user_id, game_mode, rank, snapshotted_at)
           SELECT ?, ranked.user_id, ?, ranked.rank, ?
           FROM (
             SELECT stats.user_id,
                    ROW_NUMBER() OVER (
                      ORDER BY stats.score DESC, stats.created_at DESC
                    ) AS rank
             FROM player_account_stats stats
             JOIN player_account_settings settings
               ON settings.user_id = stats.user_id
             WHERE stats.game_mode = ? AND stats.season = ?
               AND settings.leaderboard_eligible = 1
               AND settings.account_status NOT IN (
                 'BANNED', 'SUSPENDED', 'DELETED'
               )
             ORDER BY stats.score DESC, stats.created_at DESC
             LIMIT 500
           ) ranked
           WHERE EXISTS (
             SELECT 1 FROM leaderboard_reward_cycles
             WHERE id = ? AND status = 'PREPARING'
           )`
        )
        .bind(cycle.id, mode, now.toISOString(), mode, cycle.season, cycle.id)
    )
  }
  statements.push(
    database
      .prepare(
        `UPDATE leaderboard_reward_cycles
         SET status = 'DELIVERING'
         WHERE id = ? AND status = 'PREPARING'`
      )
      .bind(cycle.id)
  )
  await database.batch(statements)
}

const uint32 = (bytes: Uint8Array): number =>
  ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0

const drawCards = async (
  pool: number[],
  count: number,
  seed: string
): Promise<number[]> => {
  if (count === 0) return []
  if (pool.length === 0)
    throw new Error('leaderboard reward card pool is empty')
  const encoder = new TextEncoder()
  const draws: number[] = []
  for (let index = 0; index < count; index += 1) {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`${seed}:${index}`)
    )
    draws.push(pool[uint32(new Uint8Array(digest)) % pool.length])
  }
  return draws
}

const rankOrder: Record<string, number> = {
  UNKNOWN: 0,
  UNRANKED: 1,
  WANDERER: 2,
  TRAINEE: 3,
  APPRENTICE: 4,
  EXPERT: 5,
  MASTER: 6,
  GRANDWEAVER: 7
}
const stageOrder: Record<string, number> = {
  STAGE_NONE: 0,
  STAGE_I: 1,
  STAGE_II: 2,
  STAGE_III: 3
}

const earnedRanks = (
  rows: RankUpRow[],
  mode: RankedMode,
  finalRank: number
) => {
  const earned: Array<{ playerRank: string; playerRankStage: string }> = []
  let minimum: RankUpRow | undefined
  for (const row of rows.filter(value => value.game_mode === mode)) {
    const isLower =
      !minimum ||
      (rankOrder[row.player_rank] ?? 0) <
        (rankOrder[minimum.player_rank] ?? 0) ||
      ((rankOrder[row.player_rank] ?? 0) ===
        (rankOrder[minimum.player_rank] ?? 0) &&
        (stageOrder[row.player_rank_stage] ?? 0) <
          (stageOrder[minimum.player_rank_stage] ?? 0))
    if (!isLower) continue
    if (row.player_rank === 'MASTER' && finalRank > 0 && finalRank <= 100) {
      earned.push({
        playerRank: 'GRANDWEAVER',
        playerRankStage: 'STAGE_NONE'
      })
    }
    earned.push({
      playerRank: row.player_rank,
      playerRankStage: row.player_rank_stage
    })
    minimum = row
  }
  return earned
}

const modeTokenIds = (award: ModeAward): number[] => [
  ...award.silverCardIds.map(cardId => 65_536 + cardId),
  ...Array.from({ length: award.tickets }, () => CONQUEST_TICKET_TOKEN_ID)
]

const deliverPlayer = async (
  database: D1Database,
  cycle: CycleRow,
  userId: string,
  entries: EntryRow[],
  now: Date
): Promise<boolean> => {
  const pool = leaderboardRewardCardIds(cycle.season)
  const modeAwards = new Map<RankedMode, ModeAward>()
  for (const entry of entries) {
    const projection = leaderboardRewardsForRank(entry.rank)
    modeAwards.set(entry.game_mode, {
      rank: entry.rank,
      silverCardIds: await drawCards(
        pool,
        projection.silverCards,
        `${cycle.random_seed}:${userId}:${entry.game_mode}`
      ),
      tickets: projection.conquestTickets
    })
  }
  const rewarded = [...modeAwards.values()].some(
    value => value.silverCardIds.length > 0 || value.tickets > 0
  )
  if (!rewarded) return false

  const weekStart = new Date(
    seasonStart(cycle.season).getTime() + (cycle.week - 1) * WEEK_MS
  ).toISOString()
  const rankUps = await database
    .prepare(
      `SELECT game_mode, player_rank, player_rank_stage, awarded_at
       FROM player_rank_up_rewards
       WHERE user_id = ? AND season = ? AND awarded_at > ?
         AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
       ORDER BY awarded_at DESC, rowid DESC`
    )
    .bind(userId, cycle.season, weekStart)
    .all<RankUpRow>()

  const constructed = modeAwards.get('RANKED_CONSTRUCTED')
  const discovery = modeAwards.get('RANKED_DISCOVERY')
  const silverCardCounts: Record<number, number> = {}
  for (const cardId of [
    ...(constructed?.silverCardIds ?? []),
    ...(discovery?.silverCardIds ?? [])
  ]) {
    silverCardCounts[cardId] = (silverCardCounts[cardId] ?? 0) + 1
  }
  const silverCardAmounts = Object.fromEntries(
    Object.entries(silverCardCounts).map(([cardId, count]) => [
      65_536 + Number(cardId),
      count
    ])
  )
  const payload: PlayerAward = {
    silverCardAmounts,
    ticketAmount: (constructed?.tickets ?? 0) + (discovery?.tickets ?? 0),
    rankedConstructedRank: constructed?.rank ?? 0,
    rankedDiscoveryRank: discovery?.rank ?? 0,
    earnedConstructedPlayerRanks: earnedRanks(
      rankUps.results,
      'RANKED_CONSTRUCTED',
      constructed?.rank ?? 0
    ),
    earnedDiscoveryPlayerRanks: earnedRanks(
      rankUps.results,
      'RANKED_DISCOVERY',
      discovery?.rank ?? 0
    )
  }
  const awardKey = `${cycle.id}:${userId}`
  const deliveryKey = crypto.randomUUID()
  const awardedAt = now.toISOString()
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT OR IGNORE INTO player_leaderboard_reward_awards
           (award_key, cycle_id, user_id, season, week, payload_json,
            delivery_key, awarded_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM leaderboard_reward_cycles
           WHERE id = ? AND status = 'DELIVERING'
         )`
      )
      .bind(
        awardKey,
        cycle.id,
        userId,
        cycle.season,
        cycle.week,
        JSON.stringify(payload),
        deliveryKey,
        awardedAt,
        cycle.id
      )
  ]
  for (const [cardId, count] of Object.entries(silverCardCounts)) {
    statements.push(
      database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT ?, 'SW_SILVER_CARDS', ?, ?, 1, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_leaderboard_reward_awards
             WHERE award_key = ? AND delivery_key = ?
           )
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = balance + excluded.balance,
                         is_new = 1, updated_at = excluded.updated_at`
        )
        .bind(
          userId,
          Number(cardId),
          count,
          `leaderboard:${cycle.id}`,
          awardedAt,
          awardedAt,
          awardKey,
          deliveryKey
        )
    )
  }
  if (payload.ticketAmount > 0) {
    statements.push(
      database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT ?, 'SW_CONQUEST_TICKET', 2, ?, 1, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_leaderboard_reward_awards
             WHERE award_key = ? AND delivery_key = ?
           )
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = balance + excluded.balance,
                         is_new = 1, updated_at = excluded.updated_at`
        )
        .bind(
          userId,
          payload.ticketAmount,
          `leaderboard:${cycle.id}`,
          awardedAt,
          awardedAt,
          awardKey,
          deliveryKey
        )
    )
  }
  for (const [mode, award] of modeAwards) {
    const tokenIds = modeTokenIds(award)
    if (tokenIds.length === 0) continue
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO player_leaderboard_reward_feed_events
             (award_id, user_id, game_mode, leaderboard_rank,
              token_ids_json, created_at)
           SELECT id, user_id, ?, ?, ?, ?
           FROM player_leaderboard_reward_awards
           WHERE award_key = ? AND delivery_key = ?`
        )
        .bind(
          mode,
          award.rank,
          JSON.stringify(tokenIds),
          awardedAt,
          awardKey,
          deliveryKey
        )
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT OR IGNORE INTO player_notifications
           (user_id, notification_type, payload, created_at,
            leaderboard_award_id, push_enabled)
         SELECT user_id, 'LEADERBOARD_REWARD', ?, ?, id, 1
         FROM player_leaderboard_reward_awards
         WHERE award_key = ? AND delivery_key = ?`
      )
      .bind(
        JSON.stringify({ leaderboardReward: payload }),
        awardedAt,
        awardKey,
        deliveryKey
      )
  )
  await database.batch(statements)
  return Boolean(
    await database
      .prepare(
        `SELECT 1 FROM player_leaderboard_reward_awards
         WHERE award_key = ? AND delivery_key = ?`
      )
      .bind(awardKey, deliveryKey)
      .first()
  )
}

const deliverCycle = async (
  database: D1Database,
  cycle: CycleRow,
  now: Date
): Promise<number> => {
  const players = await database
    .prepare(
      `SELECT entries.user_id, MIN(entries.rank) AS best_rank
       FROM leaderboard_reward_entries entries
       LEFT JOIN player_leaderboard_reward_awards award
         ON award.cycle_id = entries.cycle_id
        AND award.user_id = entries.user_id
       WHERE entries.cycle_id = ? AND entries.rank <= 250
         AND award.id IS NULL
       GROUP BY entries.user_id
       ORDER BY best_rank, entries.user_id
       LIMIT ?`
    )
    .bind(cycle.id, MAX_PLAYERS_PER_RUN)
    .all<{ user_id: string; best_rank: number }>()
  let delivered = 0
  for (const player of players.results) {
    const entries = await database
      .prepare(
        `SELECT user_id, game_mode, rank
         FROM leaderboard_reward_entries
         WHERE cycle_id = ? AND user_id = ?
         ORDER BY game_mode`
      )
      .bind(cycle.id, player.user_id)
      .all<EntryRow>()
    if (
      await deliverPlayer(database, cycle, player.user_id, entries.results, now)
    ) {
      delivered++
    }
  }
  return delivered
}

const cycleDeliveryComplete = async (
  database: D1Database,
  cycleId: number
): Promise<boolean> => {
  const row = await database
    .prepare(
      `SELECT
         (SELECT COUNT(DISTINCT user_id)
          FROM leaderboard_reward_entries
          WHERE cycle_id = ? AND rank <= 250) AS expected,
         (SELECT COUNT(*) FROM player_leaderboard_reward_awards
          WHERE cycle_id = ?) AS delivered`
    )
    .bind(cycleId, cycleId)
    .first<{ expected: number; delivered: number }>()
  return row?.expected === row?.delivered
}

const recordFailure = async (
  database: D1Database,
  cycle: CycleRow,
  error: unknown,
  now: Date
) => {
  const message = (
    error instanceof Error
      ? error.message
      : 'leaderboard reward delivery failed'
  ).slice(0, 1_000)
  await database
    .prepare(
      `UPDATE leaderboard_reward_cycles
       SET attempt_count = attempt_count + 1,
           status = CASE WHEN attempt_count + 1 >= ?
                         THEN 'FAILED' ELSE status END,
           last_error = CASE WHEN attempt_count + 1 >= ? THEN ? ELSE NULL END,
           completed_at = CASE WHEN attempt_count + 1 >= ? THEN ? ELSE NULL END
       WHERE id = ? AND status IN ('PREPARING', 'DELIVERING')`
    )
    .bind(
      MAX_ATTEMPTS,
      MAX_ATTEMPTS,
      message,
      MAX_ATTEMPTS,
      now.toISOString(),
      cycle.id
    )
    .run()
}

/**
 * Runs at most the most recent due weekly cycle. With no enabled schedule row
 * (the production default), this is a read-only no-op.
 */
export const runDueLeaderboardRewards = async (
  database: D1Database,
  now = new Date()
): Promise<LeaderboardRewardRun> => {
  const schedule = await activeSchedule(database, now)
  if (!schedule) return { status: 'disabled', delivered: 0 }
  const scheduledAt = await nextDueTime(database, schedule, now)
  if (!scheduledAt) return { status: 'not_due', delivered: 0 }
  let cycle = await ensureCycle(database, schedule, scheduledAt, now)
  if (cycle.status === 'COMPLETED') {
    return { status: 'already_completed', cycleId: cycle.id, delivered: 0 }
  }
  if (cycle.status === 'FAILED') {
    return { status: 'failed', cycleId: cycle.id, delivered: 0 }
  }
  try {
    if (cycle.status === 'PREPARING') {
      await snapshotCycle(database, cycle, now)
      cycle = (await cycleBySchedule(
        database,
        schedule.version,
        scheduledAt.toISOString()
      ))!
    }
    const delivered = await deliverCycle(database, cycle, now)
    if (await cycleDeliveryComplete(database, cycle.id)) {
      await applyLeaderboardRankReset(database, cycle.id, now)
    }
    const completed = await cycleBySchedule(
      database,
      schedule.version,
      scheduledAt.toISOString()
    )
    return {
      status: completed?.status === 'COMPLETED' ? 'completed' : 'in_progress',
      cycleId: cycle.id,
      delivered
    }
  } catch (error) {
    await recordFailure(database, cycle, error, now)
    throw error
  }
}
