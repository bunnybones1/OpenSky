import { ConquestV2EconomyRepository } from './conquest-v2-economy'
import {
  CONQUEST_V2_REWARD_POLICY_HASH,
  CONQUEST_V2_REWARD_POLICY_VERSION,
  conquestV2RewardCardIds,
  conquestV2SilverCardCount
} from './conquest-v2-reward-policy'
import {
  CONQUEST_V2_TREASURE_LEVEL_SQL,
  CONQUEST_V2_TREASURE_POINTS_ACCOUNTED_SQL,
  CONQUEST_V2_TREASURE_TOTAL_WEIGHTS,
  CONQUEST_V2_TREASURE_WEIGHT_SQL
} from './conquest-v2-treasure'

const EVENT_ID = 2
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const SILVER_TOKEN_OFFSET = 65_536

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
  activation_status: 'DRAFT' | 'ACTIVE' | null
  policy_version: number | null
  policy_hash: string | null
  policy_activated_at: string | null
  settings_version: number | null
  settings_mutation_id: string | null
  approved_weight_per_silver_card: number | null
  silver_counts_json: string | null
  current_settings_version: number
  current_settings_mutation_id: string
  current_weight_per_silver_card: number
}

export interface ConquestV2RewardCycleRow {
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

export interface ConquestV2RewardEntryRow {
  user_id: string
  treasure_level: number
  treasure_weight: number
}

export interface ConquestV2RewardOrchestrationReceipt {
  cycleId: number
  workflowInstanceId: string
  acceptedAt: string
  completedAt?: string
}

export interface AcceptedConquestV2RewardCycle {
  status: 'disabled' | 'not_due' | 'accepted' | 'already_completed'
  cycle?: ConquestV2RewardCycleRow
  orchestration?: ConquestV2RewardOrchestrationReceipt
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

export {
  conquestV2RewardCardIds,
  conquestV2SilverCardCount
} from './conquest-v2-reward-policy'

export const conquestV2LegacyUsdcMicros = (
  poolAmount: number,
  totalWeight: number,
  treasureLevel: number
): number => {
  const divisor = totalWeight === 0 ? 1 : totalWeight
  const share = Math.fround(
    Math.fround(Math.fround(poolAmount) / Math.fround(divisor)) *
      Math.fround(CONQUEST_V2_TREASURE_TOTAL_WEIGHTS[treasureLevel] ?? 0)
  )
  return Math.round(Number(share) * 1_000_000)
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

const scheduleSelect = `
  SELECT schedule.version, schedule.enabled, schedule.weekday_utc,
         schedule.hour_utc, schedule.minute_utc, schedule.first_run_at,
         schedule.first_season, schedule.first_week,
         schedule.delivery_delay_seconds, schedule.reward_card_sets_json,
         schedule.starts_at, activation.status AS activation_status,
         activation.policy_version, activation.policy_hash,
         activation.activated_at AS policy_activated_at,
         activation.settings_version, activation.settings_mutation_id,
         activation.weight_per_silver_card AS approved_weight_per_silver_card,
         activation.silver_counts_json, settings.version AS current_settings_version,
         settings.mutation_id AS current_settings_mutation_id,
         settings.weight_per_silver_card AS current_weight_per_silver_card
  FROM conquest_v2_reward_schedule_versions schedule
  LEFT JOIN conquest_v2_reward_schedule_activations activation
    ON activation.schedule_version = schedule.version
  JOIN conquest_v2_pool_settings settings ON settings.singleton = 1`

const approvedSchedule = (schedule: ScheduleRow | null, now: Date) =>
  schedule?.enabled === 1 &&
  schedule.activation_status === 'ACTIVE' &&
  schedule.policy_version === CONQUEST_V2_REWARD_POLICY_VERSION &&
  schedule.policy_hash === CONQUEST_V2_REWARD_POLICY_HASH &&
  schedule.policy_activated_at !== null &&
  schedule.policy_activated_at <= now.toISOString()

const activeSchedule = async (
  database: D1Database,
  now: Date
): Promise<ScheduleRow | null> => {
  const schedule = await database
    .prepare(
      `${scheduleSelect}
       WHERE schedule.starts_at <= ?
       ORDER BY schedule.version DESC LIMIT 1`
    )
    .bind(now.toISOString())
    .first<ScheduleRow>()
  return approvedSchedule(schedule, now) &&
    schedule!.settings_version === schedule!.current_settings_version &&
    schedule!.settings_mutation_id === schedule!.current_settings_mutation_id &&
    schedule!.approved_weight_per_silver_card ===
      schedule!.current_weight_per_silver_card
    ? schedule
    : null
}

const resumableSchedule = async (
  database: D1Database,
  now: Date
): Promise<ScheduleRow | null> => {
  // A newer disabled schedule stops future snapshots, not a delivery already
  // promised by this cycle's immutable policy receipt. Do not join or filter
  // through the current schedule switch here.
  const schedule = await database
    .prepare(
      `${scheduleSelect}
       JOIN conquest_v2_reward_cycles cycle
         ON cycle.schedule_version = schedule.version
       JOIN conquest_v2_reward_cycle_policy_receipts receipt
         ON receipt.cycle_id = cycle.id
       WHERE cycle.status <> 'COMPLETED'
       ORDER BY cycle.scheduled_at, cycle.id LIMIT 1`
    )
    .first<ScheduleRow>()
  return approvedSchedule(schedule, now) ? schedule : null
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
    schedule.minute_utc === null ||
    schedule.approved_weight_per_silver_card === null ||
    schedule.silver_counts_json === null
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
  const silverCounts = JSON.parse(schedule.silver_counts_json) as unknown
  if (
    !Array.isArray(silverCounts) ||
    silverCounts.length !== 11 ||
    silverCounts.some(
      (value, level) =>
        !Number.isInteger(value) ||
        value !==
          conquestV2SilverCardCount(
            schedule.approved_weight_per_silver_card!,
            level
          )
    ) ||
    silverCounts[0] !== 0 ||
    silverCounts.slice(1).some(value => value < 1)
  ) {
    throw new Error('Conquest V2 reward schedule is malformed')
  }
  return {
    first,
    firstSeason: schedule.first_season,
    firstWeek: schedule.first_week,
    deliveryDelaySeconds: schedule.delivery_delay_seconds,
    silverCounts,
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
): Promise<ConquestV2RewardCycleRow | null> =>
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
    .first<ConquestV2RewardCycleRow>()

export const conquestV2RewardCycleById = async (
  database: D1Database,
  cycleId: number
): Promise<ConquestV2RewardCycleRow | null> =>
  database
    .prepare(
      `SELECT id, schedule_version, scheduled_at, delivery_at, season, week,
              random_seed, reward_card_sets_json, eligible_card_ids_json,
              pool_amount, weight_per_silver_card, total_weight, status,
              attempt_count
       FROM conquest_v2_reward_cycles WHERE id = ?`
    )
    .bind(cycleId)
    .first<ConquestV2RewardCycleRow>()

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
    .first<{
      scheduled_at: string
      status: ConquestV2RewardCycleRow['status']
    }>()
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
  const weightPerSilverCard = schedule.approved_weight_per_silver_card!
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

export const ensureConquestV2RewardCycle = async (
  database: D1Database,
  schedule: ScheduleRow,
  scheduledAt: Date,
  now: Date
): Promise<ConquestV2RewardCycleRow> => {
  const existing = await cycleBySchedule(
    database,
    schedule.version,
    scheduledAt.toISOString()
  )
  if (existing) return existing

  const { deliveryDelaySeconds, rewardCardSets } = validatedSchedule(schedule)
  const { season, week } = cycleSeasonWeek(schedule, scheduledAt)
  const economy = new ConquestV2EconomyRepository(database)
  const weightPerSilverCard = schedule.approved_weight_per_silver_card!
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
  await database.batch([
    database
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
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO conquest_v2_reward_cycle_policy_receipts
         (cycle_id, schedule_version, policy_version, policy_hash,
          settings_version, settings_mutation_id, weight_per_silver_card,
          silver_counts_json, eligible_card_ids_json, created_at)
       SELECT id, schedule_version, ?, ?, ?, ?, ?, ?, eligible_card_ids_json,
              started_at
       FROM conquest_v2_reward_cycles
       WHERE schedule_version = ? AND scheduled_at = ?
         AND status = 'PREPARING'`
      )
      .bind(
        CONQUEST_V2_REWARD_POLICY_VERSION,
        CONQUEST_V2_REWARD_POLICY_HASH,
        schedule.settings_version,
        schedule.settings_mutation_id,
        weightPerSilverCard,
        schedule.silver_counts_json,
        schedule.version,
        scheduledAt.toISOString()
      )
  ])
  const cycle = await cycleBySchedule(
    database,
    schedule.version,
    scheduledAt.toISOString()
  )
  if (!cycle) throw new Error('Conquest V2 reward cycle was not created')
  return cycle
}

const orchestrationReceipt = async (
  database: D1Database,
  cycleId: number
): Promise<ConquestV2RewardOrchestrationReceipt | null> => {
  const row = await database
    .prepare(
      `SELECT cycle_id, workflow_instance_id, accepted_at, completed_at
       FROM conquest_v2_reward_cycle_orchestrations WHERE cycle_id = ?`
    )
    .bind(cycleId)
    .first<{
      cycle_id: number
      workflow_instance_id: string
      accepted_at: string
      completed_at: string | null
    }>()
  return row
    ? {
        cycleId: row.cycle_id,
        workflowInstanceId: row.workflow_instance_id,
        acceptedAt: row.accepted_at,
        ...(row.completed_at ? { completedAt: row.completed_at } : {})
      }
    : null
}

export const ensureConquestV2RewardOrchestration = async (
  database: D1Database,
  cycle: ConquestV2RewardCycleRow,
  now: Date
): Promise<ConquestV2RewardOrchestrationReceipt> => {
  const existing = await orchestrationReceipt(database, cycle.id)
  if (existing) return existing
  const workflowInstanceId = `conquest-v2-cycle-${cycle.id}`
  await database
    .prepare(
      `INSERT OR IGNORE INTO conquest_v2_reward_cycle_orchestrations
         (cycle_id, workflow_instance_id, accepted_at, completed_at)
       VALUES (?, ?, ?, NULL)`
    )
    .bind(cycle.id, workflowInstanceId, now.toISOString())
    .run()
  const receipt = await orchestrationReceipt(database, cycle.id)
  if (!receipt) {
    throw new Error('Conquest V2 orchestration receipt was not created')
  }
  return receipt
}

/**
 * Accepts at most one approved due cycle as durable D1 business work. This is
 * safe to call from every cron recovery trigger; both the cycle and Workflow
 * identity are deterministic and duplicate-safe.
 */
export const acceptDueConquestV2RewardCycle = async (
  database: D1Database,
  now = new Date()
): Promise<AcceptedConquestV2RewardCycle> => {
  const schedule =
    (await resumableSchedule(database, now)) ??
    (await activeSchedule(database, now))
  if (!schedule) return { status: 'disabled' }
  const scheduledAt = await nextDueTime(database, schedule, now)
  if (!scheduledAt) return { status: 'not_due' }
  const cycle = await ensureConquestV2RewardCycle(
    database,
    schedule,
    scheduledAt,
    now
  )
  if (cycle.status === 'COMPLETED') {
    return { status: 'already_completed', cycle }
  }
  return {
    status: 'accepted',
    cycle,
    orchestration: await ensureConquestV2RewardOrchestration(
      database,
      cycle,
      now
    )
  }
}

export const snapshotConquestV2RewardCycle = async (
  database: D1Database,
  cycle: ConquestV2RewardCycleRow,
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
         SELECT ?, points.user_id, points.current_points,
                ${CONQUEST_V2_TREASURE_POINTS_ACCOUNTED_SQL},
                points.current_points - (${CONQUEST_V2_TREASURE_POINTS_ACCOUNTED_SQL}),
                ${CONQUEST_V2_TREASURE_LEVEL_SQL},
                ${CONQUEST_V2_TREASURE_WEIGHT_SQL}, ?
         FROM player_conquest_points points
         JOIN users ON users.id = points.user_id
         WHERE points.event_id = ? AND points.current_points >= 250
           AND users.user_kind = 'PLAYER'
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

export const deliverConquestV2RewardEntry = async (
  database: D1Database,
  cycle: ConquestV2RewardCycleRow,
  entry: ConquestV2RewardEntryRow,
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
            delivery_key, awarded_at, application_status, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'PREPARING', NULL
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
  statements.push(
    // Keep the settlement batch bounded by aggregating the frozen draw in SQL.
    // Level ten can contain hundreds of cards, but still costs two statements
    // instead of two statements per distinct card.
    database
      .prepare(
        `INSERT INTO player_conquest_v2_reward_inventory_grants
           (award_id, item_type, token_id, quantity, before_balance,
            after_balance)
         SELECT award.id, 'SW_SILVER_CARDS',
                CAST(selected.value AS INTEGER), COUNT(*),
                COALESCE(item.balance, 0),
                COALESCE(item.balance, 0) + COUNT(*)
         FROM player_conquest_v2_reward_awards award
         JOIN json_each(award.silver_card_ids_json) selected
         LEFT JOIN player_items item
           ON item.user_id = award.user_id
          AND item.item_type = 'SW_SILVER_CARDS'
          AND item.token_id = CAST(selected.value AS INTEGER)
         WHERE award.award_key = ? AND award.delivery_key = ?
           AND award.application_status = 'PREPARING'
         GROUP BY award.id, selected.value, item.balance`
      )
      .bind(awardKey, deliveryKey),
    database
      .prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         SELECT award.user_id, 'SW_SILVER_CARDS',
                CAST(selected.value AS INTEGER), COUNT(*), 1, ?, ?, ?
         FROM player_conquest_v2_reward_awards award
         JOIN json_each(award.silver_card_ids_json) selected
         WHERE award.award_key = ? AND award.delivery_key = ?
           AND award.application_status = 'PREPARING'
         GROUP BY award.user_id, selected.value
         ON CONFLICT(user_id, item_type, token_id)
         DO UPDATE SET balance = player_items.balance + excluded.balance,
                       is_new = 1, updated_at = excluded.updated_at`
      )
      .bind(
        `conquest-v2:${cycle.id}`,
        awardedAt,
        awardedAt,
        awardKey,
        deliveryKey
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO player_conquest_v2_reward_feed_events
           (award_id, user_id, treasure_level, token_ids_json, created_at)
         SELECT id, user_id, treasure_level, ?, ?
         FROM player_conquest_v2_reward_awards
         WHERE award_key = ? AND delivery_key = ?
           AND application_status = 'PREPARING'`
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
         WHERE award_key = ? AND delivery_key = ?
           AND application_status = 'PREPARING'`
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
  statements.push(
    database
      .prepare(
        `UPDATE player_conquest_v2_reward_awards
         SET application_status = 'APPLIED', completed_at = awarded_at
         WHERE award_key = ? AND delivery_key = ?
           AND application_status = 'PREPARING'`
      )
      .bind(awardKey, deliveryKey)
  )
  await database.batch(statements)
  return Boolean(
    await database
      .prepare(
        `SELECT 1 FROM player_conquest_v2_reward_awards
         WHERE award_key = ? AND delivery_key = ?
           AND application_status = 'APPLIED'`
      )
      .bind(awardKey, deliveryKey)
      .first()
  )
}

const deliverCycle = async (
  database: D1Database,
  cycle: ConquestV2RewardCycleRow,
  now: Date
): Promise<number> => {
  const entries = await database
    .prepare(
      `SELECT entry.user_id, entry.treasure_level, entry.treasure_weight
       FROM conquest_v2_reward_entries entry
       LEFT JOIN player_conquest_v2_reward_awards award
         ON award.cycle_id = entry.cycle_id AND award.user_id = entry.user_id
        AND award.application_status = 'APPLIED'
       WHERE entry.cycle_id = ? AND award.id IS NULL
       ORDER BY entry.treasure_level DESC, entry.user_id`
    )
    .bind(cycle.id)
    .all<ConquestV2RewardEntryRow>()
  let delivered = 0
  for (const entry of entries.results) {
    if (await deliverConquestV2RewardEntry(database, cycle, entry, now)) {
      delivered++
    }
  }
  return delivered
}

export const conquestV2CycleDeliveryComplete = async (
  database: D1Database,
  cycleId: number
): Promise<boolean> => {
  const row = await database
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM conquest_v2_reward_entries
          WHERE cycle_id = ?) AS expected,
         (SELECT COUNT(*) FROM player_conquest_v2_reward_awards
          WHERE cycle_id = ? AND application_status = 'APPLIED') AS delivered`
    )
    .bind(cycleId, cycleId)
    .first<{ expected: number; delivered: number }>()
  return row?.expected === row?.delivered
}

export const beginConquestV2RewardDelivery = async (
  database: D1Database,
  cycleId: number,
  now: Date
): Promise<ConquestV2RewardCycleRow> => {
  let cycle = await conquestV2RewardCycleById(database, cycleId)
  if (!cycle) throw new Error('Conquest V2 reward cycle was not found')
  if (cycle.status === 'PREPARING') {
    throw new Error('Conquest V2 reward cycle was not snapshotted')
  }
  if (cycle.status === 'PENDING_DELIVERY') {
    if (Date.parse(cycle.delivery_at) > now.getTime()) {
      throw new Error('Conquest V2 reward delivery is not due')
    }
    await database
      .prepare(
        `UPDATE conquest_v2_reward_cycles SET status = 'DELIVERING'
         WHERE id = ? AND status = 'PENDING_DELIVERY'`
      )
      .bind(cycleId)
      .run()
    cycle = await conquestV2RewardCycleById(database, cycleId)
    if (!cycle) throw new Error('Conquest V2 reward cycle disappeared')
  }
  return cycle
}

export const completeConquestV2RewardCycle = async (
  database: D1Database,
  cycleId: number,
  now: Date
): Promise<boolean> => {
  if (!(await conquestV2CycleDeliveryComplete(database, cycleId))) return false
  const completedAt = now.toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE conquest_v2_reward_cycles
         SET status = 'COMPLETED', completed_at = ?
         WHERE id = ? AND status = 'DELIVERING'`
      )
      .bind(completedAt, cycleId),
    database
      .prepare(
        `UPDATE conquest_v2_reward_cycle_orchestrations
         SET completed_at = ?
         WHERE cycle_id = ? AND completed_at IS NULL
           AND EXISTS (
             SELECT 1 FROM conquest_v2_reward_cycles cycle
             WHERE cycle.id = ? AND cycle.status = 'COMPLETED'
               AND cycle.completed_at = ?
           )`
      )
      .bind(completedAt, cycleId, cycleId, completedAt)
  ])
  return (
    (await conquestV2RewardCycleById(database, cycleId))?.status === 'COMPLETED'
  )
}

const recordFailure = async (
  database: D1Database,
  cycle: ConquestV2RewardCycleRow,
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
  const accepted = await acceptDueConquestV2RewardCycle(database, now)
  if (accepted.status === 'disabled' || accepted.status === 'not_due') {
    return { status: accepted.status, delivered: 0 }
  }
  let cycle = accepted.cycle!
  if (accepted.status === 'already_completed') {
    return { status: 'already_completed', cycleId: cycle.id, delivered: 0 }
  }
  try {
    if (cycle.status === 'PREPARING') {
      await snapshotConquestV2RewardCycle(database, cycle, now)
      cycle = (await conquestV2RewardCycleById(database, cycle.id))!
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
    cycle = await beginConquestV2RewardDelivery(database, cycle.id, now)
    const delivered = await deliverCycle(database, cycle, now)
    await completeConquestV2RewardCycle(database, cycle.id, now)
    const completed = await conquestV2RewardCycleById(database, cycle.id)
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
