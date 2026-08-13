import cardLibrary from './generated/card-library.json'

import { ConquestV2EconomyRepository } from './conquest-v2-economy'

const EVENT_ID = 2
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_PLAYERS_PER_RUN = 5
const SILVER_TOKEN_OFFSET = 65_536

const TREASURE_TOTAL_WEIGHTS = [
  0, 1, 3.19, 6.9, 12.65, 21.32, 34.29, 53.99, 84.67, 134.32, 218.69
] as const

interface ScheduleRow {
  version: number
  enabled: number
  weekday_utc: number | null
  hour_utc: number | null
  minute_utc: number | null
  first_run_at: string | null
  first_season: number | null
  first_week: number | null
  delivery_delay_seconds: number | null
  reward_card_sets_json: string | null
  starts_at: string
}

interface CycleRow {
  id: number
  schedule_version: number
  scheduled_at: string
  delivery_at: string
  season: number
  week: number
  random_seed: string
  reward_card_sets_json: string
  eligible_card_ids_json: string
  pool_amount: number
  weight_per_silver_card: number
  total_weight: number | null
  status: 'PREPARING' | 'PENDING_DELIVERY' | 'DELIVERING' | 'COMPLETED'
  attempt_count: number
}

interface EntryRow {
  user_id: string
  treasure_level: number
  treasure_weight: number
}

export interface ConquestV2RewardRun {
  status:
    | 'disabled'
    | 'not_due'
    | 'awaiting_delivery'
    | 'completed'
    | 'in_progress'
    | 'already_completed'
  cycleId?: number
  delivered: number
}

export type ConquestV2OffchainTreasureInfo = Record<
  number,
  { amountSilver: number; amountUSDC: 0 }
>

const emptyTreasureInfo = (): ConquestV2OffchainTreasureInfo =>
  Object.fromEntries(
    Array.from({ length: 11 }, (_, level) => [
      level,
      { amountSilver: 0, amountUSDC: 0 as const }
    ])
  )

const goFloat32 = (value: number) => Math.fround(value)

export const conquestV2SilverCardCount = (
  weightPerSilverCard: number,
  treasureLevel: number
): number =>
  Math.floor(
    Math.fround(
      Math.fround(TREASURE_TOTAL_WEIGHTS[treasureLevel] ?? 0) *
        Math.fround(weightPerSilverCard)
    )
  )

export const conquestV2LegacyUsdcMicros = (
  poolAmount: number,
  totalWeight: number,
  treasureLevel: number
): number => {
  const divisor = totalWeight === 0 ? 1 : totalWeight
  const share = Math.fround(
    Math.fround(Math.fround(poolAmount) / Math.fround(divisor)) *
      Math.fround(TREASURE_TOTAL_WEIGHTS[treasureLevel] ?? 0)
  )
  return Math.round(Number(share) * 1_000_000)
}

export const conquestV2RewardCardIds = (
  season: number,
  cardSets: string[]
): number[] => {
  const validCards = cardLibrary.cards.filter(
    card => card.validFromSeason <= season
  )
  const selected = validCards.filter(card => cardSets.includes(card.set))
  // CardIndex.GetRandomCardFromList falls back to all season-valid PLAY cards
  // when every configured-set card is excluded. Preserve that source behavior.
  return (selected.length > 0 ? selected : validCards).map(card => card.id)
}

export const mostRecentConquestV2RewardTime = (
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
      `SELECT version, enabled, weekday_utc, hour_utc, minute_utc,
              first_run_at, first_season, first_week,
              delivery_delay_seconds, reward_card_sets_json, starts_at
       FROM conquest_v2_reward_schedule_versions
       WHERE starts_at <= ?
       ORDER BY version DESC LIMIT 1`
    )
    .bind(now.toISOString())
    .first<ScheduleRow>()
  return schedule?.enabled === 1 ? schedule : null
}

const validatedSchedule = (schedule: ScheduleRow) => {
  if (
    schedule.first_run_at === null ||
    schedule.first_season === null ||
    schedule.first_week === null ||
    schedule.delivery_delay_seconds === null ||
    schedule.reward_card_sets_json === null ||
    schedule.weekday_utc === null ||
    schedule.hour_utc === null ||
    schedule.minute_utc === null
  ) {
    throw new Error('Conquest V2 reward schedule is malformed')
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
    first.getUTCMilliseconds() !== 0 ||
    schedule.first_season < 1 ||
    schedule.first_week < 1 ||
    schedule.first_week > 4 ||
    schedule.delivery_delay_seconds < 0 ||
    !schedule.reward_card_sets_json.trim()
  ) {
    throw new Error('Conquest V2 reward schedule is malformed')
  }
  return {
    first,
    firstSeason: schedule.first_season,
    firstWeek: schedule.first_week,
    deliveryDelaySeconds: schedule.delivery_delay_seconds,
    rewardCardSets: (() => {
      const parsed = JSON.parse(schedule.reward_card_sets_json) as unknown
      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        parsed.some(value => typeof value !== 'string' || !value.trim())
      ) {
        throw new Error('Conquest V2 reward schedule is malformed')
      }
      return [...new Set(parsed)]
    })()
  }
}

const cycleBySchedule = async (
  database: D1Database,
  scheduleVersion: number,
  scheduledAt: string
): Promise<CycleRow | null> =>
  database
    .prepare(
      `SELECT id, schedule_version, scheduled_at, delivery_at, season, week,
              random_seed, reward_card_sets_json, eligible_card_ids_json,
              pool_amount, weight_per_silver_card, total_weight, status,
              attempt_count
       FROM conquest_v2_reward_cycles
       WHERE schedule_version = ? AND scheduled_at = ?`
    )
    .bind(scheduleVersion, scheduledAt)
    .first<CycleRow>()

const nextDueTime = async (
  database: D1Database,
  schedule: ScheduleRow,
  now: Date
): Promise<Date | null> => {
  const { first } = validatedSchedule(schedule)
  const latest = await database
    .prepare(
      `SELECT scheduled_at, status FROM conquest_v2_reward_cycles
       WHERE schedule_version = ? ORDER BY scheduled_at DESC LIMIT 1`
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

const cycleSeasonWeek = (
  schedule: ScheduleRow,
  scheduledAt: Date
): { season: number; week: number } => {
  const { first, firstSeason, firstWeek } = validatedSchedule(schedule)
  const elapsedWeeks = Math.round(
    (scheduledAt.getTime() - first.getTime()) / WEEK_MS
  )
  const absoluteWeek = firstWeek - 1 + elapsedWeeks
  return {
    season: firstSeason + Math.floor(absoluteWeek / 4),
    week: (absoluteWeek % 4) + 1
  }
}

/**
 * Public identity-mode projection of actual deliverable value. The legacy
 * USDC field stays zero for wire compatibility; no cash/token estimate is
 * exposed. A missing, future, disabled, or unsafe schedule advertises no
 * reward rather than promising value that the Worker would refuse to grant.
 */
export const conquestV2OffchainTreasureInfo = async (
  database: D1Database,
  now = new Date()
): Promise<ConquestV2OffchainTreasureInfo> => {
  const empty = emptyTreasureInfo()
  const schedule = await activeSchedule(database, now)
  if (!schedule) return empty
  const { first, rewardCardSets } = validatedSchedule(schedule)
  const scheduledAt = mostRecentConquestV2RewardTime(first, now)
  if (!scheduledAt) return empty
  const { season } = cycleSeasonWeek(schedule, scheduledAt)
  if (conquestV2RewardCardIds(season, rewardCardSets).length === 0) return empty
  const config = await new ConquestV2EconomyRepository(database).config()
  const weightPerSilverCard = config.settings.weightPerSilverCard
  if (
    weightPerSilverCard <= 0 ||
    conquestV2SilverCardCount(weightPerSilverCard, 1) < 1
  ) {
    return empty
  }
  return Object.fromEntries(
    Array.from({ length: 11 }, (_, level) => [
      level,
      {
        amountSilver: conquestV2SilverCardCount(weightPerSilverCard, level),
        amountUSDC: 0 as const
      }
    ])
  )
}

const ensureCycle = async (
  database: D1Database,
  schedule: ScheduleRow,
  scheduledAt: Date,
  now: Date
): Promise<CycleRow> => {
  const existing = await cycleBySchedule(
    database,
    schedule.version,
    scheduledAt.toISOString()
  )
  if (existing) return existing

  const { deliveryDelaySeconds, rewardCardSets } = validatedSchedule(schedule)
  const { season, week } = cycleSeasonWeek(schedule, scheduledAt)
  const economy = new ConquestV2EconomyRepository(database)
  const config = await economy.config()
  const weightPerSilverCard = config.settings.weightPerSilverCard
  if (
    weightPerSilverCard <= 0 ||
    conquestV2SilverCardCount(weightPerSilverCard, 1) < 1
  ) {
    throw new Error(
      'Conquest V2 reward activation would deduct points without an off-chain item'
    )
  }
  const eligibleCardIds = conquestV2RewardCardIds(season, rewardCardSets)
  if (eligibleCardIds.length === 0) {
    throw new Error('Conquest V2 reward card pool is empty')
  }
  const pool = await economy.poolSnapshot(now)
  await database
    .prepare(
      `INSERT OR IGNORE INTO conquest_v2_reward_cycles
         (schedule_version, scheduled_at, delivery_at, season, week,
          random_seed, reward_card_sets_json, eligible_card_ids_json, pool_amount,
          weight_per_silver_card, status, attempt_count, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PREPARING', 0, ?)`
    )
    .bind(
      schedule.version,
      scheduledAt.toISOString(),
      new Date(
        scheduledAt.getTime() + deliveryDelaySeconds * 1_000
      ).toISOString(),
      season,
      week,
      crypto.randomUUID(),
      JSON.stringify(rewardCardSets),
      JSON.stringify(eligibleCardIds),
      pool.amount,
      weightPerSilverCard,
      now.toISOString()
    )
    .run()
  const cycle = await cycleBySchedule(
    database,
    schedule.version,
    scheduledAt.toISOString()
  )
  if (!cycle) throw new Error('Conquest V2 reward cycle was not created')
  return cycle
}

const levelSql = `CASE
  WHEN current_points >= 13750 THEN 10
  WHEN current_points >= 11250 THEN 9
  WHEN current_points >= 9000 THEN 8
  WHEN current_points >= 7000 THEN 7
  WHEN current_points >= 5250 THEN 6
  WHEN current_points >= 3750 THEN 5
  WHEN current_points >= 2500 THEN 4
  WHEN current_points >= 1500 THEN 3
  WHEN current_points >= 750 THEN 2
  WHEN current_points >= 250 THEN 1
  ELSE 0 END`

const pointsSql = `CASE
  WHEN current_points >= 13750 THEN 13750
  WHEN current_points >= 11250 THEN 11250
  WHEN current_points >= 9000 THEN 9000
  WHEN current_points >= 7000 THEN 7000
  WHEN current_points >= 5250 THEN 5250
  WHEN current_points >= 3750 THEN 3750
  WHEN current_points >= 2500 THEN 2500
  WHEN current_points >= 1500 THEN 1500
  WHEN current_points >= 750 THEN 750
  WHEN current_points >= 250 THEN 250
  ELSE 0 END`

const weightSql = `CASE
  WHEN current_points >= 13750 THEN 218.69
  WHEN current_points >= 11250 THEN 134.32
  WHEN current_points >= 9000 THEN 84.67
  WHEN current_points >= 7000 THEN 53.99
  WHEN current_points >= 5250 THEN 34.29
  WHEN current_points >= 3750 THEN 21.32
  WHEN current_points >= 2500 THEN 12.65
  WHEN current_points >= 1500 THEN 6.9
  WHEN current_points >= 750 THEN 3.19
  WHEN current_points >= 250 THEN 1
  ELSE 0 END`

const snapshotCycle = async (
  database: D1Database,
  cycle: CycleRow,
  now: Date
): Promise<void> => {
  const timestamp = now.toISOString()
  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO conquest_v2_reward_entries
           (cycle_id, user_id, points_before, points_accounted,
            points_remaining, treasure_level, treasure_weight,
            snapshotted_at)
         SELECT ?, user_id, current_points, ${pointsSql},
                current_points - (${pointsSql}), ${levelSql}, ${weightSql}, ?
         FROM player_conquest_points
         WHERE event_id = ? AND current_points >= 250
           AND EXISTS (
             SELECT 1 FROM conquest_v2_reward_cycles
             WHERE id = ? AND status = 'PREPARING'
           )`
      )
      .bind(cycle.id, timestamp, EVENT_ID, cycle.id),
    database
      .prepare(
        `UPDATE player_conquest_points
         SET current_points = (
               SELECT entry.points_remaining
               FROM conquest_v2_reward_entries entry
               WHERE entry.cycle_id = ?
                 AND entry.user_id = player_conquest_points.user_id
             ),
             updated_at = ?
         WHERE event_id = ? AND EXISTS (
           SELECT 1 FROM conquest_v2_reward_entries entry
           WHERE entry.cycle_id = ?
             AND entry.user_id = player_conquest_points.user_id
             AND entry.points_before = player_conquest_points.current_points
         )`
      )
      .bind(cycle.id, timestamp, EVENT_ID, cycle.id)
  ])

  const weights = await database
    .prepare(
      `SELECT treasure_weight FROM conquest_v2_reward_entries
       WHERE cycle_id = ? ORDER BY user_id`
    )
    .bind(cycle.id)
    .all<{ treasure_weight: number }>()
  let totalWeight = 0
  for (const row of weights.results) {
    totalWeight = goFloat32(totalWeight + goFloat32(row.treasure_weight))
  }
  await database
    .prepare(
      `UPDATE conquest_v2_reward_cycles
       SET total_weight = ?, status = 'PENDING_DELIVERY'
       WHERE id = ? AND status = 'PREPARING'`
    )
    .bind(totalWeight, cycle.id)
    .run()
}

const uint32 = (bytes: Uint8Array): number =>
  ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0

const drawCards = async (
  pool: number[],
  count: number,
  seed: string
): Promise<number[]> => {
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

const deliverPlayer = async (
  database: D1Database,
  cycle: CycleRow,
  entry: EntryRow,
  now: Date
): Promise<boolean> => {
  const pool = JSON.parse(cycle.eligible_card_ids_json) as number[]
  const silverCardIds = await drawCards(
    pool,
    conquestV2SilverCardCount(
      cycle.weight_per_silver_card,
      entry.treasure_level
    ),
    `${cycle.random_seed}:${entry.user_id}`
  )
  if (silverCardIds.length === 0) {
    throw new Error('Conquest V2 reward has no off-chain items')
  }
  const cardCounts = new Map<number, number>()
  for (const cardId of silverCardIds) {
    cardCounts.set(cardId, (cardCounts.get(cardId) ?? 0) + 1)
  }
  const silverCardAmounts = Object.fromEntries(
    [...cardCounts].map(([cardId, count]) => [
      SILVER_TOKEN_OFFSET + cardId,
      count
    ])
  )
  const legacyUsdcMicros = conquestV2LegacyUsdcMicros(
    cycle.pool_amount,
    cycle.total_weight ?? 0,
    entry.treasure_level
  )
  const awardKey = `${cycle.id}:${entry.user_id}`
  const deliveryKey = crypto.randomUUID()
  const awardedAt = now.toISOString()
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT OR IGNORE INTO player_conquest_v2_reward_awards
           (award_key, cycle_id, user_id, treasure_level,
            silver_card_ids_json, legacy_usdc_micros_audit_only,
            delivery_key, awarded_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM conquest_v2_reward_cycles
           WHERE id = ? AND status = 'DELIVERING'
         )`
      )
      .bind(
        awardKey,
        cycle.id,
        entry.user_id,
        entry.treasure_level,
        JSON.stringify(silverCardIds),
        legacyUsdcMicros,
        deliveryKey,
        awardedAt,
        cycle.id
      )
  ]
  for (const [cardId, count] of cardCounts) {
    statements.push(
      database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT ?, 'SW_SILVER_CARDS', ?, ?, 1, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_conquest_v2_reward_awards
             WHERE award_key = ? AND delivery_key = ?
           )
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = balance + excluded.balance,
                         is_new = 1, updated_at = excluded.updated_at`
        )
        .bind(
          entry.user_id,
          cardId,
          count,
          `conquest-v2:${cycle.id}`,
          awardedAt,
          awardedAt,
          awardKey,
          deliveryKey
        )
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT OR IGNORE INTO player_conquest_v2_reward_feed_events
           (award_id, user_id, treasure_level, token_ids_json, created_at)
         SELECT id, user_id, treasure_level, ?, ?
         FROM player_conquest_v2_reward_awards
         WHERE award_key = ? AND delivery_key = ?`
      )
      .bind(
        JSON.stringify(
          silverCardIds.map(cardId => SILVER_TOKEN_OFFSET + cardId)
        ),
        awardedAt,
        awardKey,
        deliveryKey
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO player_notifications
           (user_id, notification_type, payload, created_at,
            conquest_v2_award_id, push_enabled)
         SELECT user_id, 'CONQUEST_V2_REWARD', ?, ?, id, 1
         FROM player_conquest_v2_reward_awards
         WHERE award_key = ? AND delivery_key = ?`
      )
      .bind(
        JSON.stringify({
          conquestV2Reward: {
            season: cycle.season,
            week: cycle.week,
            treasureLevel: entry.treasure_level,
            amountUSDC: 0,
            silverCardAmounts
          }
        }),
        awardedAt,
        awardKey,
        deliveryKey
      )
  )
  await database.batch(statements)
  return Boolean(
    await database
      .prepare(
        `SELECT 1 FROM player_conquest_v2_reward_awards
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
  const entries = await database
    .prepare(
      `SELECT entry.user_id, entry.treasure_level, entry.treasure_weight
       FROM conquest_v2_reward_entries entry
       LEFT JOIN player_conquest_v2_reward_awards award
         ON award.cycle_id = entry.cycle_id AND award.user_id = entry.user_id
       WHERE entry.cycle_id = ? AND award.id IS NULL
       ORDER BY entry.treasure_level DESC, entry.user_id
       LIMIT ?`
    )
    .bind(cycle.id, MAX_PLAYERS_PER_RUN)
    .all<EntryRow>()
  let delivered = 0
  for (const entry of entries.results) {
    if (await deliverPlayer(database, cycle, entry, now)) delivered++
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
         (SELECT COUNT(*) FROM conquest_v2_reward_entries
          WHERE cycle_id = ?) AS expected,
         (SELECT COUNT(*) FROM player_conquest_v2_reward_awards
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
      : 'Conquest V2 reward delivery failed'
  ).slice(0, 1_000)
  const attemptNumber = cycle.attempt_count + 1
  await database.batch([
    database
      .prepare(
        `UPDATE conquest_v2_reward_cycles
       SET attempt_count = attempt_count + 1
       WHERE id = ? AND attempt_count = ?
         AND status IN ('PREPARING', 'PENDING_DELIVERY', 'DELIVERING')`
      )
      .bind(cycle.id, cycle.attempt_count),
    database
      .prepare(
        `INSERT OR IGNORE INTO conquest_v2_reward_cycle_failures
           (cycle_id, attempt_number, error, failed_at)
         SELECT id, ?, ?, ? FROM conquest_v2_reward_cycles
         WHERE id = ? AND attempt_count = ?`
      )
      .bind(attemptNumber, message, now.toISOString(), cycle.id, attemptNumber)
  ])
}

/**
 * Runs at most one due weekly cycle. Production has no schedule row, so the
 * default is a read-only no-op. A cycle snapshots and rolls over points once,
 * then waits for its explicit delivery boundary before granting D1 inventory.
 */
export const runDueConquestV2Rewards = async (
  database: D1Database,
  now = new Date()
): Promise<ConquestV2RewardRun> => {
  const schedule = await activeSchedule(database, now)
  if (!schedule) return { status: 'disabled', delivered: 0 }
  const scheduledAt = await nextDueTime(database, schedule, now)
  if (!scheduledAt) return { status: 'not_due', delivered: 0 }
  let cycle = await ensureCycle(database, schedule, scheduledAt, now)
  if (cycle.status === 'COMPLETED') {
    return { status: 'already_completed', cycleId: cycle.id, delivered: 0 }
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
    if (
      cycle.status === 'PENDING_DELIVERY' &&
      Date.parse(cycle.delivery_at) > now.getTime()
    ) {
      return {
        status: 'awaiting_delivery',
        cycleId: cycle.id,
        delivered: 0
      }
    }
    if (cycle.status === 'PENDING_DELIVERY') {
      await database
        .prepare(
          `UPDATE conquest_v2_reward_cycles SET status = 'DELIVERING'
           WHERE id = ? AND status = 'PENDING_DELIVERY'`
        )
        .bind(cycle.id)
        .run()
      cycle = (await cycleBySchedule(
        database,
        schedule.version,
        scheduledAt.toISOString()
      ))!
    }
    const delivered = await deliverCycle(database, cycle, now)
    if (await cycleDeliveryComplete(database, cycle.id)) {
      await database
        .prepare(
          `UPDATE conquest_v2_reward_cycles
           SET status = 'COMPLETED', completed_at = ?
           WHERE id = ? AND status = 'DELIVERING'`
        )
        .bind(now.toISOString(), cycle.id)
        .run()
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
