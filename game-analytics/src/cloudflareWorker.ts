import {
  isReplayAnalyticsMessage,
  type ReplayAnalyticsMessage
} from '@opensky/shared/gameAnalytics'

import { processToCSV } from './analyticsHelpers'
import { cloudflareAnalyticsRuntime } from './cloudflareRuntime'
import { Game, type AnalyticsMatchRuntimeConstructor } from './Match'

const MAX_ERROR_LENGTH = 500
const MAX_ATTEMPTS = 25

export interface GameAnalyticsEnv {
  AUTH_DB: D1Database
  GAME_ANALYTICS: R2Bucket
  ANALYTICS_RELEASE_VERSION: string
}

const health = (env: GameAnalyticsEnv) =>
  Response.json(
    {
      ok: true,
      component: 'cloud-weasel-game-analytics',
      releaseVersion: env.ANALYTICS_RELEASE_VERSION
    },
    {
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      }
    }
  )

const boundedError = (error: unknown) =>
  (error instanceof Error ? `${error.name}: ${error.message}` : String(error))
    .slice(0, MAX_ERROR_LENGTH)
    .trim() || 'Unknown analytics error'

const outputPrefix = (message: ReplayAnalyticsMessage) =>
  `analytics/${message.releaseVersion}/${message.proposalId}/`

const readArchive = async (
  bucket: R2Bucket,
  message: ReplayAnalyticsMessage
) => {
  const records: string[] = []
  let totalBytes = 0
  for (let index = 0; index < message.replayRecordCount; index++) {
    const object = await bucket.get(
      `${message.archivePrefix}${String(index).padStart(6, '0')}.json`
    )
    if (!object) throw new Error(`Replay record ${index} is missing`)
    const body = await object.text()
    totalBytes += new TextEncoder().encode(body).byteLength
    records.push(body)
  }
  if (totalBytes !== message.replayBytes) {
    throw new Error('Replay byte count does not match its manifest')
  }
  return records
}

const existingReceipt = (database: D1Database, proposalId: string) =>
  database
    .prepare(
      `SELECT status, attempts, release_version
       FROM multiplayer_match_analytics WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<{ status: string; attempts: number; release_version: string }>()

const beginAttempt = async (
  database: D1Database,
  message: ReplayAnalyticsMessage,
  attempts: number,
  now: string
) => {
  await database
    .prepare(
      `INSERT INTO multiplayer_match_analytics
         (proposal_id, match_id, replay_id, release_version, status,
          attempts, replay_record_count, replay_bytes, output_prefix,
          last_error, created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL)
       ON CONFLICT(proposal_id) DO UPDATE SET
         status = excluded.status,
         attempts = excluded.attempts,
         last_error = NULL,
         updated_at = excluded.updated_at,
         completed_at = NULL
       WHERE multiplayer_match_analytics.status != 'completed'`
    )
    .bind(
      message.proposalId,
      message.matchId,
      message.replayId,
      message.releaseVersion,
      attempts === 1 ? 'processing' : 'retrying',
      attempts,
      now,
      now
    )
    .run()
}

const recordFailure = async (
  database: D1Database,
  message: ReplayAnalyticsMessage,
  attempts: number,
  error: unknown,
  now: string
) => {
  await database
    .prepare(
      `UPDATE multiplayer_match_analytics
       SET status = ?, attempts = ?, last_error = ?, updated_at = ?,
           completed_at = ?
       WHERE proposal_id = ? AND status != 'completed'`
    )
    .bind(
      attempts >= MAX_ATTEMPTS ? 'failed' : 'retrying',
      attempts,
      boundedError(error),
      now,
      attempts >= MAX_ATTEMPTS ? now : null,
      message.proposalId
    )
    .run()
}

const complete = async (
  env: GameAnalyticsEnv,
  message: ReplayAnalyticsMessage,
  attempts: number,
  records: string[],
  now: string,
  Runtime: AnalyticsMatchRuntimeConstructor
) => {
  const match = await Game.loadMatch(message.matchId, records, Runtime)
  if (match.type !== 'matchData') throw match.err

  const csv = processToCSV(match)
  const prefix = outputPrefix(message)
  await Promise.all([
    env.GAME_ANALYTICS.put(`${prefix}match-data.csv`, csv.generalMatchData, {
      httpMetadata: { contentType: 'text/csv; charset=utf-8' }
    }),
    env.GAME_ANALYTICS.put(`${prefix}game-state-data.csv`, csv.gameStateData, {
      httpMetadata: { contentType: 'text/csv; charset=utf-8' }
    }),
    env.GAME_ANALYTICS.put(`${prefix}move-data.csv`, csv.moveData, {
      httpMetadata: { contentType: 'text/csv; charset=utf-8' }
    })
  ])
  await env.AUTH_DB.prepare(
    `UPDATE multiplayer_match_analytics
     SET status = 'completed', attempts = ?, replay_record_count = ?,
         replay_bytes = ?, output_prefix = ?, last_error = NULL,
         updated_at = ?, completed_at = ?
     WHERE proposal_id = ? AND status != 'completed'`
  )
    .bind(
      attempts,
      message.replayRecordCount,
      message.replayBytes,
      prefix,
      now,
      now,
      message.proposalId
    )
    .run()
}

export const processAnalyticsMessage = async (
  env: GameAnalyticsEnv,
  value: unknown,
  Runtime?: AnalyticsMatchRuntimeConstructor
) => {
  if (!isReplayAnalyticsMessage(value)) {
    throw new Error('Invalid replay analytics message')
  }
  const message = value
  const expectedRelease = env.ANALYTICS_RELEASE_VERSION.trim().toLowerCase()
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(expectedRelease)) {
    throw new Error('Analytics release version is invalid')
  }
  if (message.releaseVersion.toLowerCase() !== expectedRelease) {
    throw new Error(
      `Replay release ${message.releaseVersion} does not match analytics release ${expectedRelease}`
    )
  }
  const ledger = await env.AUTH_DB.prepare(
    `SELECT id FROM multiplayer_matches
     WHERE proposal_id = ? AND id = ? AND replay_id = ? AND version = ?
       AND status = 'ended'`
  )
    .bind(
      message.proposalId,
      message.matchId,
      message.replayId,
      message.releaseVersion
    )
    .first<{ id: number }>()
  if (!ledger)
    throw new Error('Ended multiplayer match ledger row was not found')

  const receipt = await existingReceipt(env.AUTH_DB, message.proposalId)
  if (receipt?.status === 'completed') return { alreadyCompleted: true }
  if (
    receipt &&
    receipt.release_version.toLowerCase() !==
      message.releaseVersion.toLowerCase()
  ) {
    throw new Error('Analytics receipt release does not match queue message')
  }
  const attempts = Math.min(MAX_ATTEMPTS, (receipt?.attempts ?? 0) + 1)
  if (receipt?.attempts && receipt.attempts >= MAX_ATTEMPTS) {
    return { alreadyFailed: true }
  }
  const now = new Date().toISOString()
  await beginAttempt(env.AUTH_DB, message, attempts, now)
  try {
    const records = await readArchive(env.GAME_ANALYTICS, message)
    await complete(
      env,
      message,
      attempts,
      records,
      now,
      Runtime ?? cloudflareAnalyticsRuntime()
    )
    return { completed: true }
  } catch (error) {
    await recordFailure(env.AUTH_DB, message, attempts, error, now)
    throw error
  }
}

export default {
  fetch(request: Request, env: GameAnalyticsEnv): Response {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return health(env)
    }
    return Response.json({ error: 'not found' }, { status: 404 })
  },

  async queue(
    batch: MessageBatch<unknown>,
    env: GameAnalyticsEnv
  ): Promise<void> {
    for (const message of batch.messages) {
      try {
        if (!isReplayAnalyticsMessage(message.body)) {
          console.error('invalid match analytics message', message.id)
          message.retry({ delaySeconds: 30 })
          continue
        }
        const result = await processAnalyticsMessage(env, message.body)
        if ('alreadyFailed' in result) {
          console.error(
            'match analytics message will be dead-lettered',
            message.id
          )
          message.retry({ delaySeconds: 30 })
          continue
        }
        message.ack()
      } catch (error) {
        console.error('match analytics processing failed', message.id, error)
        message.retry({ delaySeconds: 30 })
      }
    }
  }
} satisfies ExportedHandler<GameAnalyticsEnv>
