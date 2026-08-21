import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep
} from 'cloudflare:workers'

import type { Env } from './env'
import {
  acceptDueConquestV2RewardCycle,
  beginConquestV2RewardDelivery,
  completeConquestV2RewardCycle,
  conquestV2RewardCycleById,
  deliverConquestV2RewardEntry,
  snapshotConquestV2RewardCycle,
  type ConquestV2RewardEntryRow
} from './conquest-v2-reward-worker'

// sendBatch accepts at most 100 messages. This is a platform boundary, not a
// copied source-runner batch size or a release-level product invariant.
export const CONQUEST_V2_REWARD_QUEUE_NAME =
  'cloud-weasel-conquest-v2-reward-delivery'
const QUEUE_PUBLISH_PAGE_SIZE = 100
const DELIVERY_RECONCILE_SLEEP = '30 seconds'

export interface ConquestV2RewardWorkflowParams {
  cycleId: number
}

export interface ConquestV2RewardQueueMessage {
  version: 1
  cycleId: number
  userId: string
}

export interface ConquestV2RewardDispatchResult {
  status: 'disabled' | 'not_due' | 'started' | 'existing' | 'errored'
  cycleId?: number
  workflowInstanceId?: string
}

interface ConquestV2RewardWorkflowEnv {
  AUTH_DB: D1Database
  CONQUEST_V2_REWARD_QUEUE: Queue<ConquestV2RewardQueueMessage>
}

const validCycleId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0

const validQueueMessage = (
  value: unknown
): value is ConquestV2RewardQueueMessage => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).sort().join(',') === 'cycleId,userId,version' &&
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
        `SELECT 1 FROM conquest_v2_reward_cycle_orchestrations
         WHERE cycle_id = ? AND workflow_instance_id = ?
           AND completed_at IS NULL`
      )
      .bind(cycleId, workflowInstanceId)
      .first()
  )

export const snapshotAcceptedConquestV2RewardCycle = async (
  database: D1Database,
  cycleId: number,
  workflowInstanceId: string,
  now: Date
): Promise<{ cycleId: number; deliveryAt: string }> => {
  if (
    !validCycleId(cycleId) ||
    !(await workflowReceiptMatches(database, cycleId, workflowInstanceId))
  ) {
    throw new Error('Conquest V2 Workflow responsibility is invalid')
  }
  let cycle = await conquestV2RewardCycleById(database, cycleId)
  if (!cycle) throw new Error('Conquest V2 reward cycle was not found')
  if (cycle.status === 'PREPARING') {
    await snapshotConquestV2RewardCycle(database, cycle, now)
    cycle = await conquestV2RewardCycleById(database, cycleId)
    if (!cycle) throw new Error('Conquest V2 reward cycle disappeared')
  }
  if (!['PENDING_DELIVERY', 'DELIVERING'].includes(cycle.status)) {
    throw new Error('Conquest V2 reward cycle cannot be orchestrated')
  }
  return { cycleId, deliveryAt: cycle.delivery_at }
}

interface RewardPublishCursor {
  treasureLevel: number
  userId: string
}

const unappliedEntries = async (
  database: D1Database,
  cycleId: number,
  cursor?: RewardPublishCursor
): Promise<ConquestV2RewardEntryRow[]> => {
  const rows = await database
    .prepare(
      `SELECT entry.user_id, entry.treasure_level, entry.treasure_weight
       FROM conquest_v2_reward_entries entry
       LEFT JOIN player_conquest_v2_reward_awards award
         ON award.cycle_id = entry.cycle_id
        AND award.user_id = entry.user_id
        AND award.application_status = 'APPLIED'
       WHERE entry.cycle_id = ? AND award.id IS NULL
         AND (? IS NULL OR entry.treasure_level < ?
           OR (entry.treasure_level = ? AND entry.user_id > ?))
       ORDER BY entry.treasure_level DESC, entry.user_id
       LIMIT ?`
    )
    .bind(
      cycleId,
      cursor?.userId ?? null,
      cursor?.treasureLevel ?? null,
      cursor?.treasureLevel ?? null,
      cursor?.userId ?? null,
      QUEUE_PUBLISH_PAGE_SIZE
    )
    .all<ConquestV2RewardEntryRow>()
  return rows.results
}

export const publishUnappliedConquestV2Rewards = async (
  env: ConquestV2RewardWorkflowEnv,
  cycleId: number,
  now = new Date(),
  cursor?: RewardPublishCursor
): Promise<{
  completed: boolean
  published: number
  nextCursor?: RewardPublishCursor
}> => {
  const cycle = await beginConquestV2RewardDelivery(env.AUTH_DB, cycleId, now)
  if (cycle.status === 'COMPLETED') {
    return { completed: true, published: 0 }
  }
  if (cycle.status !== 'DELIVERING') {
    throw new Error('Conquest V2 reward cycle is not deliverable')
  }
  const entries = await unappliedEntries(env.AUTH_DB, cycleId, cursor)
  if (entries.length === 0) {
    if (cursor) return { completed: false, published: 0 }
    return {
      completed: await completeConquestV2RewardCycle(env.AUTH_DB, cycleId, now),
      published: 0
    }
  }
  await env.CONQUEST_V2_REWARD_QUEUE.sendBatch(
    entries.map(entry => ({
      body: {
        version: 1 as const,
        cycleId,
        userId: entry.user_id
      },
      contentType: 'json' as const
    }))
  )
  return {
    completed: false,
    published: entries.length,
    ...(entries.length === QUEUE_PUBLISH_PAGE_SIZE
      ? {
          nextCursor: {
            treasureLevel: entries.at(-1)!.treasure_level,
            userId: entries.at(-1)!.user_id
          }
        }
      : {})
  }
}

export const runConquestV2RewardWorkflow = async (
  env: ConquestV2RewardWorkflowEnv,
  event: Readonly<WorkflowEvent<ConquestV2RewardWorkflowParams>>,
  step: WorkflowStep
) => {
  const snapshot = await step.do('snapshot accepted reward cycle', () =>
    snapshotAcceptedConquestV2RewardCycle(
      env.AUTH_DB,
      event.payload.cycleId,
      event.instanceId,
      new Date()
    )
  )
  await step.sleepUntil(
    'wait for approved delivery boundary',
    new Date(snapshot.deliveryAt)
  )

  let cursor: RewardPublishCursor | undefined
  while (true) {
    const result = await step.do('publish unapplied reward entries', () =>
      publishUnappliedConquestV2Rewards(
        env,
        snapshot.cycleId,
        new Date(),
        cursor
      )
    )
    if (result.completed) return { cycleId: snapshot.cycleId, completed: true }
    cursor = result.nextCursor
    if (!cursor) {
      await step.sleep(
        'wait for durable reward receipts',
        DELIVERY_RECONCILE_SLEEP
      )
    }
  }
}

export class ConquestV2RewardWorkflow extends WorkflowEntrypoint<
  Env,
  ConquestV2RewardWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<ConquestV2RewardWorkflowParams>>,
    step: WorkflowStep
  ) {
    if (!this.env.CONQUEST_V2_REWARD_QUEUE) {
      throw new Error('Conquest V2 reward Queue binding is missing')
    }
    return runConquestV2RewardWorkflow(
      {
        AUTH_DB: this.env.AUTH_DB,
        CONQUEST_V2_REWARD_QUEUE: this.env.CONQUEST_V2_REWARD_QUEUE
      },
      event,
      step
    )
  }
}

export const dispatchDueConquestV2Rewards = async (
  env: Pick<Env, 'AUTH_DB' | 'CONQUEST_V2_REWARD_WORKFLOW'>,
  now = new Date()
): Promise<ConquestV2RewardDispatchResult> => {
  const accepted = await acceptDueConquestV2RewardCycle(env.AUTH_DB, now)
  if (accepted.status === 'disabled' || accepted.status === 'not_due') {
    return { status: accepted.status }
  }
  if (accepted.status === 'already_completed') {
    return {
      status: 'existing',
      cycleId: accepted.cycle!.id,
      workflowInstanceId: `conquest-v2-cycle-${accepted.cycle!.id}`
    }
  }
  if (!env.CONQUEST_V2_REWARD_WORKFLOW) {
    throw new Error('Conquest V2 reward Workflow binding is missing')
  }
  const cycleId = accepted.cycle!.id
  const workflowInstanceId = accepted.orchestration!.workflowInstanceId
  try {
    await env.CONQUEST_V2_REWARD_WORKFLOW.create({
      id: workflowInstanceId,
      params: { cycleId }
    })
    return { status: 'started', cycleId, workflowInstanceId }
  } catch (creationError) {
    try {
      const instance =
        await env.CONQUEST_V2_REWARD_WORKFLOW.get(workflowInstanceId)
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

const rewardEntry = async (
  database: D1Database,
  cycleId: number,
  userId: string
): Promise<ConquestV2RewardEntryRow | null> =>
  database
    .prepare(
      `SELECT user_id, treasure_level, treasure_weight
       FROM conquest_v2_reward_entries
       WHERE cycle_id = ? AND user_id = ?`
    )
    .bind(cycleId, userId)
    .first<ConquestV2RewardEntryRow>()

export const applyConquestV2RewardQueueMessage = async (
  database: D1Database,
  body: unknown,
  now = new Date()
): Promise<'applied' | 'duplicate'> => {
  if (!validQueueMessage(body)) {
    throw new Error('Conquest V2 reward Queue message is invalid')
  }
  const existing = await database
    .prepare(
      `SELECT 1 FROM player_conquest_v2_reward_awards
       WHERE cycle_id = ? AND user_id = ? AND application_status = 'APPLIED'`
    )
    .bind(body.cycleId, body.userId)
    .first()
  if (existing) return 'duplicate'
  const [cycle, entry, orchestration] = await Promise.all([
    conquestV2RewardCycleById(database, body.cycleId),
    rewardEntry(database, body.cycleId, body.userId),
    database
      .prepare(
        `SELECT 1 FROM conquest_v2_reward_cycle_orchestrations
         WHERE cycle_id = ? AND completed_at IS NULL`
      )
      .bind(body.cycleId)
      .first()
  ])
  if (
    !cycle ||
    !entry ||
    !orchestration ||
    cycle.status !== 'DELIVERING' ||
    Date.parse(cycle.delivery_at) > now.getTime()
  ) {
    throw new Error('Conquest V2 reward Queue responsibility is not due')
  }
  return (await deliverConquestV2RewardEntry(database, cycle, entry, now))
    ? 'applied'
    : 'duplicate'
}

const recordQueueFailure = async (
  database: D1Database,
  message: Message<ConquestV2RewardQueueMessage>,
  error: unknown,
  now: Date
) => {
  if (!validQueueMessage(message.body)) return
  const description = (
    error instanceof Error
      ? error.message
      : 'Conquest V2 reward delivery failed'
  ).slice(0, 1_000)
  await database
    .prepare(
      `INSERT OR IGNORE INTO conquest_v2_reward_delivery_failures
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

export const handleConquestV2RewardQueue = async (
  batch: MessageBatch<ConquestV2RewardQueueMessage>,
  database: D1Database,
  now = new Date()
) => {
  await Promise.all(
    batch.messages.map(async message => {
      try {
        await applyConquestV2RewardQueueMessage(database, message.body, now)
        message.ack()
      } catch (error) {
        if (!validQueueMessage(message.body)) {
          console.error('invalid Conquest V2 reward Queue message', error)
          message.ack()
          return
        }
        try {
          await recordQueueFailure(database, message, error, now)
        } catch (recordError) {
          console.error(
            'Conquest V2 reward failure observation failed',
            recordError
          )
        }
        message.retry()
      }
    })
  )
}
