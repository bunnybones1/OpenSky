import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep
} from 'cloudflare:workers'

import type { Env } from './env'
import { noUnpublishedMatchExperienceSQL } from './experience-publication'
import { seasonName, seasonStart } from './legacy-seasons'
import { PlayerRpcRepository } from './player-rpc'

export const SKYPASS_AUTO_CLAIM_QUEUE_NAME =
  'cloud-weasel-skypass-auto-claim-delivery'

const SOURCE_CLOSE_DELAY_MS = 10_000
// Cloudflare Queue sendBatch accepts at most 100 messages. This is a platform
// boundary, not a copied source runner batch or player-visible invariant.
const QUEUE_PUBLISH_PAGE_SIZE = 100
const RECONCILE_SLEEP = '30 seconds'

export interface SkypassSeasonCloseWorkflowParams {
  season: number
}

export interface SkypassAutoClaimQueueMessage {
  kind: 'SKYPASS_AUTO_CLAIM'
  version: 1
  season: number
  userId: string
}

export interface SkypassSeasonCloseDispatchResult {
  status: 'not_due' | 'started' | 'existing' | 'restarted'
  season?: number
  workflowInstanceId?: string
}

interface SkypassSeasonCloseWorkflowEnv {
  AUTH_DB: D1Database
  SKYPASS_AUTO_CLAIM_QUEUE: Queue<SkypassAutoClaimQueueMessage>
}

interface ActivePolicyRow {
  season: number
  version: number
  content_sha256: string
  fulfillment_policy_hash: string
}

interface CloseRow extends ActivePolicyRow {
  workflow_instance_id: string
  closes_at: string
  accepted_at: string
  completed_at: string | null
}

interface DeliveryRow {
  status: 'PENDING' | 'APPLIED'
  orchestration_completed_at: string | null
  cycle_completed_at: string | null
  policy_matches: number
  eligible: number
  publication_ready: number
}

interface AutoClaimRow {
  rewards: string
}

interface PublishCursor {
  userId: string
}

const validSeason = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 65_535

const validQueueMessage = (
  value: unknown
): value is SkypassAutoClaimQueueMessage => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).sort().join(',') === 'kind,season,userId,version' &&
    record.kind === 'SKYPASS_AUTO_CLAIM' &&
    record.version === 1 &&
    validSeason(record.season) &&
    typeof record.userId === 'string' &&
    record.userId === record.userId.trim() &&
    record.userId.length > 0 &&
    record.userId.length <= 256
  )
}

const closeTime = (season: number): Date =>
  new Date(seasonStart(season + 1).getTime() + SOURCE_CLOSE_DELAY_MS)

const closeBySeason = (database: D1Database, season: number) =>
  database
    .prepare(
      `SELECT orchestration.season, orchestration.workflow_instance_id,
              orchestration.policy_version AS version,
              orchestration.policy_content_sha256 AS content_sha256,
              orchestration.fulfillment_policy_hash,
              cycle.closes_at, orchestration.accepted_at,
              orchestration.completed_at
       FROM skypass_season_close_orchestrations orchestration
       JOIN skypass_season_close_cycles cycle
         ON cycle.season = orchestration.season
       WHERE orchestration.season = ?`
    )
    .bind(season)
    .first<CloseRow>()

const pendingClose = (database: D1Database) =>
  database
    .prepare(
      `SELECT orchestration.season, orchestration.workflow_instance_id,
              orchestration.policy_version AS version,
              orchestration.policy_content_sha256 AS content_sha256,
              orchestration.fulfillment_policy_hash,
              cycle.closes_at, orchestration.accepted_at,
              orchestration.completed_at
       FROM skypass_season_close_orchestrations orchestration
       JOIN skypass_season_close_cycles cycle
         ON cycle.season = orchestration.season
       WHERE orchestration.completed_at IS NULL
         AND cycle.completed_at IS NULL
       ORDER BY cycle.closes_at, orchestration.season
       LIMIT 1`
    )
    .first<CloseRow>()

export const acceptDueSkypassSeasonClose = async (
  database: D1Database,
  now = new Date()
): Promise<
  | { status: 'not_due'; close: null }
  | { status: 'accepted' | 'existing'; close: CloseRow }
> => {
  const existing = await pendingClose(database)
  if (existing) return { status: 'existing', close: existing }

  const policies = await database
    .prepare(
      `SELECT policy.season, policy.version, policy.content_sha256,
              policy.fulfillment_policy_hash
       FROM skypass_reward_active_policies policy
       WHERE NOT EXISTS (
         SELECT 1 FROM skypass_season_close_cycles cycle
         WHERE cycle.season = policy.season
       )
       ORDER BY policy.season`
    )
    .all<ActivePolicyRow>()
  const policy = policies.results.find(
    row => closeTime(row.season).getTime() <= now.getTime()
  )
  if (!policy) return { status: 'not_due', close: null }

  const acceptedAt = now.toISOString()
  const workflowInstanceId = `skypass-close-${policy.season}`
  const results = await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO skypass_season_close_cycles
           (season, closes_at, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(policy.season, closeTime(policy.season).toISOString(), acceptedAt),
    database
      .prepare(
        `INSERT OR IGNORE INTO skypass_season_close_orchestrations
           (season, workflow_instance_id, policy_version,
            policy_content_sha256, fulfillment_policy_hash, accepted_at)
         SELECT ?, ?, policy.version, policy.content_sha256,
                policy.fulfillment_policy_hash, ?
         FROM skypass_reward_active_policies policy
         WHERE policy.season = ? AND policy.version = ?
           AND policy.content_sha256 = ?
           AND policy.fulfillment_policy_hash = ?`
      )
      .bind(
        policy.season,
        workflowInstanceId,
        acceptedAt,
        policy.season,
        policy.version,
        policy.content_sha256,
        policy.fulfillment_policy_hash
      )
  ])
  const accepted = await closeBySeason(database, policy.season)
  if (
    !accepted ||
    accepted.workflow_instance_id !== workflowInstanceId ||
    accepted.version !== policy.version ||
    accepted.content_sha256 !== policy.content_sha256 ||
    accepted.fulfillment_policy_hash !== policy.fulfillment_policy_hash ||
    accepted.completed_at !== null
  ) {
    throw new Error('SkyPass season close acceptance was not atomic')
  }
  return {
    status: results[1].meta.changes === 1 ? 'accepted' : 'existing',
    close: accepted
  }
}

const workflowReceiptMatches = async (
  database: D1Database,
  season: number,
  workflowInstanceId: string
): Promise<boolean> =>
  Boolean(
    await database
      .prepare(
        `SELECT 1
         FROM skypass_season_close_orchestrations orchestration
         JOIN skypass_season_close_cycles cycle
           ON cycle.season = orchestration.season
         JOIN skypass_reward_active_policies policy
           ON policy.season = orchestration.season
          AND policy.version = orchestration.policy_version
          AND policy.content_sha256 = orchestration.policy_content_sha256
          AND policy.fulfillment_policy_hash =
              orchestration.fulfillment_policy_hash
         WHERE orchestration.season = ?
           AND orchestration.workflow_instance_id = ?
           AND orchestration.completed_at IS NULL
           AND cycle.completed_at IS NULL`
      )
      .bind(season, workflowInstanceId)
      .first()
  )

const hasUnpublishedSeasonExperience = async (
  database: D1Database,
  season: number
): Promise<boolean> =>
  Boolean(
    await database
      .prepare(
        `SELECT 1
         FROM multiplayer_match_experience_players experience
         JOIN multiplayer_matches match
           ON match.proposal_id = experience.proposal_id
         WHERE experience.season = ? AND match.status <> 'ended'
         LIMIT 1`
      )
      .bind(season)
      .first()
  )

export const snapshotAcceptedSkypassSeasonClose = async (
  database: D1Database,
  season: number,
  workflowInstanceId: string,
  now = new Date()
): Promise<{ season: number; ready: boolean; playersAdded: number }> => {
  if (
    !validSeason(season) ||
    !(await workflowReceiptMatches(database, season, workflowInstanceId))
  ) {
    throw new Error('SkyPass close Workflow responsibility is invalid')
  }
  if (await hasUnpublishedSeasonExperience(database, season)) {
    return { season, ready: false, playersAdded: 0 }
  }
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO skypass_auto_claim_deliveries
         (user_id, season, status, created_at)
       SELECT stats.user_id, stats.season, 'PENDING', ?
       FROM player_skypass_season_stats stats
       JOIN skypass_season_close_orchestrations orchestration
         ON orchestration.season = stats.season
       WHERE stats.season = ?
         AND orchestration.workflow_instance_id = ?
         AND orchestration.completed_at IS NULL
         AND stats.achieved_account_level > stats.initial_account_level
         AND NOT EXISTS (
           SELECT 1 FROM player_skypass_auto_claims receipt
           WHERE receipt.user_id = stats.user_id
             AND receipt.season = stats.season
         )`
    )
    .bind(now.toISOString(), season, workflowInstanceId)
    .run()
  return {
    season,
    ready: true,
    playersAdded: inserted.meta.changes
  }
}

const pendingDeliveries = async (
  database: D1Database,
  season: number,
  cursor?: PublishCursor
) => {
  const rows = await database
    .prepare(
      `SELECT user_id
       FROM skypass_auto_claim_deliveries
       WHERE season = ? AND status = 'PENDING'
         AND (? IS NULL OR user_id > ?)
       ORDER BY user_id
       LIMIT ?`
    )
    .bind(
      season,
      cursor?.userId ?? null,
      cursor?.userId ?? null,
      QUEUE_PUBLISH_PAGE_SIZE
    )
    .all<{ user_id: string }>()
  return rows.results
}

const completeSkypassSeasonClose = async (
  database: D1Database,
  season: number,
  now: Date
): Promise<boolean> => {
  const completedAt = now.toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE skypass_season_close_cycles SET completed_at = ?
         WHERE season = ? AND completed_at IS NULL`
      )
      .bind(completedAt, season),
    database
      .prepare(
        `UPDATE skypass_season_close_orchestrations SET completed_at = ?
         WHERE season = ? AND completed_at IS NULL`
      )
      .bind(completedAt, season)
  ])
  const close = await closeBySeason(database, season)
  return close?.completed_at === completedAt
}

export const publishPendingSkypassAutoClaims = async (
  env: SkypassSeasonCloseWorkflowEnv,
  season: number,
  now = new Date(),
  cursor?: PublishCursor
): Promise<{
  completed: boolean
  published: number
  nextCursor?: PublishCursor
}> => {
  if (!validSeason(season)) {
    throw new Error('SkyPass close season is invalid')
  }
  const close = await closeBySeason(env.AUTH_DB, season)
  if (!close) throw new Error('SkyPass season close was not found')
  if (close.completed_at !== null) return { completed: true, published: 0 }
  if (
    !(await workflowReceiptMatches(
      env.AUTH_DB,
      season,
      close.workflow_instance_id
    ))
  ) {
    throw new Error('SkyPass close policy pin is invalid')
  }
  const deliveries = await pendingDeliveries(env.AUTH_DB, season, cursor)
  if (deliveries.length === 0) {
    if (cursor) return { completed: false, published: 0 }
    return {
      completed: await completeSkypassSeasonClose(env.AUTH_DB, season, now),
      published: 0
    }
  }
  await env.SKYPASS_AUTO_CLAIM_QUEUE.sendBatch(
    deliveries.map(delivery => ({
      body: {
        kind: 'SKYPASS_AUTO_CLAIM' as const,
        version: 1 as const,
        season,
        userId: delivery.user_id
      },
      contentType: 'json' as const
    }))
  )
  return {
    completed: false,
    published: deliveries.length,
    ...(deliveries.length === QUEUE_PUBLISH_PAGE_SIZE
      ? { nextCursor: { userId: deliveries.at(-1)!.user_id } }
      : {})
  }
}

export const runSkypassSeasonCloseWorkflow = async (
  env: SkypassSeasonCloseWorkflowEnv,
  event: Readonly<WorkflowEvent<SkypassSeasonCloseWorkflowParams>>,
  step: WorkflowStep
) => {
  while (true) {
    const snapshot = await step.do('snapshot eligible SkyPass players', () =>
      snapshotAcceptedSkypassSeasonClose(
        env.AUTH_DB,
        event.payload.season,
        event.instanceId,
        new Date()
      )
    )
    if (snapshot.ready) break
    await step.sleep('wait for atomic match XP publication', RECONCILE_SLEEP)
  }

  let cursor: PublishCursor | undefined
  while (true) {
    const result = await step.do('publish pending SkyPass auto-claims', () =>
      publishPendingSkypassAutoClaims(
        env,
        event.payload.season,
        new Date(),
        cursor
      )
    )
    if (result.completed) {
      return { season: event.payload.season, completed: true }
    }
    cursor = result.nextCursor
    if (!cursor) {
      await step.sleep('wait for durable SkyPass receipts', RECONCILE_SLEEP)
    }
  }
}

export class SkypassSeasonCloseWorkflow extends WorkflowEntrypoint<
  Env,
  SkypassSeasonCloseWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<SkypassSeasonCloseWorkflowParams>>,
    step: WorkflowStep
  ) {
    if (!this.env.SKYPASS_AUTO_CLAIM_QUEUE) {
      throw new Error('SkyPass auto-claim Queue binding is missing')
    }
    return runSkypassSeasonCloseWorkflow(
      {
        AUTH_DB: this.env.AUTH_DB,
        SKYPASS_AUTO_CLAIM_QUEUE: this.env.SKYPASS_AUTO_CLAIM_QUEUE
      },
      event,
      step
    )
  }
}

export const dispatchDueSkypassAutoClaims = async (
  env: Pick<
    Env,
    'AUTH_DB' | 'SKYPASS_SEASON_CLOSE_WORKFLOW' | 'SKYPASS_AUTO_CLAIM_QUEUE'
  >,
  now = new Date()
): Promise<SkypassSeasonCloseDispatchResult> => {
  // Do not accept a durable D1 responsibility that this deployment cannot
  // drive and consume.
  if (!env.SKYPASS_SEASON_CLOSE_WORKFLOW) {
    throw new Error('SkyPass season-close Workflow binding is missing')
  }
  if (!env.SKYPASS_AUTO_CLAIM_QUEUE) {
    throw new Error('SkyPass auto-claim Queue binding is missing')
  }
  const accepted = await acceptDueSkypassSeasonClose(env.AUTH_DB, now)
  if (accepted.status === 'not_due') return { status: 'not_due' }

  const { close } = accepted
  const workflowInstanceId = close.workflow_instance_id
  try {
    await env.SKYPASS_SEASON_CLOSE_WORKFLOW.create({
      id: workflowInstanceId,
      params: { season: close.season }
    })
    return {
      status: 'started',
      season: close.season,
      workflowInstanceId
    }
  } catch (creationError) {
    let instance: WorkflowInstance
    let current: Awaited<ReturnType<WorkflowInstance['status']>>
    try {
      instance = await env.SKYPASS_SEASON_CLOSE_WORKFLOW.get(workflowInstanceId)
      current = await instance.status()
    } catch {
      throw creationError
    }
    if (current.status === 'unknown') throw creationError
    if (
      current.status === 'errored' ||
      current.status === 'terminated' ||
      current.status === 'complete'
    ) {
      await instance.restart()
      return {
        status: 'restarted',
        season: close.season,
        workflowInstanceId
      }
    }
    return {
      status: 'existing',
      season: close.season,
      workflowInstanceId
    }
  }
}

const deliveryAuthority = (
  database: D1Database,
  userId: string,
  season: number
) =>
  database
    .prepare(
      `SELECT delivery.status,
              orchestration.completed_at AS orchestration_completed_at,
              cycle.completed_at AS cycle_completed_at,
              EXISTS (
                SELECT 1 FROM skypass_reward_active_policies policy
                WHERE policy.season = orchestration.season
                  AND policy.version = orchestration.policy_version
                  AND policy.content_sha256 =
                      orchestration.policy_content_sha256
                  AND policy.fulfillment_policy_hash =
                      orchestration.fulfillment_policy_hash
              ) AS policy_matches,
              EXISTS (
                SELECT 1 FROM player_skypass_season_stats stats
                WHERE stats.user_id = delivery.user_id
                  AND stats.season = delivery.season
                  AND stats.achieved_account_level >
                      stats.initial_account_level
              ) AS eligible,
              ${noUnpublishedMatchExperienceSQL('delivery.user_id', 'delivery.season')}
                AS publication_ready
       FROM skypass_auto_claim_deliveries delivery
       JOIN skypass_season_close_orchestrations orchestration
         ON orchestration.season = delivery.season
       JOIN skypass_season_close_cycles cycle
         ON cycle.season = orchestration.season
       WHERE delivery.user_id = ? AND delivery.season = ?`
    )
    .bind(userId, season)
    .first<DeliveryRow>()

const autoClaimRows = (database: D1Database, userId: string, season: number) =>
  database
    .prepare(
      `SELECT rewards FROM player_skypass_claims
       WHERE user_id = ? AND auto_claim_season = ?
         AND application_status = 'APPLIED'
       ORDER BY reward_id`
    )
    .bind(userId, season)
    .all<AutoClaimRow>()

const completePlayerAutoClaim = async (
  database: D1Database,
  userId: string,
  season: number,
  rows: AutoClaimRow[],
  completedAt: string
): Promise<void> => {
  const gainedRewards = rows.flatMap(row => {
    const rewards = JSON.parse(row.rewards) as unknown
    if (!Array.isArray(rewards)) {
      throw new Error('SkyPass claim receipt rewards are invalid')
    }
    return rewards as Array<Record<string, unknown>>
  })
  const payload = {
    oneTime: {
      id: 0,
      name: 'Autoclaimed Rewards',
      data: {
        title: 'ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED!',
        subtitle: `SKYPASS SEASON ${season}: ${seasonName(season).toUpperCase()} COMPLETE!`,
        background: 'webapp/backgrounds/spbg-all-claimed.webp'
      }
    }
  }
  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO player_skypass_auto_claims
           (user_id, season, claimed_reward_count, gained_rewards,
            completed_at)
         SELECT ?, ?, ?, ?, ?
         FROM skypass_auto_claim_deliveries delivery
         WHERE delivery.user_id = ? AND delivery.season = ?
           AND delivery.status = 'PENDING'
           AND ${noUnpublishedMatchExperienceSQL('delivery.user_id', 'delivery.season')}`
      )
      .bind(
        userId,
        season,
        rows.length,
        JSON.stringify(gainedRewards),
        completedAt,
        userId,
        season
      ),
    database
      .prepare(
        `UPDATE player_skypass_season_stats SET autoclaimed = 1
         WHERE user_id = ? AND season = ? AND autoclaimed = 0
           AND EXISTS (
             SELECT 1 FROM player_skypass_auto_claims receipt
             WHERE receipt.user_id = ? AND receipt.season = ?
           )`
      )
      .bind(userId, season, userId, season),
    database
      .prepare(
        `INSERT OR IGNORE INTO player_notifications
           (user_id, notification_type, payload, created_at,
            skypass_auto_claim_season)
         SELECT receipt.user_id, 'ONE_TIME', ?, receipt.completed_at,
                receipt.season
         FROM player_skypass_auto_claims receipt
         WHERE receipt.user_id = ? AND receipt.season = ?
           AND receipt.claimed_reward_count > 0`
      )
      .bind(JSON.stringify(payload), userId, season),
    database
      .prepare(
        `UPDATE skypass_auto_claim_deliveries
         SET status = 'APPLIED', completed_at = (
           SELECT receipt.completed_at
           FROM player_skypass_auto_claims receipt
           WHERE receipt.user_id = skypass_auto_claim_deliveries.user_id
             AND receipt.season = skypass_auto_claim_deliveries.season
         )
         WHERE user_id = ? AND season = ? AND status = 'PENDING'`
      )
      .bind(userId, season)
  ])
}

export const applySkypassAutoClaimQueueMessage = async (
  database: D1Database,
  body: unknown,
  now = new Date()
): Promise<'applied' | 'duplicate' | 'ignored'> => {
  if (!validQueueMessage(body)) return 'ignored'
  const authority = await deliveryAuthority(database, body.userId, body.season)
  if (!authority) return 'ignored'
  if (authority.status === 'APPLIED') return 'duplicate'
  if (
    authority.orchestration_completed_at !== null ||
    authority.cycle_completed_at !== null ||
    authority.policy_matches !== 1 ||
    authority.eligible !== 1
  ) {
    throw new Error('SkyPass auto-claim authority is invalid')
  }
  if (authority.publication_ready !== 1) {
    throw new Error('SkyPass match XP publication is pending')
  }

  const playerRpc = new PlayerRpcRepository(database)
  const listing = await playerRpc.listSkypassRewards(body.userId, body.season)
  const rewardIds = listing.levels.flatMap(level =>
    level.earned
      ? level.rewards
          .filter(reward => reward.claimable && !reward.claimed)
          .map(reward => reward.id)
      : []
  )
  if (rewardIds.length > 0) {
    await playerRpc.claimSkypassRewards(body.userId, rewardIds, {
      autoClaimSeason: body.season,
      now
    })
  }
  const refreshed = await playerRpc.listSkypassRewards(body.userId, body.season)
  const remaining = refreshed.levels.some(
    level =>
      level.earned &&
      level.rewards.some(reward => reward.claimable && !reward.claimed)
  )
  if (remaining) {
    throw new Error('SkyPass auto-claim left an earned reward unpublished')
  }

  const rows = await autoClaimRows(database, body.userId, body.season)
  await completePlayerAutoClaim(
    database,
    body.userId,
    body.season,
    rows.results,
    now.toISOString()
  )
  const applied = await deliveryAuthority(database, body.userId, body.season)
  if (applied?.status !== 'APPLIED') {
    throw new Error('SkyPass auto-claim receipt was not published atomically')
  }
  return 'applied'
}

const recordQueueFailure = async (
  database: D1Database,
  message: Message<SkypassAutoClaimQueueMessage>,
  error: unknown,
  now: Date
) => {
  if (!validQueueMessage(message.body)) return
  const description =
    (error instanceof Error ? error.message : String(error)).trim() ||
    'SkyPass auto-claim delivery failed'
  await database
    .prepare(
      `INSERT OR IGNORE INTO player_skypass_auto_claim_failures
         (user_id, season, message_id, delivery_attempt, error, failed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.body.userId,
      message.body.season,
      message.id,
      message.attempts,
      description.slice(0, 1_000),
      now.toISOString()
    )
    .run()
}

export const handleSkypassAutoClaimQueue = async (
  batch: MessageBatch<SkypassAutoClaimQueueMessage>,
  database: D1Database,
  now = new Date()
) => {
  await Promise.all(
    batch.messages.map(async message => {
      try {
        await applySkypassAutoClaimQueueMessage(database, message.body, now)
        message.ack()
      } catch (error) {
        if (!validQueueMessage(message.body)) {
          console.error('invalid SkyPass auto-claim Queue message', error)
          message.ack()
          return
        }
        try {
          await recordQueueFailure(database, message, error, now)
        } catch (recordError) {
          console.error(
            'SkyPass auto-claim failure observation failed',
            recordError
          )
        }
        message.retry()
      }
    })
  )
}
