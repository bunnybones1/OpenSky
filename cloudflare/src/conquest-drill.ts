import { alreadyExists, invalidArgument } from './errors'
import type { Env } from './env'
import { PlayerRepository } from './player'

export const CONQUEST_DRILL_OPERATION_HEADER = 'x-cloud-weasel-operation-key'

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VERSION_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/
const MATCH_TIMEOUT_MS = 4 * 60 * 60 * 1_000

export type ConquestDrillStatus =
  | 'PREPARING'
  | 'RUNNING'
  | 'WAITING_DELIVERY'
  | 'COMPLETED'
  | 'FAILED'

export type ConquestDrillFailureReason =
  | 'PROVISIONING_INVALID'
  | 'MATCH_DISPATCH_FAILED'
  | 'MATCH_LEDGER_FAILED'
  | 'MATCH_OUTCOME_INVALID'
  | 'DELIVERY_WINDOW_EXPIRED'

interface OperationRow {
  operation_key: string
  pool_version: string
  actor_user_id: string
  target_user_id: string
  opponent_user_ids_json: string
  request_json: string
  status: ConquestDrillStatus
  completed_match_count: number
  failure_reason: ConquestDrillFailureReason | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

interface MatchRow {
  status: 'creating' | 'active' | 'ended' | 'failed'
  winner_player: number | null
  result_json: string | null
  updated_at: string
  player1_result: string | null
  player2_result: string | null
}

interface PoolWindowRow {
  ends_at: string
}

export interface ConquestDrillOperationView {
  operationKey: string
  poolVersion: string
  actorUserId: string
  targetUserId: string
  opponentUserIds: [string, string, string]
  status: ConquestDrillStatus
  completedMatchCount: number
  failureReason?: ConquestDrillFailureReason
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ConquestDrillRunSummary {
  dispatched: number
  advanced: number
  completed: number
  failed: number
  waiting: number
}

export type ConquestDrillDispatch = (
  operationKey: string,
  matchNumber: number
) => Promise<void>

const operationKey = (value: string | null) => {
  if (!value || !OPERATION_KEY_PATTERN.test(value)) {
    throw invalidArgument('valid Conquest drill operation key required')
  }
  return value.toLowerCase()
}

const poolVersion = (value: unknown) => {
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

const systemIds = (key: string) => ({
  target: `system:conquest-readiness-drill:${key}`,
  opponents: [1, 2, 3].map(
    index => `system:conquest-readiness-opponent:${key}:${index}`
  ) as [string, string, string]
})

export const conquestDrillProposalId = (key: string, matchNumber: number) =>
  `readiness-drill-match-${key}-${matchNumber}`

const present = (row: OperationRow): ConquestDrillOperationView => {
  const opponents = JSON.parse(row.opponent_user_ids_json) as unknown
  if (
    !Array.isArray(opponents) ||
    opponents.length !== 3 ||
    opponents.some(value => typeof value !== 'string')
  ) {
    throw new Error('Conquest drill opponents are invalid')
  }
  return {
    operationKey: row.operation_key,
    poolVersion: row.pool_version,
    actorUserId: row.actor_user_id,
    targetUserId: row.target_user_id,
    opponentUserIds: opponents as [string, string, string],
    status: row.status,
    completedMatchCount: row.completed_match_count,
    ...(row.failure_reason ? { failureReason: row.failure_reason } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {})
  }
}

const canonicalRequest = (version: string, reason: string) =>
  JSON.stringify({ poolVersion: version, reason })

const userEmail = (key: string, suffix: string) =>
  `readiness+${key}-${suffix}@cloud-weasel.invalid`

export class ConquestDrillRepository {
  constructor(private readonly database: D1Database) {}

  private operation(key: string) {
    return this.database
      .prepare(
        `SELECT operation_key, pool_version, actor_user_id, target_user_id,
                opponent_user_ids_json, request_json, status,
                completed_match_count, failure_reason, created_at, updated_at,
                completed_at
         FROM staff_conquest_drill_operations WHERE operation_key = ?`
      )
      .bind(key)
      .first<OperationRow>()
  }

  async list(versionValue?: unknown): Promise<ConquestDrillOperationView[]> {
    const version =
      versionValue === undefined ? undefined : poolVersion(versionValue)
    const result = version
      ? await this.database
          .prepare(
            `SELECT operation_key, pool_version, actor_user_id, target_user_id,
                    opponent_user_ids_json, request_json, status,
                    completed_match_count, failure_reason, created_at,
                    updated_at, completed_at
             FROM staff_conquest_drill_operations
             WHERE pool_version = ?
             ORDER BY created_at DESC, operation_key DESC LIMIT 100`
          )
          .bind(version)
          .all<OperationRow>()
      : await this.database
          .prepare(
            `SELECT operation_key, pool_version, actor_user_id, target_user_id,
                    opponent_user_ids_json, request_json, status,
                    completed_match_count, failure_reason, created_at,
                    updated_at, completed_at
             FROM staff_conquest_drill_operations
             ORDER BY created_at DESC, operation_key DESC LIMIT 100`
          )
          .all<OperationRow>()
    return result.results.map(present)
  }

  async start(
    actorUserId: string,
    value: { poolVersion?: unknown; reason?: unknown },
    operationKeyValue: string | null,
    at = new Date()
  ): Promise<ConquestDrillOperationView> {
    const key = operationKey(operationKeyValue)
    const version = poolVersion(value.poolVersion)
    const reason = boundedText(value.reason, 'reason')
    const requestJson = canonicalRequest(version, reason)
    const ids = systemIds(key)
    const timestamp = at.toISOString()
    let row = await this.operation(key)
    if (row) {
      if (
        row.actor_user_id !== actorUserId ||
        row.pool_version !== version ||
        row.request_json !== requestJson
      ) {
        throw alreadyExists('Conquest drill operation key was already used')
      }
      if (row.status !== 'PREPARING') return present(row)
    } else {
      await this.database
        .prepare(
          `INSERT INTO staff_conquest_drill_operations
             (operation_key, pool_version, actor_user_id, target_user_id,
              opponent_user_ids_json, request_json, status,
              completed_match_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'PREPARING', 0, ?, ?)`
        )
        .bind(
          key,
          version,
          actorUserId,
          ids.target,
          JSON.stringify(ids.opponents),
          requestJson,
          timestamp,
          timestamp
        )
        .run()
      row = await this.operation(key)
      if (!row) throw new Error('Conquest drill operation was not persisted')
    }

    try {
      await this.provision(row)
      const startedAt = timestamp
      await this.database
        .prepare(
          `UPDATE staff_conquest_drill_operations
           SET status = 'RUNNING', updated_at = ?
           WHERE operation_key = ? AND status = 'PREPARING'`
        )
        .bind(startedAt, key)
        .run()
      const started = await this.operation(key)
      if (!started || started.status !== 'RUNNING') {
        throw new Error('Conquest drill operation did not start')
      }
      return present(started)
    } catch (error) {
      const current = await this.operation(key)
      if (current?.status === 'PREPARING') {
        await this.fail(current, 'PROVISIONING_INVALID', at)
      }
      throw error
    }
  }

  private async provision(row: OperationRow): Promise<void> {
    const ids = present(row)
    const users = [ids.targetUserId, ...ids.opponentUserIds]
    const suffixes = ['target', 'opponent-1', 'opponent-2', 'opponent-3']
    await this.database.batch(
      users.map((userId, index) =>
        this.database
          .prepare(
            `INSERT OR IGNORE INTO users
               (id, display_name, primary_email, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(
            userId,
            `Readiness ${row.operation_key.slice(0, 8)} ${suffixes[index]}`,
            userEmail(row.operation_key, suffixes[index]),
            row.created_at,
            row.created_at
          )
      )
    )
    const players = new PlayerRepository(this.database)
    for (const userId of users) await players.bootstrap(userId)

    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_conquests
             (entry_key, user_id, status, nonce, mode, hero, deck_class,
              match_progress, created_at, reward_pool_version)
           VALUES (?, ?, 'IN_PROGRESS', 1, 'CONQUEST_CONSTRUCTED', 'ADA',
                   'STR', '{}', ?, ?)`
        )
        .bind(
          `readiness-drill:${row.operation_key}`,
          ids.targetUserId,
          row.created_at,
          row.pool_version
        ),
      ...ids.opponentUserIds.map((userId, index) =>
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_conquests
               (entry_key, user_id, status, nonce, mode, hero, deck_class,
                match_progress, created_at, reward_pool_version)
             VALUES (?, ?, 'IN_PROGRESS', 1, 'CONQUEST_CONSTRUCTED', 'ADA',
                     'STR', '{}', ?, ?)`
          )
          .bind(
            `readiness-drill-opponent:${row.operation_key}:${index + 1}`,
            userId,
            row.created_at,
            row.pool_version
          )
      )
    ])
  }

  private async fail(
    row: OperationRow,
    reason: ConquestDrillFailureReason,
    at: Date
  ) {
    const timestamp = at.toISOString()
    const result = await this.database
      .prepare(
        `UPDATE staff_conquest_drill_operations
         SET status = 'FAILED', failure_reason = ?, updated_at = ?,
             completed_at = ?
         WHERE operation_key = ?
           AND status IN ('PREPARING', 'RUNNING', 'WAITING_DELIVERY')`
      )
      .bind(reason, timestamp, timestamp, row.operation_key)
      .run()
    return (result.meta.changes ?? 0) >= 1
  }

  private async match(row: OperationRow, matchNumber: number) {
    return this.database
      .prepare(
        `SELECT match.status, match.winner_player, match.result_json,
                match.updated_at, progress.player1_result,
                progress.player2_result
         FROM multiplayer_matches match
         LEFT JOIN multiplayer_match_conquest_progress progress
           ON progress.proposal_id = match.proposal_id
         WHERE match.proposal_id = ?`
      )
      .bind(conquestDrillProposalId(row.operation_key, matchNumber))
      .first<MatchRow>()
  }

  private async advanceRunning(
    row: OperationRow,
    dispatch: ConquestDrillDispatch,
    at: Date,
    summary: ConquestDrillRunSummary
  ) {
    const matchNumber = row.completed_match_count + 1
    const match = await this.match(row, matchNumber)
    if (!match) {
      try {
        await dispatch(row.operation_key, matchNumber)
        summary.dispatched++
      } catch {
        if (await this.fail(row, 'MATCH_DISPATCH_FAILED', at)) summary.failed++
      }
      return
    }
    if (match.status === 'failed') {
      if (await this.fail(row, 'MATCH_LEDGER_FAILED', at)) summary.failed++
      return
    }
    if (match.status !== 'ended') {
      if (at.getTime() - Date.parse(match.updated_at) > MATCH_TIMEOUT_MS) {
        if (await this.fail(row, 'MATCH_LEDGER_FAILED', at)) summary.failed++
      } else {
        summary.waiting++
      }
      return
    }

    let result: { status?: unknown } = {}
    try {
      result = JSON.parse(match.result_json ?? '{}') as { status?: unknown }
    } catch {
      // The guarded update below would reject this as well; classify it for the
      // terminal operator receipt without exposing untrusted result contents.
    }
    if (
      match.winner_player !== 0 ||
      result.status !== 'COMPLETED' ||
      match.player1_result !== 'WIN' ||
      match.player2_result !== 'LOSS'
    ) {
      if (await this.fail(row, 'MATCH_OUTCOME_INVALID', at)) summary.failed++
      return
    }

    const finalMatch = matchNumber === 3
    const timestamp = at.toISOString()
    try {
      const advanced = await this.database
        .prepare(
          `UPDATE staff_conquest_drill_operations
           SET status = ?, completed_match_count = ?, updated_at = ?
           WHERE operation_key = ? AND status = 'RUNNING'
             AND completed_match_count = ?`
        )
        .bind(
          finalMatch ? 'WAITING_DELIVERY' : 'RUNNING',
          matchNumber,
          timestamp,
          row.operation_key,
          row.completed_match_count
        )
        .run()
      if ((advanced.meta.changes ?? 0) < 1) {
        throw new Error('Conquest drill state changed concurrently')
      }
      summary.advanced++
    } catch {
      if (await this.fail(row, 'MATCH_OUTCOME_INVALID', at)) summary.failed++
    }
  }

  private async advanceDelivery(
    row: OperationRow,
    at: Date,
    summary: ConquestDrillRunSummary
  ) {
    const evidence = await this.database
      .prepare(
        `SELECT 1 FROM conquest_verified_drill_receipts
         WHERE pool_version = ? AND user_id = ? LIMIT 1`
      )
      .bind(row.pool_version, row.target_user_id)
      .first()
    if (evidence) {
      const timestamp = at.toISOString()
      const completed = await this.database
        .prepare(
          `UPDATE staff_conquest_drill_operations
           SET status = 'COMPLETED', updated_at = ?, completed_at = ?
           WHERE operation_key = ? AND status = 'WAITING_DELIVERY'`
        )
        .bind(timestamp, timestamp, row.operation_key)
        .run()
      if ((completed.meta.changes ?? 0) >= 1) summary.completed++
      return
    }
    const pool = await this.database
      .prepare(`SELECT ends_at FROM conquest_reward_pools WHERE version = ?`)
      .bind(row.pool_version)
      .first<PoolWindowRow>()
    if (!pool || pool.ends_at <= at.toISOString()) {
      if (await this.fail(row, 'DELIVERY_WINDOW_EXPIRED', at)) summary.failed++
      return
    }
    summary.waiting++
  }

  async run(
    dispatch: ConquestDrillDispatch,
    at = new Date(),
    operationKeyValue?: string
  ): Promise<ConquestDrillRunSummary> {
    const selectedKey = operationKeyValue
      ? operationKey(operationKeyValue)
      : undefined
    const rows = selectedKey
      ? await this.database
          .prepare(
            `SELECT operation_key, pool_version, actor_user_id, target_user_id,
                    opponent_user_ids_json, request_json, status,
                    completed_match_count, failure_reason, created_at,
                    updated_at, completed_at
             FROM staff_conquest_drill_operations
             WHERE operation_key = ?
               AND status IN ('RUNNING', 'WAITING_DELIVERY')`
          )
          .bind(selectedKey)
          .all<OperationRow>()
      : await this.database
          .prepare(
            `SELECT operation_key, pool_version, actor_user_id, target_user_id,
                    opponent_user_ids_json, request_json, status,
                    completed_match_count, failure_reason, created_at,
                    updated_at, completed_at
             FROM staff_conquest_drill_operations
             WHERE status IN ('RUNNING', 'WAITING_DELIVERY')
             ORDER BY updated_at, operation_key LIMIT 10`
          )
          .all<OperationRow>()
    const summary: ConquestDrillRunSummary = {
      dispatched: 0,
      advanced: 0,
      completed: 0,
      failed: 0,
      waiting: 0
    }
    for (const row of rows.results) {
      if (row.status === 'RUNNING') {
        await this.advanceRunning(row, dispatch, at, summary)
      } else {
        await this.advanceDelivery(row, at, summary)
      }
    }
    return summary
  }
}

const dispatchThroughMatchService =
  (env: Env): ConquestDrillDispatch =>
  async (key, matchNumber) => {
    const response = await env.MATCH_SERVICE.fetch(
      new Request(
        'https://cloud-weasel-match-service/internal/conquest-readiness/matches',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cloud-weasel-internal-auth': env.INTERNAL_AUTH_SECRET
          },
          body: JSON.stringify({ operationKey: key, matchNumber })
        }
      )
    )
    if (!response.ok) {
      throw new Error(`readiness match service returned ${response.status}`)
    }
  }

export const runConquestReadinessDrills = (env: Env, at = new Date()) =>
  new ConquestDrillRepository(env.AUTH_DB).run(
    dispatchThroughMatchService(env),
    at
  )
