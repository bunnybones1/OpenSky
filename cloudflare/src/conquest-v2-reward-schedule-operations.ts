import { alreadyExists, invalidArgument, notFound } from './errors'
import {
  CONQUEST_V2_REWARD_POLICY_HASH,
  CONQUEST_V2_REWARD_POLICY_VERSION,
  conquestV2SilverCardCount
} from './conquest-v2-reward-policy'

export const CONQUEST_V2_REWARD_SCHEDULE_OPERATION_HEADER =
  'x-cloud-weasel-operation-key'

export type ConquestV2RewardScheduleOperation =
  | 'PROPOSE'
  | 'ACTIVATE'
  | 'DISABLE'

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
  reason: string
  created_at: string
  activation_status: 'DRAFT' | 'ACTIVE' | null
  policy_version: number | null
  policy_hash: string | null
  settings_version: number | null
  settings_mutation_id: string | null
  weight_per_silver_card: number | null
  silver_counts_json: string | null
  created_by_user_id: string | null
  activated_by_user_id: string | null
  proposal_reason: string | null
  review_reference: string | null
  proposal_created_at: string | null
  activated_at: string | null
  activation_reason: string | null
}

interface SettingsRow {
  version: number
  mutation_id: string
  weight_per_silver_card: number
}

interface OperationRow {
  operation_key: string
  operation: ConquestV2RewardScheduleOperation
  schedule_version: number
  actor_user_id: string
  request_json: string
  status: 'PREPARING' | 'APPLIED'
}

export interface ConquestV2RewardScheduleView {
  version: number
  enabled: boolean
  weekdayUtc?: number
  hourUtc?: number
  minuteUtc?: number
  firstRunAt?: string
  firstSeason?: number
  firstWeek?: number
  deliveryDelaySeconds?: number
  rewardCardSets?: string[]
  startsAt: string
  reason: string
  createdAt: string
  policyVersion?: number
  policyHash?: string
  settingsVersion?: number
  settingsMutationId?: string
  weightPerSilverCard?: number
  silverCounts?: number[]
  proposal: null | {
    status: 'DRAFT' | 'ACTIVE'
    createdByUserId: string
    activatedByUserId?: string
    reason: string
    activationReason?: string
    reviewReference: string
    createdAt: string
    activatedAt?: string
  }
}

export interface ConquestV2RewardScheduleReviewInputs {
  policyVersion: number
  policyHash: string
  settingsVersion: number
  settingsMutationId: string
  weightPerSilverCard: number
  silverCounts: number[]
  safeToPropose: boolean
  cardSets: Array<{ name: string; validFromSeason: number }>
}

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const operationKey = (value: string | null) => {
  if (!value || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument('valid Conquest V2 schedule operation key required')
  }
  return value.toLowerCase()
}

const integer = (
  value: unknown,
  field: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  ) {
    throw invalidArgument(`${field} is invalid`)
  }
  return value as number
}

const scheduleVersion = (value: unknown) =>
  integer(value, 'Conquest V2 schedule version', 1)

const boundedText = (value: unknown, field: string, maximum = 1000) => {
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maximum) {
    throw invalidArgument(`${field} is invalid`)
  }
  return trimmed
}

const canonicalDate = (value: unknown, field: string) => {
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw invalidArgument(`${field} is invalid`)
  const canonical = new Date(timestamp).toISOString()
  if (canonical !== value)
    throw invalidArgument(`${field} must be canonical UTC`)
  return canonical
}

const policy = (version: unknown, hash: unknown) => {
  if (
    version !== CONQUEST_V2_REWARD_POLICY_VERSION ||
    hash !== CONQUEST_V2_REWARD_POLICY_HASH
  ) {
    throw invalidArgument('Conquest V2 reward policy confirmation is invalid')
  }
  return {
    policyVersion: CONQUEST_V2_REWARD_POLICY_VERSION,
    policyHash: CONQUEST_V2_REWARD_POLICY_HASH
  }
}

const cardSets = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw invalidArgument('rewardCardSets is invalid')
  }
  const parsed = value.map(item => boundedText(item, 'rewardCardSets', 100))
  if (new Set(parsed).size !== parsed.length) {
    throw invalidArgument('rewardCardSets must be unique')
  }
  return parsed
}

const weight = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw invalidArgument('weightPerSilverCard is invalid')
  }
  return value
}

const silverCounts = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    value.length !== 11 ||
    value.some(item => !Number.isSafeInteger(item) || item < 0)
  ) {
    throw invalidArgument('silverCounts is invalid')
  }
  return value as number[]
}

const parsedArray = <T>(value: string | null): T[] | undefined =>
  value === null ? undefined : (JSON.parse(value) as T[])

const present = (row: ScheduleRow): ConquestV2RewardScheduleView => ({
  version: row.version,
  enabled: row.enabled === 1,
  ...(row.weekday_utc === null ? {} : { weekdayUtc: row.weekday_utc }),
  ...(row.hour_utc === null ? {} : { hourUtc: row.hour_utc }),
  ...(row.minute_utc === null ? {} : { minuteUtc: row.minute_utc }),
  ...(row.first_run_at === null ? {} : { firstRunAt: row.first_run_at }),
  ...(row.first_season === null ? {} : { firstSeason: row.first_season }),
  ...(row.first_week === null ? {} : { firstWeek: row.first_week }),
  ...(row.delivery_delay_seconds === null
    ? {}
    : { deliveryDelaySeconds: row.delivery_delay_seconds }),
  ...(row.reward_card_sets_json === null
    ? {}
    : { rewardCardSets: parsedArray<string>(row.reward_card_sets_json) }),
  startsAt: row.starts_at,
  reason: row.reason,
  createdAt: row.created_at,
  ...(row.policy_version === null ? {} : { policyVersion: row.policy_version }),
  ...(row.policy_hash === null ? {} : { policyHash: row.policy_hash }),
  ...(row.settings_version === null
    ? {}
    : { settingsVersion: row.settings_version }),
  ...(row.settings_mutation_id === null
    ? {}
    : { settingsMutationId: row.settings_mutation_id }),
  ...(row.weight_per_silver_card === null
    ? {}
    : { weightPerSilverCard: row.weight_per_silver_card }),
  ...(row.silver_counts_json === null
    ? {}
    : { silverCounts: parsedArray<number>(row.silver_counts_json) }),
  proposal:
    row.activation_status &&
    row.created_by_user_id &&
    row.proposal_reason &&
    row.review_reference
      ? {
          status: row.activation_status,
          createdByUserId: row.created_by_user_id,
          ...(row.activated_by_user_id
            ? { activatedByUserId: row.activated_by_user_id }
            : {}),
          reason: row.proposal_reason,
          ...(row.activation_reason
            ? { activationReason: row.activation_reason }
            : {}),
          reviewReference: row.review_reference,
          createdAt: row.proposal_created_at ?? row.created_at,
          ...(row.activated_at ? { activatedAt: row.activated_at } : {})
        }
      : null
})

const scheduleQuery = `
  SELECT schedule.version, schedule.enabled, schedule.weekday_utc,
         schedule.hour_utc, schedule.minute_utc, schedule.first_run_at,
         schedule.first_season, schedule.first_week,
         schedule.delivery_delay_seconds, schedule.reward_card_sets_json,
         schedule.starts_at, schedule.reason, schedule.created_at,
         activation.status AS activation_status, activation.policy_version,
         activation.policy_hash, activation.settings_version,
         activation.settings_mutation_id, activation.weight_per_silver_card,
         activation.silver_counts_json, activation.created_by_user_id,
         activation.activated_by_user_id,
         activation.reason AS proposal_reason,
         activation.review_reference,
         activation.created_at AS proposal_created_at,
         activation.activated_at,
         (
           SELECT json_extract(operation.request_json, '$.reason')
           FROM staff_conquest_v2_reward_schedule_operations operation
           WHERE operation.schedule_version = schedule.version
             AND operation.operation = 'ACTIVATE'
             AND operation.status = 'APPLIED'
         ) AS activation_reason
  FROM conquest_v2_reward_schedule_versions schedule
  LEFT JOIN conquest_v2_reward_schedule_activations activation
    ON activation.schedule_version = schedule.version`

export class ConquestV2RewardScheduleOperationsRepository {
  constructor(private readonly database: D1Database) {}

  private async settings(): Promise<SettingsRow> {
    const row = await this.database
      .prepare(
        `SELECT version, mutation_id, weight_per_silver_card
         FROM conquest_v2_pool_settings WHERE singleton = 1`
      )
      .first<SettingsRow>()
    if (!row) throw new Error('Conquest V2 pool settings are missing')
    return row
  }

  private async operation(key: string): Promise<OperationRow | null> {
    return this.database
      .prepare(
        `SELECT operation_key, operation, schedule_version, actor_user_id,
                request_json, status
         FROM staff_conquest_v2_reward_schedule_operations
         WHERE operation_key = ?`
      )
      .bind(key)
      .first<OperationRow>()
  }

  private async exactSchedule(
    version: number
  ): Promise<ConquestV2RewardScheduleView> {
    const row = await this.database
      .prepare(`${scheduleQuery} WHERE schedule.version = ?`)
      .bind(version)
      .first<ScheduleRow>()
    if (!row) throw notFound('Conquest V2 reward schedule not found')
    return present(row)
  }

  private async completedRetry(
    key: string,
    operation: ConquestV2RewardScheduleOperation,
    version: number,
    actorUserId: string,
    requestJson: string
  ): Promise<ConquestV2RewardScheduleView | null> {
    const receipt = await this.operation(key)
    if (!receipt) return null
    if (
      receipt.operation !== operation ||
      receipt.schedule_version !== version ||
      receipt.actor_user_id !== actorUserId ||
      receipt.request_json !== requestJson
    ) {
      throw alreadyExists('Conquest V2 schedule operation key was already used')
    }
    if (receipt.status !== 'APPLIED') {
      throw alreadyExists('Conquest V2 schedule operation is still preparing')
    }
    return this.exactSchedule(version)
  }

  private async apply(
    statements: D1PreparedStatement[],
    retry: () => Promise<ConquestV2RewardScheduleView | null>,
    conflict: () => Promise<void>
  ) {
    try {
      await this.database.batch(statements)
    } catch (error) {
      const recovered = await retry()
      if (recovered) return recovered
      await conflict()
      throw error
    }
    const recovered = await retry()
    if (!recovered) throw new Error('Conquest V2 schedule receipt is missing')
    return recovered
  }

  async list(versionValue?: unknown): Promise<ConquestV2RewardScheduleView[]> {
    const filter =
      versionValue === undefined ? undefined : scheduleVersion(versionValue)
    const rows = filter
      ? [
          await this.database
            .prepare(`${scheduleQuery} WHERE schedule.version = ?`)
            .bind(filter)
            .first<ScheduleRow>()
        ].filter((row): row is ScheduleRow => row !== null)
      : (
          await this.database
            .prepare(
              `${scheduleQuery} ORDER BY schedule.version DESC LIMIT 100`
            )
            .all<ScheduleRow>()
        ).results
    return rows.map(present)
  }

  async reviewInputs(): Promise<ConquestV2RewardScheduleReviewInputs> {
    const settings = await this.settings()
    const counts = Array.from({ length: 11 }, (_, level) =>
      conquestV2SilverCardCount(settings.weight_per_silver_card, level)
    )
    const countsAreSafe = counts.every(Number.isSafeInteger)
    const ranges = (
      await this.database
        .prepare(
          `SELECT card_set, MIN(valid_from_season) valid_from_season
           FROM conquest_v2_reward_policy_cards
           WHERE policy_version = ? AND policy_hash = ?
           GROUP BY card_set ORDER BY card_set`
        )
        .bind(CONQUEST_V2_REWARD_POLICY_VERSION, CONQUEST_V2_REWARD_POLICY_HASH)
        .all<{ card_set: string; valid_from_season: number }>()
    ).results
    return {
      policyVersion: CONQUEST_V2_REWARD_POLICY_VERSION,
      policyHash: CONQUEST_V2_REWARD_POLICY_HASH,
      settingsVersion: settings.version,
      settingsMutationId: settings.mutation_id,
      weightPerSilverCard: settings.weight_per_silver_card,
      silverCounts: countsAreSafe
        ? counts
        : Array.from({ length: 11 }, () => 0),
      safeToPropose:
        settings.weight_per_silver_card > 0 &&
        countsAreSafe &&
        counts[0] === 0 &&
        counts.slice(1).every(count => count >= 1),
      cardSets: ranges.map(row => ({
        name: row.card_set,
        validFromSeason: row.valid_from_season
      }))
    }
  }

  async propose(
    actorUserId: string,
    value: {
      version?: unknown
      replacesVersion?: unknown
      startsAt?: unknown
      firstRunAt?: unknown
      firstSeason?: unknown
      firstWeek?: unknown
      deliveryDelaySeconds?: unknown
      rewardCardSets?: unknown
      policyVersion?: unknown
      policyHash?: unknown
      settingsVersion?: unknown
      settingsMutationId?: unknown
      weightPerSilverCard?: unknown
      silverCounts?: unknown
      reason?: unknown
      reviewReference?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ConquestV2RewardScheduleView> {
    const key = operationKey(operationKeyValue)
    const version = scheduleVersion(value.version)
    const replacesVersion =
      value.replacesVersion === 0 ? 0 : scheduleVersion(value.replacesVersion)
    if (version !== replacesVersion + 1) {
      throw invalidArgument(
        'Conquest V2 schedule version must increment by one'
      )
    }
    const startsAt = canonicalDate(value.startsAt, 'startsAt')
    const firstRunAt = canonicalDate(value.firstRunAt, 'firstRunAt')
    const firstSeason = integer(value.firstSeason, 'firstSeason', 1)
    const firstWeek = integer(value.firstWeek, 'firstWeek', 1, 4)
    const deliveryDelaySeconds = integer(
      value.deliveryDelaySeconds,
      'deliveryDelaySeconds',
      0,
      2_147_483_647
    )
    const rewardCardSets = cardSets(value.rewardCardSets)
    const confirmedPolicy = policy(value.policyVersion, value.policyHash)
    const settingsVersion = integer(value.settingsVersion, 'settingsVersion', 0)
    const settingsMutationId = boundedText(
      value.settingsMutationId,
      'settingsMutationId'
    )
    const weightPerSilverCard = weight(value.weightPerSilverCard)
    const confirmedSilverCounts = silverCounts(value.silverCounts)
    const reason = boundedText(value.reason, 'reason')
    const reviewReference = boundedText(
      value.reviewReference,
      'reviewReference'
    )
    const first = new Date(firstRunAt)
    if (
      firstRunAt < startsAt ||
      first.getUTCSeconds() !== 0 ||
      first.getUTCMilliseconds() !== 0
    ) {
      throw invalidArgument(
        'firstRunAt must be a minute boundary on or after startsAt'
      )
    }
    const expectedSilverCounts = Array.from({ length: 11 }, (_, level) =>
      conquestV2SilverCardCount(weightPerSilverCard, level)
    )
    if (
      expectedSilverCounts[0] !== 0 ||
      expectedSilverCounts.slice(1).some(count => count < 1) ||
      JSON.stringify(expectedSilverCounts) !==
        JSON.stringify(confirmedSilverCounts)
    ) {
      throw invalidArgument(
        'Conquest V2 Silver quantity confirmation is unsafe'
      )
    }
    const rewardCardSetsJson = JSON.stringify(rewardCardSets)
    const silverCountsJson = JSON.stringify(expectedSilverCounts)
    const requestJson = JSON.stringify({
      version,
      replacesVersion,
      startsAt,
      firstRunAt,
      weekdayUtc: first.getUTCDay(),
      hourUtc: first.getUTCHours(),
      minuteUtc: first.getUTCMinutes(),
      firstSeason,
      firstWeek,
      deliveryDelaySeconds,
      rewardCardSetsJson,
      ...confirmedPolicy,
      settingsVersion,
      settingsMutationId,
      weightPerSilverCard,
      silverCountsJson,
      reason,
      reviewReference
    })
    const existing = await this.completedRetry(
      key,
      'PROPOSE',
      version,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const settings = await this.settings()
    if (
      settings.version !== settingsVersion ||
      settings.mutation_id !== settingsMutationId ||
      settings.weight_per_silver_card !== weightPerSilverCard
    ) {
      throw invalidArgument('Conquest V2 settings confirmation does not match')
    }
    const availableSets = new Set(
      (
        await this.database
          .prepare(
            `SELECT DISTINCT card_set
             FROM conquest_v2_reward_policy_cards
             WHERE policy_version = ? AND policy_hash = ?`
          )
          .bind(confirmedPolicy.policyVersion, confirmedPolicy.policyHash)
          .all<{ card_set: string }>()
      ).results.map(row => row.card_set)
    )
    if (rewardCardSets.some(cardSet => !availableSets.has(cardSet))) {
      throw invalidArgument('rewardCardSets is not recognized by policy')
    }
    const [latest] = await this.list()
    if ((latest?.version ?? 0) !== replacesVersion) {
      throw alreadyExists('Conquest V2 schedule base version was superseded')
    }
    const now = new Date().toISOString()
    if (startsAt <= now) throw invalidArgument('startsAt must be in the future')
    if (firstRunAt <= now) {
      throw invalidArgument('firstRunAt must be in the future')
    }
    const after = JSON.stringify({
      version,
      enabled: true,
      weekdayUtc: first.getUTCDay(),
      hourUtc: first.getUTCHours(),
      minuteUtc: first.getUTCMinutes(),
      firstRunAt,
      firstSeason,
      firstWeek,
      deliveryDelaySeconds,
      rewardCardSets,
      startsAt,
      reason,
      createdAt: now,
      ...confirmedPolicy,
      settingsVersion,
      settingsMutationId,
      weightPerSilverCard,
      silverCounts: expectedSilverCounts,
      proposal: {
        status: 'DRAFT',
        createdByUserId: actorUserId,
        reason,
        reviewReference,
        createdAt: now
      }
    })
    const retry = () =>
      this.completedRetry(key, 'PROPOSE', version, actorUserId, requestJson)
    return this.apply(
      [
        this.database
          .prepare(
            `INSERT INTO conquest_v2_reward_schedule_versions
               (version, enabled, weekday_utc, hour_utc, minute_utc,
                first_run_at, first_season, first_week,
                delivery_delay_seconds, reward_card_sets_json, starts_at,
                reason, created_at)
             SELECT ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
             WHERE ? = COALESCE((
               SELECT MAX(version) FROM conquest_v2_reward_schedule_versions
             ), 0)`
          )
          .bind(
            version,
            first.getUTCDay(),
            first.getUTCHours(),
            first.getUTCMinutes(),
            firstRunAt,
            firstSeason,
            firstWeek,
            deliveryDelaySeconds,
            rewardCardSetsJson,
            startsAt,
            reason,
            now,
            replacesVersion
          ),
        this.database
          .prepare(
            `INSERT INTO conquest_v2_reward_schedule_activations
               (schedule_version, status, policy_version, policy_hash,
                settings_version, settings_mutation_id,
                weight_per_silver_card, silver_counts_json,
                created_by_user_id, activated_by_user_id, reason,
                review_reference, created_at, activated_at)
             SELECT ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL
             FROM conquest_v2_reward_schedule_versions
             WHERE version = ?`
          )
          .bind(
            version,
            confirmedPolicy.policyVersion,
            confirmedPolicy.policyHash,
            settingsVersion,
            settingsMutationId,
            weightPerSilverCard,
            silverCountsJson,
            actorUserId,
            reason,
            reviewReference,
            now,
            version
          ),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_v2_reward_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'PROPOSE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_conquest_v2_reward_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_v2_reward_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'PROPOSE', ?, ?, NULL, ?, ?)`
          )
          .bind(key, version, actorUserId, after, now)
      ],
      retry,
      async () => {
        const [current] = await this.list()
        if ((current?.version ?? 0) !== replacesVersion) {
          throw alreadyExists('Conquest V2 schedule version was superseded')
        }
      }
    )
  }

  async activate(
    actorUserId: string,
    value: {
      version?: unknown
      policyVersion?: unknown
      policyHash?: unknown
      settingsVersion?: unknown
      settingsMutationId?: unknown
      weightPerSilverCard?: unknown
      silverCounts?: unknown
      reviewReference?: unknown
      reason?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ConquestV2RewardScheduleView> {
    const key = operationKey(operationKeyValue)
    const version = scheduleVersion(value.version)
    const confirmedPolicy = policy(value.policyVersion, value.policyHash)
    const settingsVersion = integer(value.settingsVersion, 'settingsVersion', 0)
    const settingsMutationId = boundedText(
      value.settingsMutationId,
      'settingsMutationId'
    )
    const weightPerSilverCard = weight(value.weightPerSilverCard)
    const confirmedSilverCounts = silverCounts(value.silverCounts)
    const reviewReference = boundedText(
      value.reviewReference,
      'reviewReference'
    )
    const reason = boundedText(value.reason, 'reason')
    const silverCountsJson = JSON.stringify(confirmedSilverCounts)
    const requestJson = JSON.stringify({
      version,
      ...confirmedPolicy,
      settingsVersion,
      settingsMutationId,
      weightPerSilverCard,
      silverCountsJson,
      reviewReference,
      reason
    })
    const existing = await this.completedRetry(
      key,
      'ACTIVATE',
      version,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const before = await this.exactSchedule(version)
    const [latest] = await this.list()
    if (
      latest?.version !== version ||
      !before.enabled ||
      before.proposal?.status !== 'DRAFT' ||
      before.proposal.createdByUserId === actorUserId
    ) {
      throw invalidArgument('independent draft Conquest V2 approval required')
    }
    if (
      before.policyVersion !== confirmedPolicy.policyVersion ||
      before.policyHash !== confirmedPolicy.policyHash ||
      before.settingsVersion !== settingsVersion ||
      before.settingsMutationId !== settingsMutationId ||
      before.weightPerSilverCard !== weightPerSilverCard ||
      JSON.stringify(before.silverCounts) !== silverCountsJson ||
      before.proposal.reviewReference !== reviewReference
    ) {
      throw invalidArgument('Conquest V2 policy confirmation does not match')
    }
    const settings = await this.settings()
    if (
      settings.version !== settingsVersion ||
      settings.mutation_id !== settingsMutationId ||
      settings.weight_per_silver_card !== weightPerSilverCard
    ) {
      throw invalidArgument('Conquest V2 settings changed after proposal')
    }
    const now = new Date().toISOString()
    if (!before.firstRunAt || now > before.startsAt) {
      throw invalidArgument('Conquest V2 schedule activation is too late')
    }
    const after = JSON.stringify({
      ...before,
      proposal: {
        ...before.proposal,
        status: 'ACTIVE',
        activatedByUserId: actorUserId,
        activationReason: reason,
        activatedAt: now
      }
    })
    const retry = () =>
      this.completedRetry(key, 'ACTIVATE', version, actorUserId, requestJson)
    return this.apply(
      [
        this.database
          .prepare(
            `UPDATE conquest_v2_reward_schedule_activations
             SET status = 'ACTIVE', activated_by_user_id = ?, activated_at = ?
             WHERE schedule_version = ? AND status = 'DRAFT'
               AND created_by_user_id <> ? AND policy_version = ?
               AND policy_hash = ? AND settings_version = ?
               AND settings_mutation_id = ? AND weight_per_silver_card = ?
               AND silver_counts_json = ? AND review_reference = ?`
          )
          .bind(
            actorUserId,
            now,
            version,
            actorUserId,
            confirmedPolicy.policyVersion,
            confirmedPolicy.policyHash,
            settingsVersion,
            settingsMutationId,
            weightPerSilverCard,
            silverCountsJson,
            reviewReference
          ),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_v2_reward_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_conquest_v2_reward_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_v2_reward_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, ?, ?)`
          )
          .bind(key, version, actorUserId, JSON.stringify(before), after, now)
      ],
      retry,
      async () => {
        const current = await this.exactSchedule(version)
        const [latestSchedule] = await this.list()
        if (latestSchedule?.version !== version) {
          throw alreadyExists('Conquest V2 schedule version was superseded')
        }
        if (current.proposal?.status !== 'DRAFT') {
          throw alreadyExists(
            'Conquest V2 schedule activation was already decided'
          )
        }
      }
    )
  }

  async disable(
    actorUserId: string,
    value: {
      version?: unknown
      replacesVersion?: unknown
      reason?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ConquestV2RewardScheduleView> {
    const key = operationKey(operationKeyValue)
    const version = scheduleVersion(value.version)
    const replacesVersion = scheduleVersion(value.replacesVersion)
    if (version !== replacesVersion + 1) {
      throw invalidArgument(
        'Conquest V2 schedule version must increment by one'
      )
    }
    const reason = boundedText(value.reason, 'reason')
    const requestJson = JSON.stringify({ version, replacesVersion, reason })
    const existing = await this.completedRetry(
      key,
      'DISABLE',
      version,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const [before] = await this.list()
    if (!before?.enabled || before.version !== replacesVersion) {
      throw invalidArgument('newer enabled Conquest V2 schedule required')
    }
    const now = new Date().toISOString()
    const after = JSON.stringify({
      version,
      enabled: false,
      startsAt: now,
      reason,
      createdAt: now,
      proposal: null
    })
    const retry = () =>
      this.completedRetry(key, 'DISABLE', version, actorUserId, requestJson)
    return this.apply(
      [
        this.database
          .prepare(
            `INSERT INTO conquest_v2_reward_schedule_versions
               (version, enabled, weekday_utc, hour_utc, minute_utc,
                first_run_at, first_season, first_week,
                delivery_delay_seconds, reward_card_sets_json, starts_at,
                reason, created_at)
             SELECT ?, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                    ?, ?, ?
             WHERE EXISTS (
               SELECT 1 FROM conquest_v2_reward_schedule_versions latest
               WHERE latest.version = (
                 SELECT MAX(version)
                 FROM conquest_v2_reward_schedule_versions
               )
                 AND latest.enabled = 1 AND latest.version = ?
             )`
          )
          .bind(version, now, reason, now, replacesVersion),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_v2_reward_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'DISABLE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_conquest_v2_reward_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_v2_reward_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'DISABLE', ?, ?, ?, ?, ?)`
          )
          .bind(key, version, actorUserId, JSON.stringify(before), after, now)
      ],
      retry,
      async () => {
        const [current] = await this.list()
        if (!current?.enabled) {
          throw alreadyExists('Conquest V2 schedule was already disabled')
        }
        if (current.version !== replacesVersion) {
          throw alreadyExists('Conquest V2 schedule version was superseded')
        }
      }
    )
  }
}
