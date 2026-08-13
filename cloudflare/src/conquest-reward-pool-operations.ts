import { allLibraryCards } from './card-library'
import { alreadyExists, invalidArgument, notFound } from './errors'

export const CONQUEST_REWARD_POOL_OPERATION_HEADER =
  'x-cloud-weasel-operation-key'

export type ConquestRewardPoolOperation = 'PROPOSE' | 'ACTIVATE' | 'RETIRE'

interface PoolRow {
  version: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  starts_at: string
  ends_at: string
  created_at: string
  activation_status: 'DRAFT' | 'ACTIVE' | null
  card_manifest_json: string | null
  expected_silver_count: number | null
  expected_gold_count: number | null
  created_by_user_id: string | null
  activated_by_user_id: string | null
  proposal_reason: string | null
  activation_reason: string | null
  review_reference: string | null
  proposal_created_at: string | null
  activated_at: string | null
}

interface CardRow {
  pool_version: string
  item_type: 'SW_SILVER_CARDS' | 'SW_GOLD_CARDS'
  card_id: number
}

interface OperationRow {
  operation_key: string
  operation: ConquestRewardPoolOperation
  pool_version: string
  actor_user_id: string
  request_json: string
  status: 'PREPARING' | 'APPLIED'
}

export interface ConquestRewardPoolView {
  version: string
  status: PoolRow['status']
  startsAt: string
  endsAt: string
  createdAt: string
  silverCardIds: number[]
  goldCardIds: number[]
  cardManifest: string[]
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
const VERSION_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/
const CARD_IDS = new Set(allLibraryCards().map(card => card.id))
const MAX_CARDS_PER_CLASS = CARD_IDS.size

const operationKey = (value: string | null) => {
  if (!value || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument('valid Conquest pool operation key required')
  }
  return value.toLowerCase()
}

const version = (value: unknown) => {
  if (typeof value !== 'string' || !VERSION_PATTERN.test(value)) {
    throw invalidArgument('Conquest pool version is invalid')
  }
  return value
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

const cardIds = (value: unknown, field: string) => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_CARDS_PER_CLASS ||
    !value.every(
      id => Number.isSafeInteger(id) && id > 0 && CARD_IDS.has(id as number)
    )
  ) {
    throw invalidArgument(`${field} is invalid`)
  }
  const ids = [...new Set(value as number[])].sort((left, right) => left - right)
  if (ids.length !== value.length) {
    throw invalidArgument(`${field} contains duplicate cards`)
  }
  return ids
}

const manifestFor = (silver: number[], gold: number[]) => [
  ...silver.map(id => `SW_SILVER_CARDS:${id}`),
  ...gold.map(id => `SW_GOLD_CARDS:${id}`)
]

const manifest = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !value.every(item => typeof item === 'string')
  ) {
    throw invalidArgument('Conquest pool cardManifest is invalid')
  }
  return value as string[]
}

const poolQuery = `
  SELECT pool.version, pool.status, pool.starts_at, pool.ends_at,
         pool.created_at, activation.status AS activation_status,
         activation.card_manifest_json, activation.expected_silver_count,
         activation.expected_gold_count, activation.created_by_user_id,
         activation.activated_by_user_id, activation.proposal_reason,
         activation.activation_reason, activation.review_reference,
         activation.created_at AS proposal_created_at,
         activation.activated_at
  FROM conquest_reward_pools pool
  LEFT JOIN conquest_reward_pool_activations activation
    ON activation.pool_version = pool.version`

const present = (row: PoolRow, cards: CardRow[]): ConquestRewardPoolView => {
  const silverCardIds = cards
    .filter(card => card.item_type === 'SW_SILVER_CARDS')
    .map(card => card.card_id)
  const goldCardIds = cards
    .filter(card => card.item_type === 'SW_GOLD_CARDS')
    .map(card => card.card_id)
  const cardManifest = row.card_manifest_json
    ? (JSON.parse(row.card_manifest_json) as string[])
    : manifestFor(silverCardIds, goldCardIds)
  return {
    version: row.version,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    silverCardIds,
    goldCardIds,
    cardManifest,
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
  }
}

export class ConquestRewardPoolOperationsRepository {
  constructor(private readonly database: D1Database) {}

  private async operation(key: string): Promise<OperationRow | null> {
    return this.database
      .prepare(
        `SELECT operation_key, operation, pool_version, actor_user_id,
                request_json, status
         FROM staff_conquest_reward_pool_operations WHERE operation_key = ?`
      )
      .bind(key)
      .first<OperationRow>()
  }

  private async cards(versions: string[]): Promise<CardRow[]> {
    if (!versions.length) return []
    return (
      await this.database
        .prepare(
          `SELECT pool_version, item_type, card_id
           FROM conquest_reward_pool_cards
           WHERE pool_version IN (${versions.map(() => '?').join(',')})
           ORDER BY pool_version ASC,
                    CASE item_type WHEN 'SW_SILVER_CARDS' THEN 0 ELSE 1 END,
                    card_id ASC`
        )
        .bind(...versions)
        .all<CardRow>()
    ).results
  }

  private async exactPool(poolVersion: string): Promise<ConquestRewardPoolView> {
    const row = await this.database
      .prepare(`${poolQuery} WHERE pool.version = ?`)
      .bind(poolVersion)
      .first<PoolRow>()
    if (!row) throw notFound('Conquest reward pool not found')
    return present(row, await this.cards([poolVersion]))
  }

  private async completedRetry(
    key: string,
    operation: ConquestRewardPoolOperation,
    poolVersion: string,
    actorUserId: string,
    requestJson: string
  ): Promise<ConquestRewardPoolView | null> {
    const receipt = await this.operation(key)
    if (!receipt) return null
    if (
      receipt.operation !== operation ||
      receipt.pool_version !== poolVersion ||
      receipt.actor_user_id !== actorUserId ||
      receipt.request_json !== requestJson
    ) {
      throw alreadyExists('Conquest pool operation key was already used')
    }
    if (receipt.status !== 'APPLIED') {
      throw alreadyExists('Conquest pool operation is still preparing')
    }
    return this.exactPool(poolVersion)
  }

  private async apply(
    statements: D1PreparedStatement[],
    retry: () => Promise<ConquestRewardPoolView | null>,
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
    if (!recovered) throw new Error('Conquest pool operation receipt is missing')
    return recovered
  }

  async list(poolVersion?: unknown): Promise<ConquestRewardPoolView[]> {
    const filter =
      poolVersion === undefined ? undefined : version(poolVersion)
    const rows = filter
      ? [
          await this.database
            .prepare(`${poolQuery} WHERE pool.version = ?`)
            .bind(filter)
            .first<PoolRow>()
        ].filter((row): row is PoolRow => row !== null)
      : (
          await this.database
            .prepare(`${poolQuery} ORDER BY pool.created_at DESC LIMIT 100`)
            .all<PoolRow>()
        ).results
    const cards = await this.cards(rows.map(row => row.version))
    return rows.map(row =>
      present(
        row,
        cards.filter(card => card.pool_version === row.version)
      )
    )
  }

  async propose(
    actorUserId: string,
    value: {
      version?: unknown
      startsAt?: unknown
      endsAt?: unknown
      silverCardIds?: unknown
      goldCardIds?: unknown
      reason?: unknown
      reviewReference?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ConquestRewardPoolView> {
    const key = operationKey(operationKeyValue)
    const poolVersion = version(value.version)
    const startsAt = canonicalDate(value.startsAt, 'startsAt')
    const endsAt = canonicalDate(value.endsAt, 'endsAt')
    if (startsAt >= endsAt) throw invalidArgument('startsAt must be before endsAt')
    const silver = cardIds(value.silverCardIds, 'silverCardIds')
    const gold = cardIds(value.goldCardIds, 'goldCardIds')
    const reason = boundedText(value.reason, 'reason')
    const reviewReference = boundedText(
      value.reviewReference,
      'reviewReference'
    )
    const cardManifest = manifestFor(silver, gold)
    const requestJson = JSON.stringify({
      version: poolVersion,
      startsAt,
      endsAt,
      silverCardIds: silver,
      goldCardIds: gold,
      cardManifest,
      reason,
      reviewReference
    })
    const existing = await this.completedRetry(
      key,
      'PROPOSE',
      poolVersion,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const now = new Date().toISOString()
    if (now >= endsAt) throw invalidArgument('Conquest pool must end in the future')
    const after = JSON.stringify({
      version: poolVersion,
      status: 'DRAFT',
      startsAt,
      endsAt,
      createdAt: now,
      silverCardIds: silver,
      goldCardIds: gold,
      cardManifest,
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
        poolVersion,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `INSERT INTO conquest_reward_pools
               (version, status, starts_at, ends_at, created_at)
             VALUES (?, 'DRAFT', ?, ?, ?)`
          )
          .bind(poolVersion, startsAt, endsAt, now),
        this.database
          .prepare(
            `INSERT INTO conquest_reward_pool_cards
               (pool_version, item_type, card_id)
             SELECT ?, 'SW_SILVER_CARDS', CAST(value AS INTEGER)
             FROM json_each(?)`
          )
          .bind(poolVersion, JSON.stringify(silver)),
        this.database
          .prepare(
            `INSERT INTO conquest_reward_pool_cards
               (pool_version, item_type, card_id)
             SELECT ?, 'SW_GOLD_CARDS', CAST(value AS INTEGER)
             FROM json_each(?)`
          )
          .bind(poolVersion, JSON.stringify(gold)),
        this.database
          .prepare(
            `INSERT INTO conquest_reward_pool_activations
               (pool_version, status, card_manifest_json,
                expected_silver_count, expected_gold_count,
                created_by_user_id, activated_by_user_id, proposal_reason,
                activation_reason, review_reference, created_at, activated_at)
             VALUES (?, 'DRAFT', ?, ?, ?, ?, NULL, ?, NULL, ?, ?, NULL)`
          )
          .bind(
            poolVersion,
            JSON.stringify(cardManifest),
            silver.length,
            gold.length,
            actorUserId,
            reason,
            reviewReference,
            now
          ),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_reward_pool_operations
               (operation_key, operation, pool_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'PROPOSE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, poolVersion, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_conquest_reward_pool_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_reward_pool_audit
               (operation_key, operation, pool_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'PROPOSE', ?, ?, NULL, ?, ?)`
          )
          .bind(key, poolVersion, actorUserId, after, now)
      ],
      retry,
      async () => {
        if ((await this.list(poolVersion)).length) {
          throw alreadyExists('Conquest pool version already exists')
        }
      }
    )
  }

  async activate(
    actorUserId: string,
    value: {
      version?: unknown
      cardManifest?: unknown
      reason?: unknown
    },
    operationKeyValue: string | null
  ): Promise<ConquestRewardPoolView> {
    const key = operationKey(operationKeyValue)
    const poolVersion = version(value.version)
    const cardManifest = manifest(value.cardManifest)
    const reason = boundedText(value.reason, 'reason')
    const requestJson = JSON.stringify({
      version: poolVersion,
      cardManifest,
      reason
    })
    const existing = await this.completedRetry(
      key,
      'ACTIVATE',
      poolVersion,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const before = await this.exactPool(poolVersion)
    if (
      before.status !== 'DRAFT' ||
      before.proposal?.status !== 'DRAFT' ||
      before.proposal.createdByUserId === actorUserId
    ) {
      throw invalidArgument('independent draft Conquest pool approval required')
    }
    if (JSON.stringify(cardManifest) !== JSON.stringify(before.cardManifest)) {
      throw invalidArgument('Conquest pool cardManifest does not match proposal')
    }
    const now = new Date().toISOString()
    if (now >= before.endsAt) throw invalidArgument('Conquest pool has expired')
    const after = JSON.stringify({
      ...before,
      status: 'ACTIVE',
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
        poolVersion,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `UPDATE conquest_reward_pool_activations
             SET status = 'ACTIVE', activated_by_user_id = ?,
                 activation_reason = ?, activated_at = ?
             WHERE pool_version = ? AND status = 'DRAFT'
               AND created_by_user_id <> ? AND card_manifest_json = ?`
          )
          .bind(
            actorUserId,
            reason,
            now,
            poolVersion,
            actorUserId,
            JSON.stringify(cardManifest)
          ),
        this.database
          .prepare(
            `UPDATE conquest_reward_pools SET status = 'ACTIVE'
             WHERE version = ? AND status = 'DRAFT'
               AND EXISTS (
                 SELECT 1 FROM conquest_reward_pool_activations activation
                 WHERE activation.pool_version = conquest_reward_pools.version
                   AND activation.status = 'ACTIVE'
                   AND activation.activated_by_user_id = ?
               )`
          )
          .bind(poolVersion, actorUserId),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_reward_pool_operations
               (operation_key, operation, pool_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, poolVersion, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_conquest_reward_pool_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_reward_pool_audit
               (operation_key, operation, pool_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'ACTIVATE', ?, ?, ?, ?, ?)`
          )
          .bind(
            key,
            poolVersion,
            actorUserId,
            JSON.stringify(before),
            after,
            now
          )
      ],
      retry,
      async () => {
        const current = await this.exactPool(poolVersion)
        if (current.status !== 'DRAFT' || current.proposal?.status !== 'DRAFT') {
          throw alreadyExists('Conquest pool activation was already decided')
        }
      }
    )
  }

  async retire(
    actorUserId: string,
    value: { version?: unknown; reason?: unknown },
    operationKeyValue: string | null
  ): Promise<ConquestRewardPoolView> {
    const key = operationKey(operationKeyValue)
    const poolVersion = version(value.version)
    const reason = boundedText(value.reason, 'reason')
    const requestJson = JSON.stringify({ version: poolVersion, reason })
    const existing = await this.completedRetry(
      key,
      'RETIRE',
      poolVersion,
      actorUserId,
      requestJson
    )
    if (existing) return existing
    const before = await this.exactPool(poolVersion)
    if (before.status !== 'ACTIVE') {
      throw invalidArgument('active Conquest reward pool required')
    }
    const now = new Date().toISOString()
    const after = JSON.stringify({ ...before, status: 'RETIRED' })
    const retry = () =>
      this.completedRetry(
        key,
        'RETIRE',
        poolVersion,
        actorUserId,
        requestJson
      )
    return this.apply(
      [
        this.database
          .prepare(
            `UPDATE conquest_reward_pools SET status = 'RETIRED'
             WHERE version = ? AND status = 'ACTIVE'`
          )
          .bind(poolVersion),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_reward_pool_operations
               (operation_key, operation, pool_version, actor_user_id,
                request_json, status, created_at, completed_at)
             VALUES (?, 'RETIRE', ?, ?, ?, 'PREPARING', ?, NULL)`
          )
          .bind(key, poolVersion, actorUserId, requestJson, now),
        this.database
          .prepare(
            `UPDATE staff_conquest_reward_pool_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE operation_key = ? AND status = 'PREPARING'`
          )
          .bind(now, key),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_reward_pool_audit
               (operation_key, operation, pool_version, actor_user_id,
                before_json, after_json, created_at)
             VALUES (?, 'RETIRE', ?, ?, ?, ?, ?)`
          )
          .bind(
            key,
            poolVersion,
            actorUserId,
            JSON.stringify(before),
            after,
            now
          )
      ],
      retry,
      async () => {
        const current = await this.exactPool(poolVersion)
        if (current.status !== 'ACTIVE') {
          throw alreadyExists('Conquest pool retirement was already decided')
        }
      }
    )
  }
}
