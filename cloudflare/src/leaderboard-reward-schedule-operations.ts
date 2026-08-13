import { alreadyExists, invalidArgument, notFound } from './errors'
import {
  LEADERBOARD_REWARD_POLICY_HASH,
  LEADERBOARD_REWARD_POLICY_VERSION
} from './leaderboard-reward-policy'

export const LEADERBOARD_REWARD_SCHEDULE_OPERATION_HEADER =
  'x-cloud-weasel-operation-key'

export type LeaderboardRewardScheduleOperation =
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
  starts_at: string
  reason: string
  created_at: string
  activation_status: 'DRAFT' | 'ACTIVE' | null
  policy_version: number | null
  policy_hash: string | null
  created_by_user_id: string | null
  activated_by_user_id: string | null
  proposal_reason: string | null
  review_reference: string | null
  proposal_created_at: string | null
  activated_at: string | null
  activation_reason: string | null
}

interface OperationRow {
  operation_key: string
  operation: LeaderboardRewardScheduleOperation
  schedule_version: number
  actor_user_id: string
  request_json: string
  status: 'PREPARING' | 'APPLIED'
}

export interface LeaderboardRewardScheduleView {
  version: number
  enabled: boolean
  weekdayUtc?: number
  hourUtc?: number
  minuteUtc?: number
  firstRunAt?: string
  startsAt: string
  reason: string
  createdAt: string
  policyVersion?: number
  policyHash?: string
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

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const operationKey = (value: string | null) => {
  if (!value || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument('valid leaderboard schedule operation key required')
  }
  return value.toLowerCase()
}

const scheduleVersion = (value: unknown) => {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw invalidArgument('leaderboard schedule version is invalid')
  }
  return value as number
}

const boundedText = (value: unknown, field: string) => {
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 1000) {
    throw invalidArgument(`${field} is invalid`)
  }
  return trimmed
}

const canonicalDate = (value: unknown, field: string) => {
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw invalidArgument(`${field} is invalid`)
  const canonical = new Date(timestamp).toISOString()
  if (canonical !== value) throw invalidArgument(`${field} must be canonical UTC`)
  return canonical
}

const policy = (version: unknown, hash: unknown) => {
  if (
    version !== LEADERBOARD_REWARD_POLICY_VERSION ||
    hash !== LEADERBOARD_REWARD_POLICY_HASH
  ) {
    throw invalidArgument('leaderboard reward policy confirmation is invalid')
  }
  return {
    policyVersion: LEADERBOARD_REWARD_POLICY_VERSION,
    policyHash: LEADERBOARD_REWARD_POLICY_HASH
  }
}

const present = (row: ScheduleRow): LeaderboardRewardScheduleView => ({
  version: row.version,
  enabled: row.enabled === 1,
  ...(row.weekday_utc === null ? {} : { weekdayUtc: row.weekday_utc }),
  ...(row.hour_utc === null ? {} : { hourUtc: row.hour_utc }),
  ...(row.minute_utc === null ? {} : { minuteUtc: row.minute_utc }),
  ...(row.first_run_at === null ? {} : { firstRunAt: row.first_run_at }),
  startsAt: row.starts_at,
  reason: row.reason,
  createdAt: row.created_at,
  ...(row.policy_version === null
    ? {}
    : { policyVersion: row.policy_version }),
  ...(row.policy_hash === null ? {} : { policyHash: row.policy_hash }),
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
         schedule.starts_at, schedule.reason, schedule.created_at,
         activation.status AS activation_status, activation.policy_version,
         activation.policy_hash, activation.created_by_user_id,
         activation.activated_by_user_id,
         activation.reason AS proposal_reason,
         activation.review_reference,
         activation.created_at AS proposal_created_at,
         activation.activated_at,
         (
           SELECT json_extract(operation.request_json, '$.reason')
           FROM staff_leaderboard_reward_schedule_operations operation
           WHERE operation.schedule_version = schedule.version
             AND operation.operation = 'ACTIVATE'
             AND operation.status = 'APPLIED'
         ) AS activation_reason
  FROM leaderboard_reward_schedule_versions schedule
  LEFT JOIN leaderboard_reward_schedule_activations activation
    ON activation.schedule_version = schedule.version`

export class LeaderboardRewardScheduleOperationsRepository {
  constructor(private readonly database: D1Database) {}

  private async operation(key: string): Promise<OperationRow | null> {
    return this.database
      .prepare(
        `SELECT operation_key, operation, schedule_version, actor_user_id,
                request_json, status
         FROM staff_leaderboard_reward_schedule_operations
         WHERE operation_key = ?`
      )
      .bind(key)
      .first<OperationRow>()
  }

  private async exactSchedule(
    version: number
  ): Promise<LeaderboardRewardScheduleView> {
    const row = await this.database
      .prepare(`${scheduleQuery} WHERE schedule.version = ?`)
      .bind(version)
      .first<ScheduleRow>()
    if (!row) throw notFound('leaderboard reward schedule not found')
    return present(row)
  }

  private async completedRetry(
    key: string,
    operation: LeaderboardRewardScheduleOperation,
    version: number,
    actorUserId: string,
    requestJson: string
  ): Promise<LeaderboardRewardScheduleView | null> {
    const receipt = await this.operation(key)
    if (!receipt) return null
    if (
      receipt.operation !== operation ||
      receipt.schedule_version !== version ||
      receipt.actor_user_id !== actorUserId ||
      receipt.request_json !== requestJson
    ) {
      throw alreadyExists('leaderboard schedule operation key was already used')
    }
    if (receipt.status !== 'APPLIED') {
      throw alreadyExists('leaderboard schedule operation is still preparing')
    }
    return this.exactSchedule(version)
  }

  private async apply(
    statements: D1PreparedStatement[],
    retry: () => Promise<LeaderboardRewardScheduleView | null>,
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
    if (!recovered) {
      throw new Error('leaderboard schedule operation receipt is missing')
    }
    return recovered
  }

  async list(versionValue?: unknown): Promise<LeaderboardRewardScheduleView[]> {
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
            .prepare(`${scheduleQuery} ORDER BY schedule.version DESC LIMIT 100`)
            .all<ScheduleRow>()
        ).results
    return rows.map(present)
  }

  async propose(
    actorUserId: string,
    value: {
      version?: unknown
      replacesVersion?: unknown
      startsAt?: unknown
      firstRunAt?: unknown
      policyVersion?: unknown
      policyHash?: unknown
      reason?: unknown
      reviewReference?: unknown
    },
    operationKeyValue: string | null
  ): Promise<LeaderboardRewardScheduleView> {
    const key = operationKey(operationKeyValue)
    const version = scheduleVersion(value.version)
    const replacesVersion =
      value.replacesVersion === 0 ? 0 : scheduleVersion(value.replacesVersion)
    if (version !== replacesVersion + 1) {
      throw invalidArgument('leaderboard schedule version must increment by one')
    }
    const startsAt = canonicalDate(value.startsAt, 'startsAt')
    const firstRunAt = canonicalDate(value.firstRunAt, 'firstRunAt')
    const confirmedPolicy = policy(value.policyVersion, value.policyHash)
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
    const requestJson = JSON.stringify({
      version,
      replacesVersion,
      startsAt,
      firstRunAt,
      weekdayUtc: first.getUTCDay(),
      hourUtc: first.getUTCHours(),
      minuteUtc: first.getUTCMinutes(),
      ...confirmedPolicy,
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
    const [latest] = await this.list()
    if ((latest?.version ?? 0) !== replacesVersion) {
      throw alreadyExists('leaderboard schedule base version was superseded')
    }
    const now = new Date().toISOString()
    if (startsAt <= now) {
      throw invalidArgument('startsAt must be in the future')
    }
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
      startsAt,
      reason,
      createdAt: now,
      ...confirmedPolicy,
      proposal: {
        status: 'DRAFT',
        createdByUserId: actorUserId,
        reason,
        reviewReference,
        createdAt: now
      }
    })
    const retry = () =>
      this.completedRetry(
        key,
        'PROPOSE',
        version,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `INSERT INTO leaderboard_reward_schedule_versions
               (version, enabled, weekday_utc, hour_utc, minute_utc,
                first_run_at, starts_at, reason, created_at)
             SELECT ?, 1, ?, ?, ?, ?, ?, ?, ?
             WHERE COALESCE((
               SELECT MAX(version) FROM leaderboard_reward_schedule_versions
             ), 0) = ?`
          )
          .bind(
            version,
            first.getUTCDay(),
            first.getUTCHours(),
            first.getUTCMinutes(),
            firstRunAt,
            startsAt,
            reason,
            now,
            replacesVersion
          ),
        this.database
          .prepare(
            `INSERT INTO leaderboard_reward_schedule_activations
               (schedule_version, status, policy_version, policy_hash,
                created_by_user_id, activated_by_user_id, reason,
                review_reference, created_at, activated_at)
             VALUES (?, 'DRAFT', ?, ?, ?, NULL, ?, ?, ?, NULL)`
          )
          .bind(
            version,
            confirmedPolicy.policyVersion,
            confirmedPolicy.policyHash,
            actorUserId,
            reason,
            reviewReference,
            now
          ),
        this.database
          .prepare(
            `INSERT INTO staff_leaderboard_reward_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'PROPOSE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_leaderboard_reward_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_leaderboard_reward_schedule_audit
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
          throw alreadyExists('leaderboard schedule base version was superseded')
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
      reviewReference?: unknown
      reason?: unknown
    },
    operationKeyValue: string | null
  ): Promise<LeaderboardRewardScheduleView> {
    const key = operationKey(operationKeyValue)
    const version = scheduleVersion(value.version)
    const confirmedPolicy = policy(value.policyVersion, value.policyHash)
    const reviewReference = boundedText(
      value.reviewReference,
      'reviewReference'
    )
    const reason = boundedText(value.reason, 'reason')
    const requestJson = JSON.stringify({
      version,
      ...confirmedPolicy,
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
      throw invalidArgument(
        'independent draft leaderboard schedule approval required'
      )
    }
    if (
      before.policyVersion !== confirmedPolicy.policyVersion ||
      before.policyHash !== confirmedPolicy.policyHash ||
      before.proposal.reviewReference !== reviewReference
    ) {
      throw invalidArgument('leaderboard policy confirmation does not match')
    }
    const now = new Date().toISOString()
    if (!before.firstRunAt || now > before.startsAt) {
      throw invalidArgument('leaderboard schedule activation is too late')
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
      this.completedRetry(
        key,
        'ACTIVATE',
        version,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `UPDATE leaderboard_reward_schedule_activations
             SET status = 'ACTIVE', activated_by_user_id = ?, activated_at = ?
             WHERE schedule_version = ? AND status = 'DRAFT'
               AND created_by_user_id <> ? AND policy_version = ?
               AND policy_hash = ? AND review_reference = ?`
          )
          .bind(
            actorUserId,
            now,
            version,
            actorUserId,
            confirmedPolicy.policyVersion,
            confirmedPolicy.policyHash,
            reviewReference
          ),
        this.database
          .prepare(
            `INSERT INTO staff_leaderboard_reward_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_leaderboard_reward_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_leaderboard_reward_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, ?, ?)`
          )
          .bind(
            key,
            version,
            actorUserId,
            JSON.stringify(before),
            after,
            now
          )
      ],
      retry,
      async () => {
        const current = await this.exactSchedule(version)
        const [latestSchedule] = await this.list()
        if (latestSchedule?.version !== version) {
          throw alreadyExists('leaderboard schedule version was superseded')
        }
        if (current.proposal?.status !== 'DRAFT') {
          throw alreadyExists('leaderboard schedule activation was already decided')
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
  ): Promise<LeaderboardRewardScheduleView> {
    const key = operationKey(operationKeyValue)
    const version = scheduleVersion(value.version)
    const replacesVersion = scheduleVersion(value.replacesVersion)
    if (version !== replacesVersion + 1) {
      throw invalidArgument('leaderboard schedule version must increment by one')
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
      throw invalidArgument('newer enabled leaderboard schedule required')
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
      this.completedRetry(
        key,
        'DISABLE',
        version,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `INSERT INTO leaderboard_reward_schedule_versions
               (version, enabled, weekday_utc, hour_utc, minute_utc,
                first_run_at, starts_at, reason, created_at)
             SELECT ?, 0, NULL, NULL, NULL, NULL, ?, ?, ?
             WHERE EXISTS (
               SELECT 1 FROM leaderboard_reward_schedule_versions latest
               WHERE latest.version = (
                 SELECT MAX(version) FROM leaderboard_reward_schedule_versions
               )
                 AND latest.enabled = 1 AND latest.version = ?
             )`
          )
          .bind(version, now, reason, now, replacesVersion),
        this.database
          .prepare(
            `INSERT INTO staff_leaderboard_reward_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'DISABLE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_leaderboard_reward_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_leaderboard_reward_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'DISABLE', ?, ?, ?, ?, ?)`
          )
          .bind(
            key,
            version,
            actorUserId,
            JSON.stringify(before),
            after,
            now
          )
      ],
      retry,
      async () => {
        const [current] = await this.list()
        if (!current?.enabled) {
          throw alreadyExists('leaderboard schedule was already disabled')
        }
        if (current.version !== replacesVersion) {
          throw alreadyExists('leaderboard schedule version was superseded')
        }
      }
    )
  }
}
