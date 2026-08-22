import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep
} from 'cloudflare:workers'

import type { Env } from './env'
import {
  acceptDueLeaderboardRewardCycle,
  completeLeaderboardRewardCycle,
  deliverLeaderboardRewardPlayer,
  leaderboardRewardCycleById,
  snapshotLeaderboardRewardCycle,
  type LeaderboardRewardEntryRow
} from './leaderboard-reward-worker'
import {
  dispatchRewardPushNotification,
  type PushNotificationPublisherEnv
} from './push-notifications'

export const LEADERBOARD_REWARD_QUEUE_NAME =
  'cloud-weasel-leaderboard-reward-delivery'

// Cloudflare sendBatch accepts at most 100 messages. This is a platform
// boundary, not a copied runner batch or player-visible product invariant.
const QUEUE_PUBLISH_PAGE_SIZE = 100
const RECONCILE_SLEEP = '30 seconds'

export interface LeaderboardRewardWorkflowParams {
  cycleId: number
}

export interface LeaderboardRewardQueueMessage {
  kind: 'LEADERBOARD_REWARD'
  version: 1
  cycleId: number
  userId: string
}

export interface LeaderboardRewardDispatchResult {
  status: 'disabled' | 'not_due' | 'started' | 'existing' | 'errored'
  cycleId?: number
  workflowInstanceId?: string
}

interface LeaderboardRewardWorkflowEnv {
  AUTH_DB: D1Database
  LEADERBOARD_REWARD_QUEUE: Queue<LeaderboardRewardQueueMessage>
}

const validCycleId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0

const validQueueMessage = (
  value: unknown
): value is LeaderboardRewardQueueMessage => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).sort().join(',') === 'cycleId,kind,userId,version' &&
    record.kind === 'LEADERBOARD_REWARD' &&
    record.version === 1 &&
    validCycleId(record.cycleId) &&
    typeof record.userId === 'string' &&
    record.userId.length > 0
  )
}

const workflowReceiptMatches = async (
  database: D1Database,
  cycleId: number,
  workflowInstanceId: string
) =>
  Boolean(
    await database
      .prepare(
        `SELECT 1 FROM leaderboard_reward_cycle_orchestrations
         WHERE cycle_id = ? AND workflow_instance_id = ?
           AND completed_at IS NULL`
      )
      .bind(cycleId, workflowInstanceId)
      .first()
  )

export const snapshotAcceptedLeaderboardRewardCycle = async (
  database: D1Database,
  cycleId: number,
  workflowInstanceId: string,
  now: Date
): Promise<{ cycleId: number; ready: boolean }> => {
  if (
    !validCycleId(cycleId) ||
    !(await workflowReceiptMatches(database, cycleId, workflowInstanceId))
  ) {
    throw new Error('leaderboard Workflow responsibility is invalid')
  }
  let cycle = await leaderboardRewardCycleById(database, cycleId)
  if (!cycle) throw new Error('leaderboard reward cycle was not found')
  if (cycle.status === 'PREPARING') {
    await snapshotLeaderboardRewardCycle(database, cycle, now)
    cycle = await leaderboardRewardCycleById(database, cycleId)
    if (!cycle) throw new Error('leaderboard reward cycle disappeared')
  }
  if (cycle.status === 'PREPARING') return { cycleId, ready: false }
  if (cycle.status !== 'DELIVERING') {
    throw new Error('leaderboard reward cycle cannot be orchestrated')
  }
  return { cycleId, ready: true }
}

interface RewardPublishCursor {
  bestRank: number
  userId: string
}

const unappliedPlayers = async (
  database: D1Database,
  cycleId: number,
  cursor?: RewardPublishCursor
) => {
  const rows = await database
    .prepare(
      `SELECT ranked.user_id, ranked.best_rank
       FROM (
         SELECT entry.user_id, MIN(entry.rank) AS best_rank
         FROM leaderboard_reward_entries entry
         LEFT JOIN player_leaderboard_reward_awards award
           ON award.cycle_id = entry.cycle_id
          AND award.user_id = entry.user_id
          AND award.application_status = 'APPLIED'
         WHERE entry.cycle_id = ? AND entry.rank <= 250
           AND award.id IS NULL
         GROUP BY entry.user_id
       ) ranked
       WHERE (? IS NULL OR ranked.best_rank > ?
         OR (ranked.best_rank = ? AND ranked.user_id > ?))
       ORDER BY ranked.best_rank, ranked.user_id
       LIMIT ?`
    )
    .bind(
      cycleId,
      cursor?.userId ?? null,
      cursor?.bestRank ?? null,
      cursor?.bestRank ?? null,
      cursor?.userId ?? null,
      QUEUE_PUBLISH_PAGE_SIZE
    )
    .all<{ user_id: string; best_rank: number }>()
  return rows.results
}

export const publishUnappliedLeaderboardRewards = async (
  env: LeaderboardRewardWorkflowEnv,
  cycleId: number,
  now = new Date(),
  cursor?: RewardPublishCursor
): Promise<{
  completed: boolean
  published: number
  nextCursor?: RewardPublishCursor
}> => {
  const cycle = await leaderboardRewardCycleById(env.AUTH_DB, cycleId)
  if (!cycle) throw new Error('leaderboard reward cycle was not found')
  if (cycle.status === 'COMPLETED') {
    return { completed: true, published: 0 }
  }
  if (cycle.status !== 'DELIVERING') {
    throw new Error('leaderboard reward cycle is not deliverable')
  }
  const players = await unappliedPlayers(env.AUTH_DB, cycleId, cursor)
  if (players.length === 0) {
    if (cursor) return { completed: false, published: 0 }
    return {
      completed: await completeLeaderboardRewardCycle(
        env.AUTH_DB,
        cycleId,
        now
      ),
      published: 0
    }
  }
  await env.LEADERBOARD_REWARD_QUEUE.sendBatch(
    players.map(player => ({
      body: {
        kind: 'LEADERBOARD_REWARD' as const,
        version: 1 as const,
        cycleId,
        userId: player.user_id
      },
      contentType: 'json' as const
    }))
  )
  return {
    completed: false,
    published: players.length,
    ...(players.length === QUEUE_PUBLISH_PAGE_SIZE
      ? {
          nextCursor: {
            bestRank: players.at(-1)!.best_rank,
            userId: players.at(-1)!.user_id
          }
        }
      : {})
  }
}

export const runLeaderboardRewardWorkflow = async (
  env: LeaderboardRewardWorkflowEnv,
  event: Readonly<WorkflowEvent<LeaderboardRewardWorkflowParams>>,
  step: WorkflowStep
) => {
  while (true) {
    const snapshot = await step.do('snapshot accepted leaderboard cycle', () =>
      snapshotAcceptedLeaderboardRewardCycle(
        env.AUTH_DB,
        event.payload.cycleId,
        event.instanceId,
        new Date()
      )
    )
    if (snapshot.ready) break
    await step.sleep('wait for atomic rank publication', RECONCILE_SLEEP)
  }

  let cursor: RewardPublishCursor | undefined
  while (true) {
    const result = await step.do('publish unapplied leaderboard rewards', () =>
      publishUnappliedLeaderboardRewards(
        env,
        event.payload.cycleId,
        new Date(),
        cursor
      )
    )
    if (result.completed) {
      return { cycleId: event.payload.cycleId, completed: true }
    }
    cursor = result.nextCursor
    if (!cursor) {
      await step.sleep('wait for durable leaderboard receipts', RECONCILE_SLEEP)
    }
  }
}

export class LeaderboardRewardWorkflow extends WorkflowEntrypoint<
  Env,
  LeaderboardRewardWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<LeaderboardRewardWorkflowParams>>,
    step: WorkflowStep
  ) {
    if (!this.env.LEADERBOARD_REWARD_QUEUE) {
      throw new Error('leaderboard reward Queue binding is missing')
    }
    return runLeaderboardRewardWorkflow(
      {
        AUTH_DB: this.env.AUTH_DB,
        LEADERBOARD_REWARD_QUEUE: this.env.LEADERBOARD_REWARD_QUEUE
      },
      event,
      step
    )
  }
}

export const dispatchDueLeaderboardRewards = async (
  env: Pick<Env, 'AUTH_DB' | 'LEADERBOARD_REWARD_WORKFLOW'>,
  now = new Date()
): Promise<LeaderboardRewardDispatchResult> => {
  const accepted = await acceptDueLeaderboardRewardCycle(env.AUTH_DB, now)
  if (accepted.status === 'disabled' || accepted.status === 'not_due') {
    return { status: accepted.status }
  }
  if (accepted.status === 'already_completed') {
    return {
      status: 'existing',
      cycleId: accepted.cycle!.id,
      workflowInstanceId: `leaderboard-cycle-${accepted.cycle!.id}`
    }
  }
  if (!env.LEADERBOARD_REWARD_WORKFLOW) {
    throw new Error('leaderboard reward Workflow binding is missing')
  }
  const cycleId = accepted.cycle!.id
  const workflowInstanceId = accepted.orchestration!.workflowInstanceId
  try {
    await env.LEADERBOARD_REWARD_WORKFLOW.create({
      id: workflowInstanceId,
      params: { cycleId }
    })
    return { status: 'started', cycleId, workflowInstanceId }
  } catch (creationError) {
    try {
      const instance =
        await env.LEADERBOARD_REWARD_WORKFLOW.get(workflowInstanceId)
      const current = await instance.status()
      if (current.status === 'unknown') throw creationError
      return {
        status: current.status === 'errored' ? 'errored' : 'existing',
        cycleId,
        workflowInstanceId
      }
    } catch {
      throw creationError
    }
  }
}

const rewardEntries = async (
  database: D1Database,
  cycleId: number,
  userId: string
): Promise<LeaderboardRewardEntryRow[]> => {
  const rows = await database
    .prepare(
      `SELECT user_id, game_mode, rank
       FROM leaderboard_reward_entries
       WHERE cycle_id = ? AND user_id = ?
       ORDER BY game_mode`
    )
    .bind(cycleId, userId)
    .all<LeaderboardRewardEntryRow>()
  return rows.results
}

export const applyLeaderboardRewardQueueMessage = async (
  database: D1Database,
  body: unknown,
  now = new Date()
): Promise<'applied' | 'duplicate'> => {
  if (!validQueueMessage(body)) {
    throw new Error('leaderboard reward Queue message is invalid')
  }
  const existing = await database
    .prepare(
      `SELECT 1 FROM player_leaderboard_reward_awards
       WHERE cycle_id = ? AND user_id = ? AND application_status = 'APPLIED'`
    )
    .bind(body.cycleId, body.userId)
    .first()
  if (existing) return 'duplicate'
  const [cycle, entries, orchestration] = await Promise.all([
    leaderboardRewardCycleById(database, body.cycleId),
    rewardEntries(database, body.cycleId, body.userId),
    database
      .prepare(
        `SELECT 1 FROM leaderboard_reward_cycle_orchestrations
         WHERE cycle_id = ? AND completed_at IS NULL`
      )
      .bind(body.cycleId)
      .first()
  ])
  if (
    !cycle ||
    !orchestration ||
    cycle.status !== 'DELIVERING' ||
    !entries.some(entry => entry.rank <= 250)
  ) {
    throw new Error('leaderboard reward Queue responsibility is not due')
  }
  return (await deliverLeaderboardRewardPlayer(
    database,
    cycle,
    body.userId,
    entries,
    now
  ))
    ? 'applied'
    : 'duplicate'
}

const recordQueueFailure = async (
  database: D1Database,
  message: Message<LeaderboardRewardQueueMessage>,
  error: unknown,
  now: Date
) => {
  if (!validQueueMessage(message.body)) return
  const description = (
    error instanceof Error
      ? error.message
      : 'leaderboard reward delivery failed'
  ).slice(0, 1_000)
  await database
    .prepare(
      `INSERT OR IGNORE INTO leaderboard_reward_delivery_failures
         (cycle_id, user_id, message_id, delivery_attempt, error, failed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.body.cycleId,
      message.body.userId,
      message.id,
      message.attempts,
      description,
      now.toISOString()
    )
    .run()
}

export const handleLeaderboardRewardQueue = async (
  batch: MessageBatch<LeaderboardRewardQueueMessage>,
  database: D1Database,
  now = new Date(),
  pushEnv?: PushNotificationPublisherEnv
) => {
  await Promise.all(
    batch.messages.map(async message => {
      try {
        await applyLeaderboardRewardQueueMessage(database, message.body, now)
        if (pushEnv) {
          try {
            await dispatchRewardPushNotification(
              database,
              pushEnv,
              {
                kind: 'LEADERBOARD_REWARD',
                cycleId: message.body.cycleId,
                userId: message.body.userId
              },
              now
            )
          } catch (error) {
            console.error('leaderboard push publication failed', error)
          }
        }
        message.ack()
      } catch (error) {
        if (!validQueueMessage(message.body)) {
          console.error('invalid leaderboard reward Queue message', error)
          message.ack()
          return
        }
        try {
          await recordQueueFailure(database, message, error, now)
        } catch (recordError) {
          console.error(
            'leaderboard reward failure observation failed',
            recordError
          )
        }
        message.retry()
      }
    })
  )
}
