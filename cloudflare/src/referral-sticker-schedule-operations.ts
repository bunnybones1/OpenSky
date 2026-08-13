import { alreadyExists, invalidArgument, notFound } from './errors'
import { seasonFromDate } from './legacy-seasons'

export const REFERRAL_STICKER_SCHEDULE_OPERATION_HEADER =
  'x-cloud-weasel-operation-key'

export type ReferralStickerScheduleOperation = 'PROPOSE' | 'ACTIVATE'

export interface ReferralStickerScheduleEntry {
  tokenId: number
  requiredPoints: number
}

export interface ReferralStickerScheduleView {
  version: number
  season: number
  status: 'DRAFT' | 'ACTIVE'
  entries: ReferralStickerScheduleEntry[]
  createdByUserId: string
  activatedByUserId?: string
  reason: string
  activationReason?: string
  reviewReference: string
  createdAt: string
  activatedAt?: string
}

interface ScheduleRow {
  version: number
  season: number
  status: 'DRAFT' | 'ACTIVE'
  entries_json: string
  created_by_user_id: string
  activated_by_user_id: string | null
  reason: string
  activation_reason: string | null
  review_reference: string
  created_at: string
  activated_at: string | null
}

interface OperationRow {
  operation_key: string
  operation: ReferralStickerScheduleOperation
  schedule_version: number
  actor_user_id: string
  request_json: string
  status: 'PREPARING' | 'APPLIED'
}

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const operationKey = (value: string | null) => {
  if (!value || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument(
      'valid referral sticker schedule operation key required'
    )
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

const version = (value: unknown) =>
  integer(value, 'referral sticker schedule version', 1)

const boundedText = (value: unknown, field: string, maximum = 1000) => {
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maximum) {
    throw invalidArgument(`${field} is invalid`)
  }
  return trimmed
}

const manifest = (value: unknown): ReferralStickerScheduleEntry[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw invalidArgument('referral sticker entries are invalid')
  }
  const entries = value.map(item => {
    if (!item || typeof item !== 'object') {
      throw invalidArgument('referral sticker entry is invalid')
    }
    const row = item as { tokenId?: unknown; requiredPoints?: unknown }
    return {
      tokenId: integer(row.tokenId, 'sticker tokenId', 0),
      requiredPoints: integer(row.requiredPoints, 'sticker requiredPoints', 0)
    }
  })
  if (new Set(entries.map(entry => entry.tokenId)).size !== entries.length) {
    throw invalidArgument('referral sticker tokenIds must be unique')
  }
  return entries.sort(
    (left, right) =>
      left.requiredPoints - right.requiredPoints || left.tokenId - right.tokenId
  )
}

const present = (row: ScheduleRow): ReferralStickerScheduleView => ({
  version: row.version,
  season: row.season,
  status: row.status,
  entries: JSON.parse(row.entries_json) as ReferralStickerScheduleEntry[],
  createdByUserId: row.created_by_user_id,
  ...(row.activated_by_user_id
    ? { activatedByUserId: row.activated_by_user_id }
    : {}),
  reason: row.reason,
  ...(row.activation_reason ? { activationReason: row.activation_reason } : {}),
  reviewReference: row.review_reference,
  createdAt: row.created_at,
  ...(row.activated_at ? { activatedAt: row.activated_at } : {})
})

const scheduleQuery = `
  SELECT schedule.version, schedule.season, schedule.status,
         schedule.created_by_user_id, schedule.activated_by_user_id,
         schedule.reason, schedule.review_reference, schedule.created_at,
         schedule.activated_at,
         COALESCE((
           SELECT json_group_array(json_object(
             'tokenId', ordered.token_id,
             'requiredPoints', ordered.required_points
           ))
           FROM (
             SELECT entry.token_id, entry.required_points
             FROM referral_sticker_schedule_entries entry
             WHERE entry.schedule_version = schedule.version
             ORDER BY entry.required_points, entry.token_id
           ) ordered
         ), '[]') AS entries_json,
         (
           SELECT json_extract(operation.request_json, '$.reason')
           FROM staff_referral_sticker_schedule_operations operation
           WHERE operation.schedule_version = schedule.version
             AND operation.operation = 'ACTIVATE'
             AND operation.status = 'APPLIED'
         ) AS activation_reason
  FROM referral_sticker_schedule_versions schedule`

export class ReferralStickerScheduleOperationsRepository {
  constructor(private readonly database: D1Database) {}

  private async operation(key: string): Promise<OperationRow | null> {
    return this.database
      .prepare(
        `SELECT operation_key, operation, schedule_version, actor_user_id,
                request_json, status
         FROM staff_referral_sticker_schedule_operations
         WHERE operation_key = ?`
      )
      .bind(key)
      .first<OperationRow>()
  }

  private async exactSchedule(
    scheduleVersion: number
  ): Promise<ReferralStickerScheduleView> {
    const row = await this.database
      .prepare(`${scheduleQuery} WHERE schedule.version = ?`)
      .bind(scheduleVersion)
      .first<ScheduleRow>()
    if (!row) throw notFound('referral sticker schedule not found')
    return present(row)
  }

  private async completedRetry(
    key: string,
    operation: ReferralStickerScheduleOperation,
    scheduleVersion: number,
    actorUserId: string,
    requestJson: string
  ): Promise<ReferralStickerScheduleView | null> {
    const receipt = await this.operation(key)
    if (!receipt) return null
    if (
      receipt.operation !== operation ||
      receipt.schedule_version !== scheduleVersion ||
      receipt.actor_user_id !== actorUserId ||
      receipt.request_json !== requestJson
    ) {
      throw alreadyExists('referral sticker operation key was already used')
    }
    if (receipt.status !== 'APPLIED') {
      throw alreadyExists('referral sticker operation is still preparing')
    }
    return this.exactSchedule(scheduleVersion)
  }

  private async apply(
    statements: D1PreparedStatement[],
    retry: () => Promise<ReferralStickerScheduleView | null>,
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
    if (!recovered)
      throw new Error('referral sticker operation receipt is missing')
    return recovered
  }

  async list(versionValue?: unknown): Promise<ReferralStickerScheduleView[]> {
    const filter =
      versionValue === undefined ? undefined : version(versionValue)
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

  async propose(
    actorUserId: string,
    value: {
      version?: unknown
      replacesVersion?: unknown
      season?: unknown
      entries?: unknown
      reason?: unknown
      reviewReference?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ReferralStickerScheduleView> {
    const key = operationKey(operationKeyValue)
    const scheduleVersion = version(value.version)
    const replacesVersion =
      value.replacesVersion === 0 ? 0 : version(value.replacesVersion)
    if (scheduleVersion !== replacesVersion + 1) {
      throw invalidArgument(
        'referral sticker schedule version must increment by one'
      )
    }
    const now = new Date().toISOString()
    const season = integer(value.season, 'referral sticker season', 1)
    if (season !== seasonFromDate(new Date(now))) {
      throw invalidArgument(
        'referral sticker proposal must target current season'
      )
    }
    const entries = manifest(value.entries)
    const reason = boundedText(value.reason, 'reason')
    const reviewReference = boundedText(
      value.reviewReference,
      'reviewReference'
    )
    const requestJson = JSON.stringify({
      version: scheduleVersion,
      replacesVersion,
      season,
      entries,
      reason,
      reviewReference
    })
    const existing = await this.completedRetry(
      key,
      'PROPOSE',
      scheduleVersion,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const [latest] = await this.list()
    if ((latest?.version ?? 0) !== replacesVersion) {
      throw alreadyExists(
        'referral sticker schedule base version was superseded'
      )
    }
    const active = await this.database
      .prepare(
        `SELECT 1 FROM referral_sticker_schedule_versions
         WHERE season = ? AND status = 'ACTIVE'`
      )
      .bind(season)
      .first()
    if (active) {
      throw alreadyExists('current referral sticker season is already active')
    }
    const after: ReferralStickerScheduleView = {
      version: scheduleVersion,
      season,
      status: 'DRAFT',
      entries,
      createdByUserId: actorUserId,
      reason,
      reviewReference,
      createdAt: now
    }
    const entriesJson = JSON.stringify(entries)
    const retry = () =>
      this.completedRetry(
        key,
        'PROPOSE',
        scheduleVersion,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `INSERT INTO content_stickers (token_id, required_points, season)
             SELECT json_extract(item.value, '$.tokenId'),
                    json_extract(item.value, '$.requiredPoints'), ?
             FROM json_each(?) item WHERE true
             ON CONFLICT(token_id, season) DO UPDATE
               SET required_points = excluded.required_points
             WHERE content_stickers.required_points <>
                   excluded.required_points`
          )
          .bind(season, entriesJson),
        this.database
          .prepare(
            `INSERT INTO referral_sticker_schedule_versions
               (version, season, status, expected_entry_count,
                created_by_user_id, activated_by_user_id, reason,
                review_reference, created_at, activated_at)
             SELECT ?, ?, 'DRAFT', ?, ?, NULL, ?, ?, ?, NULL
             WHERE ? = COALESCE((
               SELECT MAX(version) FROM referral_sticker_schedule_versions
             ), 0)
               AND NOT EXISTS (
                 SELECT 1 FROM referral_sticker_schedule_versions
                 WHERE season = ? AND status = 'ACTIVE'
               )`
          )
          .bind(
            scheduleVersion,
            season,
            entries.length,
            actorUserId,
            reason,
            reviewReference,
            now,
            replacesVersion,
            season
          ),
        this.database
          .prepare(
            `INSERT INTO referral_sticker_schedule_entries
               (schedule_version, token_id, required_points)
             SELECT ?, json_extract(item.value, '$.tokenId'),
                    json_extract(item.value, '$.requiredPoints')
             FROM json_each(?) item
             WHERE EXISTS (
               SELECT 1 FROM referral_sticker_schedule_versions schedule
               WHERE schedule.version = ? AND schedule.status = 'DRAFT'
             )`
          )
          .bind(scheduleVersion, entriesJson, scheduleVersion),
        this.database
          .prepare(
            `INSERT INTO staff_referral_sticker_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'PROPOSE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, scheduleVersion, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_referral_sticker_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_referral_sticker_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'PROPOSE', ?, ?, NULL, ?, ?)`
          )
          .bind(key, scheduleVersion, actorUserId, JSON.stringify(after), now)
      ],
      retry,
      async () => {
        const [current] = await this.list()
        if ((current?.version ?? 0) !== replacesVersion) {
          throw alreadyExists(
            'referral sticker schedule version was superseded'
          )
        }
      }
    )
  }

  async activate(
    actorUserId: string,
    value: {
      version?: unknown
      season?: unknown
      entries?: unknown
      reviewReference?: unknown
      reason?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ReferralStickerScheduleView> {
    const key = operationKey(operationKeyValue)
    const scheduleVersion = version(value.version)
    const now = new Date().toISOString()
    const season = integer(value.season, 'referral sticker season', 1)
    if (season !== seasonFromDate(new Date(now))) {
      throw invalidArgument(
        'referral sticker activation must target current season'
      )
    }
    const entries = manifest(value.entries)
    const reviewReference = boundedText(
      value.reviewReference,
      'reviewReference'
    )
    const reason = boundedText(value.reason, 'reason')
    const requestJson = JSON.stringify({
      version: scheduleVersion,
      season,
      entries,
      reviewReference,
      reason
    })
    const existing = await this.completedRetry(
      key,
      'ACTIVATE',
      scheduleVersion,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const before = await this.exactSchedule(scheduleVersion)
    const [latest] = await this.list()
    if (
      latest?.version !== scheduleVersion ||
      before.status !== 'DRAFT' ||
      before.createdByUserId === actorUserId
    ) {
      throw invalidArgument(
        'independent current referral sticker approval required'
      )
    }
    if (
      before.season !== season ||
      before.reviewReference !== reviewReference ||
      JSON.stringify(before.entries) !== JSON.stringify(entries)
    ) {
      throw invalidArgument(
        'referral sticker manifest confirmation does not match'
      )
    }
    const matchingContent = await this.database
      .prepare(
        `SELECT COUNT(*) count
         FROM json_each(?) item
         JOIN content_stickers sticker
           ON sticker.season = ?
          AND sticker.token_id = json_extract(item.value, '$.tokenId')
          AND sticker.required_points =
              json_extract(item.value, '$.requiredPoints')`
      )
      .bind(JSON.stringify(entries), season)
      .first<{ count: number }>()
    if (matchingContent?.count !== entries.length) {
      throw invalidArgument('referral sticker metadata changed after proposal')
    }
    const after: ReferralStickerScheduleView = {
      ...before,
      status: 'ACTIVE',
      activatedByUserId: actorUserId,
      activationReason: reason,
      activatedAt: now
    }
    const entriesJson = JSON.stringify(entries)
    const retry = () =>
      this.completedRetry(
        key,
        'ACTIVATE',
        scheduleVersion,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `UPDATE referral_sticker_schedule_versions
             SET status = 'ACTIVE', activated_by_user_id = ?, activated_at = ?
             WHERE version = ? AND season = ? AND status = 'DRAFT'
               AND created_by_user_id <> ? AND review_reference = ?
               AND version = (
                 SELECT MAX(version)
                 FROM referral_sticker_schedule_versions
               )
               AND expected_entry_count = json_array_length(?)
               AND NOT EXISTS (
                 SELECT 1 FROM referral_sticker_schedule_entries entry
                 WHERE entry.schedule_version = ? AND NOT EXISTS (
                   SELECT 1 FROM json_each(?) item
                   WHERE json_extract(item.value, '$.tokenId') = entry.token_id
                     AND json_extract(item.value, '$.requiredPoints') =
                         entry.required_points
                 )
               )`
          )
          .bind(
            actorUserId,
            now,
            scheduleVersion,
            season,
            actorUserId,
            reviewReference,
            entriesJson,
            scheduleVersion,
            entriesJson
          ),
        this.database
          .prepare(
            `INSERT INTO staff_referral_sticker_schedule_operations
               (operation_key, operation, schedule_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, scheduleVersion, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_referral_sticker_schedule_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_referral_sticker_schedule_audit
               (operation_key, operation, schedule_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, ?, ?)`
          )
          .bind(
            key,
            scheduleVersion,
            actorUserId,
            JSON.stringify(before),
            JSON.stringify(after),
            now
          )
      ],
      retry,
      async () => {
        const current = await this.exactSchedule(scheduleVersion)
        const [latestSchedule] = await this.list()
        if (latestSchedule?.version !== scheduleVersion) {
          throw alreadyExists('referral sticker schedule was superseded')
        }
        if (current.status !== 'DRAFT') {
          throw alreadyExists('referral sticker activation was already decided')
        }
      }
    )
  }
}
