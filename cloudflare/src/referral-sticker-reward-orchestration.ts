import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep
} from 'cloudflare:workers'

import type { Env } from './env'
import { noUnpublishedReferralPointsSQL } from './experience-publication'
import { seasonFromDate } from './legacy-seasons'
import {
  carryReferralPointsIntoSeason,
  deliverReferralStickerRewardBatch,
  prepareReferralStickerRewardForUser
} from './referral-sticker-rewards'

export const REFERRAL_STICKER_REWARD_QUEUE_NAME =
  'cloud-weasel-referral-sticker-reward-delivery'

const SOURCE_SWEEP_INTERVAL_MS = 60 * 60 * 1000
// Queue sendBatch accepts no more than 100 messages. This is a transport page,
// not an entitlement cap or a copied source-runner batch size.
const QUEUE_PUBLISH_PAGE_SIZE = 100
const RECEIPT_RECONCILE_SLEEP = '30 seconds'

export interface ReferralStickerRewardWorkflowParams {
  sweepId: number
}

export type ReferralStickerRewardQueueMessage =
  | {
      kind: 'PREPARE'
      version: 1
      sweepId: number
      userId: string
    }
  | {
      kind: 'DELIVER'
      version: 1
      sweepId: number
      batchId: number
    }

export interface ReferralStickerRewardDispatchResult {
  status: 'no_content' | 'not_due' | 'dispatched'
  acceptedSweepId?: number
  started: number
  existing: number
  restarted: number
}

interface ReferralStickerWorkflowEnv {
  AUTH_DB: D1Database
  REFERRAL_STICKER_REWARD_QUEUE: Queue<ReferralStickerRewardQueueMessage>
}

interface ActiveScheduleRow {
  schedule_version: number
  season: number
  activated_at: string
}

interface SweepRow {
  id: number
  workflow_instance_id: string
  origin: 'SCHEDULE' | 'MIGRATION'
  season: number
  schedule_version: number
  due_at: string
  accepted_at: string
  snapshot_at: string | null
  expected_player_count: number | null
  completed_at: string | null
}

interface PlayerResponsibilityRow {
  status: 'PENDING' | 'APPLIED'
  completed_at: string | null
  sweep_completed_at: string | null
  season: number
  schedule_version: number
  player_authorized: number
  publication_ready: number
}

interface DeliveryResponsibilityRow {
  status: 'PENDING' | 'APPLIED'
  completed_at: string | null
  sweep_completed_at: string | null
  user_id: string
  season: number
  schedule_version: number
  batch_status: 'PENDING' | 'DELIVERED'
  deliver_at: string
  player_authorized: number
  schedule_matches: number
}

interface PlayerCursor {
  userId: string
}

interface DeliveryCursor {
  batchId: number
}

const validPositiveInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0

const validUserId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value === value.trim() &&
  value.length > 0 &&
  value.length <= 256

const validQueueMessage = (
  value: unknown
): value is ReferralStickerRewardQueueMessage => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (record.kind === 'PREPARE') {
    return (
      Object.keys(record).sort().join(',') === 'kind,sweepId,userId,version' &&
      record.version === 1 &&
      validPositiveInteger(record.sweepId) &&
      validUserId(record.userId)
    )
  }
  if (record.kind === 'DELIVER') {
    return (
      Object.keys(record).sort().join(',') === 'batchId,kind,sweepId,version' &&
      record.version === 1 &&
      validPositiveInteger(record.sweepId) &&
      validPositiveInteger(record.batchId)
    )
  }
  return false
}

const sweepById = (database: D1Database, sweepId: number) =>
  database
    .prepare(
      `SELECT id, workflow_instance_id, origin, season, schedule_version,
              due_at, accepted_at, snapshot_at, expected_player_count,
              completed_at
       FROM referral_sticker_reward_sweeps WHERE id = ?`
    )
    .bind(sweepId)
    .first<SweepRow>()

const incompleteSweeps = async (database: D1Database): Promise<SweepRow[]> => {
  const rows = await database
    .prepare(
      `SELECT id, workflow_instance_id, origin, season, schedule_version,
              due_at, accepted_at, snapshot_at, expected_player_count,
              completed_at
       FROM referral_sticker_reward_sweeps
       WHERE completed_at IS NULL
       ORDER BY accepted_at, id`
    )
    .all<SweepRow>()
  return rows.results
}

export const acceptDueReferralStickerRewardSweep = async (
  database: D1Database,
  now = new Date()
): Promise<
  | { status: 'no_content' | 'not_due'; sweep: null }
  | { status: 'accepted' | 'existing'; sweep: SweepRow }
> => {
  const season = seasonFromDate(now)
  const schedule = await database
    .prepare(
      `SELECT version AS schedule_version, season, activated_at
       FROM referral_sticker_schedule_versions
       WHERE season = ? AND status = 'ACTIVE'`
    )
    .bind(season)
    .first<ActiveScheduleRow>()
  if (!schedule) return { status: 'no_content', sweep: null }

  const latest = await database
    .prepare(
      `SELECT accepted_at FROM referral_sticker_reward_sweeps
       WHERE origin = 'SCHEDULE' AND schedule_version = ?
       ORDER BY accepted_at DESC, id DESC LIMIT 1`
    )
    .bind(schedule.schedule_version)
    .first<{ accepted_at: string }>()
  if (
    latest &&
    now.getTime() - Date.parse(latest.accepted_at) < SOURCE_SWEEP_INTERVAL_MS
  ) {
    return { status: 'not_due', sweep: null }
  }

  const due = new Date(Math.floor(now.getTime() / 60_000) * 60_000)
  const dueAt = due.toISOString()
  const acceptedAt = now.toISOString()
  const workflowInstanceId = `referral-sticker-sweep-${schedule.schedule_version}-${Math.floor(
    due.getTime() / 1_000
  )}`
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO referral_sticker_reward_sweeps
         (workflow_instance_id, origin, season, schedule_version, due_at,
          accepted_at)
       SELECT ?, 'SCHEDULE', schedule.season, schedule.version, ?, ?
       FROM referral_sticker_schedule_versions schedule
       WHERE schedule.version = ? AND schedule.season = ?
         AND schedule.status = 'ACTIVE' AND schedule.activated_at <= ?`
    )
    .bind(
      workflowInstanceId,
      dueAt,
      acceptedAt,
      schedule.schedule_version,
      schedule.season,
      acceptedAt
    )
    .run()
  const sweep = await database
    .prepare(
      `SELECT id, workflow_instance_id, origin, season, schedule_version,
              due_at, accepted_at, snapshot_at, expected_player_count,
              completed_at
       FROM referral_sticker_reward_sweeps
       WHERE workflow_instance_id = ?`
    )
    .bind(workflowInstanceId)
    .first<SweepRow>()
  if (!sweep || sweep.completed_at !== null) {
    throw new Error('referral sticker sweep acceptance was not atomic')
  }
  return {
    status: inserted.meta.changes === 1 ? 'accepted' : 'existing',
    sweep
  }
}

export const snapshotAcceptedReferralStickerRewardSweep = async (
  database: D1Database,
  sweepId: number,
  workflowInstanceId: string,
  now = new Date()
): Promise<{ sweepId: number; playersAdded: number }> => {
  if (!validPositiveInteger(sweepId)) {
    throw new Error('referral sticker sweep identifier is invalid')
  }
  let sweep = await sweepById(database, sweepId)
  if (
    !sweep ||
    sweep.workflow_instance_id !== workflowInstanceId ||
    sweep.completed_at !== null
  ) {
    throw new Error('referral sticker Workflow responsibility is invalid')
  }
  if (sweep.snapshot_at !== null) {
    return { sweepId, playersAdded: 0 }
  }
  if (sweep.origin !== 'SCHEDULE') {
    throw new Error('referral sticker recovery sweep snapshot is missing')
  }

  const nowText = now.toISOString()
  await carryReferralPointsIntoSeason(database, sweep.season, nowText)
  const results = await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO referral_sticker_reward_sweep_players
           (sweep_id, user_id, status, created_at)
         SELECT ?, item.user_id, 'PENDING', ?
         FROM player_items item
         JOIN users ON users.id = item.user_id AND users.user_kind = 'PLAYER'
         JOIN player_account_settings settings ON settings.user_id = item.user_id
         WHERE item.item_type = 'SW_STICKER_POINTS' AND item.token_id = 0
           AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
           AND ${noUnpublishedReferralPointsSQL(
             'item.user_id',
             String(sweep.season)
           )}
           AND EXISTS (
             SELECT 1 FROM referral_sticker_schedule_entries entry
             WHERE entry.schedule_version = ?
               AND entry.required_points <= item.balance + COALESCE((
                 SELECT MAX(previous.required_points)
                 FROM referral_sticker_reward_awards previous
                 WHERE previous.user_id = item.user_id
                   AND previous.season = ?
               ), 0)
               AND NOT EXISTS (
                 SELECT 1 FROM referral_sticker_reward_awards award
                 WHERE award.user_id = item.user_id AND award.season = ?
                   AND award.token_id = entry.token_id
               )
           )
         ORDER BY item.user_id`
      )
      .bind(
        sweepId,
        nowText,
        sweep.schedule_version,
        sweep.season,
        sweep.season
      ),
    database
      .prepare(
        `UPDATE referral_sticker_reward_sweeps
         SET snapshot_at = ?, expected_player_count = (
           SELECT COUNT(*) FROM referral_sticker_reward_sweep_players player
           WHERE player.sweep_id = referral_sticker_reward_sweeps.id
         )
         WHERE id = ? AND workflow_instance_id = ?
           AND origin = 'SCHEDULE' AND snapshot_at IS NULL
           AND completed_at IS NULL`
      )
      .bind(nowText, sweepId, workflowInstanceId)
  ])
  sweep = await sweepById(database, sweepId)
  if (!sweep || sweep.snapshot_at !== nowText) {
    throw new Error('referral sticker sweep snapshot was not atomic')
  }
  return { sweepId, playersAdded: results[0].meta.changes }
}

const pendingPlayers = async (
  database: D1Database,
  sweepId: number,
  cursor?: PlayerCursor
) => {
  const rows = await database
    .prepare(
      `SELECT user_id FROM referral_sticker_reward_sweep_players
       WHERE sweep_id = ? AND status = 'PENDING'
         AND (? IS NULL OR user_id > ?)
       ORDER BY user_id LIMIT ?`
    )
    .bind(
      sweepId,
      cursor?.userId ?? null,
      cursor?.userId ?? null,
      QUEUE_PUBLISH_PAGE_SIZE
    )
    .all<{ user_id: string }>()
  return rows.results
}

export const publishPendingReferralStickerPreparations = async (
  env: ReferralStickerWorkflowEnv,
  sweepId: number,
  cursor?: PlayerCursor
): Promise<{ published: number; nextCursor?: PlayerCursor }> => {
  const sweep = await sweepById(env.AUTH_DB, sweepId)
  if (!sweep || sweep.snapshot_at === null || sweep.completed_at !== null) {
    throw new Error('referral sticker sweep is not ready for preparation')
  }
  const players = await pendingPlayers(env.AUTH_DB, sweepId, cursor)
  if (players.length === 0) return { published: 0 }
  await env.REFERRAL_STICKER_REWARD_QUEUE.sendBatch(
    players.map(player => ({
      body: {
        kind: 'PREPARE' as const,
        version: 1 as const,
        sweepId,
        userId: player.user_id
      },
      contentType: 'json' as const
    }))
  )
  return {
    published: players.length,
    ...(players.length === QUEUE_PUBLISH_PAGE_SIZE
      ? { nextCursor: { userId: players.at(-1)!.user_id } }
      : {})
  }
}

const hasPendingPlayers = async (
  database: D1Database,
  sweepId: number
): Promise<boolean> =>
  Boolean(
    await database
      .prepare(
        `SELECT 1 FROM referral_sticker_reward_sweep_players
         WHERE sweep_id = ? AND status = 'PENDING' LIMIT 1`
      )
      .bind(sweepId)
      .first()
  )

const earliestPendingDelivery = (database: D1Database, sweepId: number) =>
  database
    .prepare(
      `SELECT batch_row.deliver_at
       FROM referral_sticker_reward_sweep_deliveries delivery
       JOIN referral_sticker_reward_batches batch_row
         ON batch_row.id = delivery.batch_id
       WHERE delivery.sweep_id = ? AND delivery.status = 'PENDING'
       ORDER BY batch_row.deliver_at, batch_row.id LIMIT 1`
    )
    .bind(sweepId)
    .first<{ deliver_at: string }>()

const dueDeliveries = async (
  database: D1Database,
  sweepId: number,
  now: Date,
  cursor?: DeliveryCursor
) => {
  const rows = await database
    .prepare(
      `SELECT delivery.batch_id
       FROM referral_sticker_reward_sweep_deliveries delivery
       JOIN referral_sticker_reward_batches batch_row
         ON batch_row.id = delivery.batch_id
       WHERE delivery.sweep_id = ? AND delivery.status = 'PENDING'
         AND batch_row.deliver_at <= ? AND (? IS NULL OR delivery.batch_id > ?)
       ORDER BY delivery.batch_id LIMIT ?`
    )
    .bind(
      sweepId,
      now.toISOString(),
      cursor?.batchId ?? null,
      cursor?.batchId ?? null,
      QUEUE_PUBLISH_PAGE_SIZE
    )
    .all<{ batch_id: number }>()
  return rows.results
}

export const publishDueReferralStickerDeliveries = async (
  env: ReferralStickerWorkflowEnv,
  sweepId: number,
  now = new Date(),
  cursor?: DeliveryCursor
): Promise<{ published: number; nextCursor?: DeliveryCursor }> => {
  const deliveries = await dueDeliveries(env.AUTH_DB, sweepId, now, cursor)
  if (deliveries.length === 0) return { published: 0 }
  await env.REFERRAL_STICKER_REWARD_QUEUE.sendBatch(
    deliveries.map(delivery => ({
      body: {
        kind: 'DELIVER' as const,
        version: 1 as const,
        sweepId,
        batchId: delivery.batch_id
      },
      contentType: 'json' as const
    }))
  )
  return {
    published: deliveries.length,
    ...(deliveries.length === QUEUE_PUBLISH_PAGE_SIZE
      ? { nextCursor: { batchId: deliveries.at(-1)!.batch_id } }
      : {})
  }
}

const completeReferralStickerRewardSweep = async (
  database: D1Database,
  sweepId: number,
  now: Date
): Promise<boolean> => {
  await database
    .prepare(
      `UPDATE referral_sticker_reward_sweeps SET completed_at = ?
       WHERE id = ? AND completed_at IS NULL
         AND snapshot_at IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM referral_sticker_reward_sweep_players player
           WHERE player.sweep_id = referral_sticker_reward_sweeps.id
             AND player.status <> 'APPLIED'
         )
         AND NOT EXISTS (
           SELECT 1 FROM referral_sticker_reward_sweep_deliveries delivery
           WHERE delivery.sweep_id = referral_sticker_reward_sweeps.id
             AND delivery.status <> 'APPLIED'
         )`
    )
    .bind(now.toISOString(), sweepId)
    .run()
  return (await sweepById(database, sweepId))?.completed_at !== null
}

export const runReferralStickerRewardWorkflow = async (
  env: ReferralStickerWorkflowEnv,
  event: Readonly<WorkflowEvent<ReferralStickerRewardWorkflowParams>>,
  step: WorkflowStep
) => {
  await step.do('snapshot referral sticker candidates', () =>
    snapshotAcceptedReferralStickerRewardSweep(
      env.AUTH_DB,
      event.payload.sweepId,
      event.instanceId,
      new Date()
    )
  )

  let playerCursor: PlayerCursor | undefined
  while (true) {
    const published = await step.do('publish sticker preparations', () =>
      publishPendingReferralStickerPreparations(
        env,
        event.payload.sweepId,
        playerCursor
      )
    )
    playerCursor = published.nextCursor
    if (playerCursor) continue
    if (!(await hasPendingPlayers(env.AUTH_DB, event.payload.sweepId))) break
    await step.sleep(
      'wait for sticker preparation receipts',
      RECEIPT_RECONCILE_SLEEP
    )
  }

  while (true) {
    const earliest = await step.do('find next sticker delivery', () =>
      earliestPendingDelivery(env.AUTH_DB, event.payload.sweepId)
    )
    if (!earliest) {
      const completed = await step.do('complete sticker reward sweep', () =>
        completeReferralStickerRewardSweep(
          env.AUTH_DB,
          event.payload.sweepId,
          new Date()
        )
      )
      if (completed) {
        return { sweepId: event.payload.sweepId, completed: true }
      }
      await step.sleep(
        'wait for sticker completion receipts',
        RECEIPT_RECONCILE_SLEEP
      )
      continue
    }

    const deliveryAt = new Date(earliest.deliver_at)
    if (deliveryAt.getTime() > Date.now()) {
      await step.sleepUntil('wait for sticker delivery boundary', deliveryAt)
    }
    let deliveryCursor: DeliveryCursor | undefined
    while (true) {
      const published = await step.do('publish due sticker deliveries', () =>
        publishDueReferralStickerDeliveries(
          env,
          event.payload.sweepId,
          new Date(),
          deliveryCursor
        )
      )
      deliveryCursor = published.nextCursor
      if (!deliveryCursor) break
    }
    await step.sleep(
      'wait for sticker delivery receipts',
      RECEIPT_RECONCILE_SLEEP
    )
  }
}

export class ReferralStickerRewardWorkflow extends WorkflowEntrypoint<
  Env,
  ReferralStickerRewardWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<ReferralStickerRewardWorkflowParams>>,
    step: WorkflowStep
  ) {
    if (!this.env.REFERRAL_STICKER_REWARD_QUEUE) {
      throw new Error('referral sticker reward Queue binding is missing')
    }
    return runReferralStickerRewardWorkflow(
      {
        AUTH_DB: this.env.AUTH_DB,
        REFERRAL_STICKER_REWARD_QUEUE: this.env.REFERRAL_STICKER_REWARD_QUEUE
      },
      event,
      step
    )
  }
}

const ensureReferralStickerRewardWorkflow = async (
  workflow: Workflow<ReferralStickerRewardWorkflowParams>,
  sweep: SweepRow
): Promise<'started' | 'existing' | 'restarted'> => {
  try {
    await workflow.create({
      id: sweep.workflow_instance_id,
      params: { sweepId: sweep.id }
    })
    return 'started'
  } catch (creationError) {
    let instance: WorkflowInstance
    let current: Awaited<ReturnType<WorkflowInstance['status']>>
    try {
      instance = await workflow.get(sweep.workflow_instance_id)
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
      return 'restarted'
    }
    return 'existing'
  }
}

export const dispatchDueReferralStickerRewards = async (
  env: Pick<
    Env,
    | 'AUTH_DB'
    | 'REFERRAL_STICKER_REWARD_WORKFLOW'
    | 'REFERRAL_STICKER_REWARD_QUEUE'
  >,
  now = new Date()
): Promise<ReferralStickerRewardDispatchResult> => {
  if (!env.REFERRAL_STICKER_REWARD_WORKFLOW) {
    throw new Error('referral sticker reward Workflow binding is missing')
  }
  if (!env.REFERRAL_STICKER_REWARD_QUEUE) {
    throw new Error('referral sticker reward Queue binding is missing')
  }

  const accepted = await acceptDueReferralStickerRewardSweep(env.AUTH_DB, now)
  const sweeps = await incompleteSweeps(env.AUTH_DB)
  const result: ReferralStickerRewardDispatchResult = {
    status:
      accepted.status === 'no_content'
        ? 'no_content'
        : accepted.status === 'not_due'
          ? 'not_due'
          : 'dispatched',
    ...(accepted.sweep ? { acceptedSweepId: accepted.sweep.id } : {}),
    started: 0,
    existing: 0,
    restarted: 0
  }
  for (const sweep of sweeps) {
    const status = await ensureReferralStickerRewardWorkflow(
      env.REFERRAL_STICKER_REWARD_WORKFLOW,
      sweep
    )
    result[status] += 1
  }
  return result
}

const playerResponsibility = (
  database: D1Database,
  sweepId: number,
  userId: string
) =>
  database
    .prepare(
      `SELECT player.status, player.completed_at,
              sweep.completed_at AS sweep_completed_at, sweep.season,
              sweep.schedule_version,
              EXISTS (
                SELECT 1
                FROM users
                JOIN player_account_settings settings
                  ON settings.user_id = users.id
                WHERE users.id = player.user_id AND users.user_kind = 'PLAYER'
                  AND settings.account_status NOT IN
                    ('BANNED', 'SUSPENDED', 'DELETED')
              ) AS player_authorized,
              ${noUnpublishedReferralPointsSQL(
                'player.user_id',
                'sweep.season'
              )} AS publication_ready
       FROM referral_sticker_reward_sweep_players player
       JOIN referral_sticker_reward_sweeps sweep ON sweep.id = player.sweep_id
       WHERE player.sweep_id = ? AND player.user_id = ?`
    )
    .bind(sweepId, userId)
    .first<PlayerResponsibilityRow>()

const deliveryResponsibility = (
  database: D1Database,
  sweepId: number,
  batchId: number
) =>
  database
    .prepare(
      `SELECT delivery.status, delivery.completed_at,
              sweep.completed_at AS sweep_completed_at, batch_row.user_id,
              sweep.season, sweep.schedule_version, batch_row.status AS batch_status,
              batch_row.deliver_at,
              EXISTS (
                SELECT 1
                FROM users
                JOIN player_account_settings settings
                  ON settings.user_id = users.id
                WHERE users.id = batch_row.user_id
                  AND users.user_kind = 'PLAYER'
                  AND settings.account_status NOT IN
                    ('BANNED', 'SUSPENDED', 'DELETED')
              ) AS player_authorized,
              EXISTS (
                SELECT 1
                FROM referral_sticker_reward_batch_schedule_receipts receipt
                WHERE receipt.batch_id = batch_row.id
                  AND receipt.schedule_version = sweep.schedule_version
              ) AS schedule_matches
       FROM referral_sticker_reward_sweep_deliveries delivery
       JOIN referral_sticker_reward_sweeps sweep ON sweep.id = delivery.sweep_id
       JOIN referral_sticker_reward_batches batch_row
         ON batch_row.id = delivery.batch_id
       WHERE delivery.sweep_id = ? AND delivery.batch_id = ?`
    )
    .bind(sweepId, batchId)
    .first<DeliveryResponsibilityRow>()

export const applyReferralStickerRewardQueueMessage = async (
  database: D1Database,
  body: unknown,
  now = new Date()
): Promise<'applied' | 'duplicate' | 'ignored'> => {
  if (!validQueueMessage(body)) return 'ignored'
  if (body.kind === 'PREPARE') {
    const authority = await playerResponsibility(
      database,
      body.sweepId,
      body.userId
    )
    if (!authority) return 'ignored'
    if (authority.status === 'APPLIED') return 'duplicate'
    if (
      authority.sweep_completed_at !== null ||
      authority.player_authorized !== 1 ||
      authority.publication_ready !== 1
    ) {
      throw new Error('referral sticker preparation authority is invalid')
    }
    await prepareReferralStickerRewardForUser(
      database,
      body.userId,
      authority.season,
      authority.schedule_version,
      now,
      body.sweepId
    )
    const applied = await playerResponsibility(
      database,
      body.sweepId,
      body.userId
    )
    if (applied?.status !== 'APPLIED') {
      throw new Error('referral sticker preparation was not atomic')
    }
    return 'applied'
  }

  const authority = await deliveryResponsibility(
    database,
    body.sweepId,
    body.batchId
  )
  if (!authority) return 'ignored'
  if (authority.status === 'APPLIED') return 'duplicate'
  if (
    authority.sweep_completed_at !== null ||
    authority.player_authorized !== 1 ||
    authority.schedule_matches !== 1 ||
    authority.batch_status !== 'PENDING' ||
    Date.parse(authority.deliver_at) > now.getTime()
  ) {
    throw new Error('referral sticker delivery authority is invalid')
  }
  await deliverReferralStickerRewardBatch(
    database,
    { id: body.batchId, user_id: authority.user_id },
    now,
    body.sweepId
  )
  const applied = await deliveryResponsibility(
    database,
    body.sweepId,
    body.batchId
  )
  if (applied?.status !== 'APPLIED') {
    throw new Error('referral sticker delivery was not atomic')
  }
  return 'applied'
}

const recordQueueFailure = async (
  database: D1Database,
  message: Message<ReferralStickerRewardQueueMessage>,
  error: unknown,
  now: Date
) => {
  if (!validQueueMessage(message.body)) return
  const description =
    (error instanceof Error ? error.message : String(error)).trim() ||
    'referral sticker Queue delivery failed'
  await database
    .prepare(
      `INSERT OR IGNORE INTO referral_sticker_reward_queue_failures
         (message_kind, sweep_id, user_id, batch_id, message_id,
          delivery_attempt, error, failed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.body.kind,
      message.body.sweepId,
      message.body.kind === 'PREPARE' ? message.body.userId : null,
      message.body.kind === 'DELIVER' ? message.body.batchId : null,
      message.id,
      message.attempts,
      description.slice(0, 1_000),
      now.toISOString()
    )
    .run()
}

export const handleReferralStickerRewardQueue = async (
  batch: MessageBatch<ReferralStickerRewardQueueMessage>,
  database: D1Database,
  now = new Date()
) => {
  await Promise.all(
    batch.messages.map(async message => {
      try {
        await applyReferralStickerRewardQueueMessage(
          database,
          message.body,
          now
        )
        message.ack()
      } catch (error) {
        if (!validQueueMessage(message.body)) {
          console.error('invalid referral sticker reward Queue message', error)
          message.ack()
          return
        }
        try {
          await recordQueueFailure(database, message, error, now)
        } catch (recordError) {
          console.error(
            'referral sticker Queue failure observation failed',
            recordError
          )
        }
        message.retry()
      }
    })
  )
}
