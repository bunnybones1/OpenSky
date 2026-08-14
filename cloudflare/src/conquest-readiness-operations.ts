import { alreadyExists, invalidArgument, notFound } from './errors'

export const CONQUEST_READINESS_OPERATION_HEADER =
  'x-cloud-weasel-operation-key'

interface EvidenceRow {
  pool_version: string
  conquest_id: number
  settlement_key: string
  delivery_key: string
  user_id: string
  settled_at: string
  delivered_at: string
  starts_at: string
  ends_at: string
  approved: number
  verified_by_user_id: string | null
  drill_reference: string | null
  verified_at: string | null
}

interface OperationRow {
  operation_key: string
  pool_version: string
  conquest_id: number
  actor_user_id: string
  request_json: string
  status: 'PREPARING' | 'APPLIED'
}

export interface ConquestReadinessEvidenceView {
  poolVersion: string
  conquestId: number
  settlementKey: string
  deliveryKey: string
  userId: string
  settledAt: string
  deliveredAt: string
  poolStartsAt: string
  poolEndsAt: string
  eligibleNow: boolean
  verification: null | {
    verifiedByUserId: string
    drillReference: string
    verifiedAt: string
  }
}

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VERSION_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/

const operationKey = (value: string | null) => {
  if (!value || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument('valid Conquest readiness operation key required')
  }
  return value.toLowerCase()
}

const poolVersion = (value: unknown) => {
  if (typeof value !== 'string' || !VERSION_PATTERN.test(value)) {
    throw invalidArgument('Conquest pool version is invalid')
  }
  return value
}

const conquestId = (value: unknown) => {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw invalidArgument('Conquest drill ID is invalid')
  }
  return value as number
}

const receiptKey = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument(`${field} is invalid`)
  }
  return value.toLowerCase()
}

const boundedText = (value: unknown, field: string) => {
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 1000) {
    throw invalidArgument(`${field} is invalid`)
  }
  return trimmed
}

const evidenceQuery = `
  SELECT drill.pool_version, drill.conquest_id, drill.settlement_key,
         drill.delivery_key, drill.user_id, drill.settled_at,
         drill.delivered_at, pool.starts_at, pool.ends_at,
         CASE WHEN approved.version IS NULL THEN 0 ELSE 1 END AS approved,
         CASE WHEN applied.operation_key IS NULL
              THEN NULL ELSE ready.verified_by_user_id
          END AS verified_by_user_id,
         CASE WHEN applied.operation_key IS NULL
              THEN NULL ELSE ready.drill_reference
          END AS drill_reference,
         CASE WHEN applied.operation_key IS NULL
              THEN NULL ELSE ready.verified_at
          END AS verified_at
  FROM conquest_verified_drill_receipts drill
  JOIN conquest_reward_pools pool ON pool.version = drill.pool_version
  LEFT JOIN conquest_approved_active_reward_pools approved
    ON approved.version = drill.pool_version
  LEFT JOIN conquest_queue_readiness ready
    ON ready.pool_version = drill.pool_version
   AND ready.conquest_id = drill.conquest_id
   AND ready.settlement_key = drill.settlement_key
   AND ready.delivery_key = drill.delivery_key
  LEFT JOIN staff_conquest_readiness_operations applied
    ON applied.operation = 'VERIFY'
   AND applied.pool_version = ready.pool_version
   AND applied.conquest_id = ready.conquest_id
   AND applied.actor_user_id = ready.verified_by_user_id
   AND applied.status = 'APPLIED'
   AND applied.created_at = ready.verified_at
   AND json_extract(applied.request_json, '$.settlementKey') =
       ready.settlement_key
   AND json_extract(applied.request_json, '$.deliveryKey') =
       ready.delivery_key
   AND json_extract(applied.request_json, '$.drillReference') =
       ready.drill_reference`

const present = (
  row: EvidenceRow,
  now: string
): ConquestReadinessEvidenceView => ({
  poolVersion: row.pool_version,
  conquestId: row.conquest_id,
  settlementKey: row.settlement_key,
  deliveryKey: row.delivery_key,
  userId: row.user_id,
  settledAt: row.settled_at,
  deliveredAt: row.delivered_at,
  poolStartsAt: row.starts_at,
  poolEndsAt: row.ends_at,
  eligibleNow:
    row.approved === 1 &&
    row.delivered_at <= now &&
    row.starts_at <= now &&
    row.ends_at >= now,
  verification:
    row.verified_by_user_id && row.drill_reference && row.verified_at
      ? {
          verifiedByUserId: row.verified_by_user_id,
          drillReference: row.drill_reference,
          verifiedAt: row.verified_at
        }
      : null
})

export class ConquestReadinessOperationsRepository {
  constructor(private readonly database: D1Database) {}

  private async operation(key: string): Promise<OperationRow | null> {
    return this.database
      .prepare(
        `SELECT operation_key, pool_version, conquest_id, actor_user_id,
                request_json, status
         FROM staff_conquest_readiness_operations WHERE operation_key = ?`
      )
      .bind(key)
      .first<OperationRow>()
  }

  private async exactEvidence(
    version: string,
    id: number,
    at = new Date().toISOString()
  ): Promise<ConquestReadinessEvidenceView> {
    const row = await this.database
      .prepare(
        `${evidenceQuery}
         WHERE drill.pool_version = ? AND drill.conquest_id = ?`
      )
      .bind(version, id)
      .first<EvidenceRow>()
    if (!row) throw notFound('verified Conquest drill evidence not found')
    return present(row, at)
  }

  private async completedRetry(
    key: string,
    version: string,
    id: number,
    actorUserId: string,
    requestJson: string
  ): Promise<ConquestReadinessEvidenceView | null> {
    const receipt = await this.operation(key)
    if (!receipt) return null
    if (
      receipt.pool_version !== version ||
      receipt.conquest_id !== id ||
      receipt.actor_user_id !== actorUserId ||
      receipt.request_json !== requestJson
    ) {
      throw alreadyExists('Conquest readiness operation key was already used')
    }
    if (receipt.status !== 'APPLIED') {
      throw alreadyExists('Conquest readiness operation is still preparing')
    }
    return this.exactEvidence(version, id)
  }

  async list(versionValue?: unknown): Promise<ConquestReadinessEvidenceView[]> {
    const filter =
      versionValue === undefined ? undefined : poolVersion(versionValue)
    const now = new Date().toISOString()
    const rows = filter
      ? (
          await this.database
            .prepare(
              `${evidenceQuery}
               WHERE drill.pool_version = ?
               ORDER BY drill.conquest_id DESC LIMIT 100`
            )
            .bind(filter)
            .all<EvidenceRow>()
        ).results
      : (
          await this.database
            .prepare(
              `${evidenceQuery}
               ORDER BY drill.delivered_at DESC, drill.conquest_id DESC
               LIMIT 100`
            )
            .all<EvidenceRow>()
        ).results
    return rows.map(row => present(row, now))
  }

  async verify(
    actorUserId: string,
    value: {
      poolVersion?: unknown
      conquestId?: unknown
      settlementKey?: unknown
      deliveryKey?: unknown
      drillReference?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ConquestReadinessEvidenceView> {
    const key = operationKey(operationKeyValue)
    const version = poolVersion(value.poolVersion)
    const id = conquestId(value.conquestId)
    const settlementKey = receiptKey(value.settlementKey, 'settlementKey')
    const deliveryKey = receiptKey(value.deliveryKey, 'deliveryKey')
    const drillReference = boundedText(value.drillReference, 'drillReference')
    const requestJson = JSON.stringify({
      poolVersion: version,
      conquestId: id,
      settlementKey,
      deliveryKey,
      drillReference
    })
    const existing = await this.completedRetry(
      key,
      version,
      id,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const now = new Date().toISOString()
    const before = await this.exactEvidence(version, id, now)
    if (
      before.settlementKey !== settlementKey ||
      before.deliveryKey !== deliveryKey
    ) {
      throw invalidArgument(
        'Conquest readiness receipt confirmation does not match'
      )
    }
    if (!before.eligibleNow) {
      throw invalidArgument('active verified Conquest drill evidence required')
    }
    if (before.verification) {
      throw alreadyExists('Conquest reward pool readiness was already verified')
    }
    const after: ConquestReadinessEvidenceView = {
      ...before,
      verification: {
        verifiedByUserId: actorUserId,
        drillReference,
        verifiedAt: now
      }
    }
    const retry = () =>
      this.completedRetry(key, version, id, actorUserId, requestJson)
    try {
      await this.database.batch([
        this.database
          .prepare(
            `INSERT INTO staff_conquest_readiness_operations
               (operation_key, operation, pool_version, conquest_id,
                actor_user_id, request_json, status, created_at, completed_at)
             VALUES (?, 'VERIFY', ?, ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, version, id, actorUserId, requestJson, now),
        this.database
          .prepare(
            `INSERT INTO conquest_queue_readiness
               (pool_version, conquest_id, settlement_key, delivery_key,
                verified_by_user_id, drill_reference, verified_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            version,
            id,
            settlementKey,
            deliveryKey,
            actorUserId,
            drillReference,
            now
          ),
        this.database
          .prepare(
            `UPDATE staff_conquest_readiness_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_readiness_audit
               (operation_key, operation, pool_version, conquest_id,
                actor_user_id, before_json, after_json, created_at)
             VALUES (?, 'VERIFY', ?, ?, ?, NULL, ?, ?)`
          )
          .bind(key, version, id, actorUserId, JSON.stringify(after), now)
      ])
    } catch (error) {
      const recovered = await retry()
      if (recovered) return recovered
      const current = await this.exactEvidence(version, id)
      if (current.verification) {
        throw alreadyExists(
          'Conquest reward pool readiness was concurrently verified'
        )
      }
      throw error
    }
    const recovered = await retry()
    if (!recovered) throw new Error('Conquest readiness receipt is missing')
    return recovered
  }
}
