export const PUSH_NOTIFICATION_QUEUE_NAME = 'cloud-weasel-player-push-delivery'

const ERROR_LIMIT = 1_000
const MAX_DISCOVERY_PAGE = 100
const MAX_QUEUE_DELAY_SECONDS = 24 * 60 * 60
const REDRIVE_AFTER_MS = 5 * 60_000
const ONE_SIGNAL_URL = 'https://api.onesignal.com/notifications'

const CONTENT = {
  LEADERBOARD_REWARD: 'Your leaderboard rewards are waiting!',
  CONQUEST_V2_REWARD: 'Your conquest treasure is waiting!'
} as const

type PushType = keyof typeof CONTENT

export interface PushNotificationQueueMessage {
  kind: 'PLAYER_PUSH_NOTIFICATION'
  version: 1
  notificationId: number
}

export interface PushNotificationPublisherEnv extends PushNotificationConfiguration {
  PUSH_NOTIFICATION_QUEUE?: Queue<PushNotificationQueueMessage>
}

interface PushNotificationConfiguration {
  ONESIGNAL_APP_ID?: string
  ONESIGNAL_REST_API_KEY?: string
}

export type RewardPushReference =
  | {
      kind: 'LEADERBOARD_REWARD'
      cycleId: number
      userId: string
    }
  | {
      kind: 'CONQUEST_V2_REWARD'
      cycleId: number
      userId: string
    }

interface CandidateNotificationRow {
  id: number
}

interface DeliveryRow {
  idempotency_key: string
  status: 'PENDING' | 'SENT'
}

interface ProviderNotificationRow extends DeliveryRow {
  notification_id: number
  user_id: string
  notification_type: PushType
  push_enabled: number
  valid_from: string | null
  expires_at: string | null
  notification_pushed_at: string | null
}

export interface PushDispatchResult {
  status: 'disabled' | 'misconfigured' | 'completed'
  published: number
}

export type PushDeliveryResult =
  | { status: 'sent' | 'duplicate' | 'ineligible' }
  | { status: 'future'; delaySeconds: number }

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

const configuration = (env: PushNotificationConfiguration) => {
  const appId = env.ONESIGNAL_APP_ID?.trim() ?? ''
  const apiKey = env.ONESIGNAL_REST_API_KEY?.trim() ?? ''
  if (!appId && !apiKey) return { status: 'disabled' as const }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      appId
    ) ||
    !apiKey ||
    /replace-with/i.test(apiKey)
  ) {
    return { status: 'misconfigured' as const }
  }
  return { status: 'configured' as const, appId, apiKey }
}

export const isPushNotificationQueueMessage = (
  value: unknown
): value is PushNotificationQueueMessage => {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return (
    body.kind === 'PLAYER_PUSH_NOTIFICATION' &&
    body.version === 1 &&
    Number.isSafeInteger(body.notificationId) &&
    Number(body.notificationId) > 0 &&
    Object.keys(body).length === 3
  )
}

const queueBody = (notificationId: number): PushNotificationQueueMessage => ({
  kind: 'PLAYER_PUSH_NOTIFICATION',
  version: 1,
  notificationId
})

const dueCandidates = async (
  database: D1Database,
  now: Date
): Promise<CandidateNotificationRow[]> => {
  const at = now.toISOString()
  const staleAt = new Date(now.getTime() - REDRIVE_AFTER_MS).toISOString()
  const result = await database
    .prepare(
      `SELECT notification.id
       FROM player_notifications notification
       LEFT JOIN player_notification_push_deliveries delivery
         ON delivery.notification_id = notification.id
       WHERE notification.push_enabled = 1
         AND notification.pushed_at IS NULL
         AND notification.notification_type IN (
           'LEADERBOARD_REWARD', 'CONQUEST_V2_REWARD'
         )
         AND (notification.valid_from IS NULL OR notification.valid_from <= ?)
         AND (notification.expires_at IS NULL OR notification.expires_at >= ?)
         AND (
           delivery.notification_id IS NULL
           OR (
             delivery.status = 'PENDING'
             AND (
               delivery.last_enqueued_at IS NULL
               OR delivery.last_enqueued_at <= ?
             )
           )
         )
       ORDER BY delivery.last_enqueued_at IS NOT NULL,
                delivery.last_enqueued_at, notification.id
       LIMIT ?`
    )
    .bind(at, at, staleAt, MAX_DISCOVERY_PAGE)
    .all<CandidateNotificationRow>()
  return result.results
}

const existingDelivery = (database: D1Database, notificationId: number) =>
  database
    .prepare(
      `SELECT idempotency_key, status
       FROM player_notification_push_deliveries
       WHERE notification_id = ?`
    )
    .bind(notificationId)
    .first<DeliveryRow>()

const ensureDelivery = async (
  database: D1Database,
  notificationId: number,
  now: Date
): Promise<DeliveryRow> => {
  const existing = await existingDelivery(database, notificationId)
  if (existing) return existing
  const at = now.toISOString()
  try {
    await database
      .prepare(
        `INSERT OR IGNORE INTO player_notification_push_deliveries
           (notification_id, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(notificationId, crypto.randomUUID(), at, at)
      .run()
  } catch (error) {
    const raced = await existingDelivery(database, notificationId)
    if (raced) return raced
    throw error
  }
  const delivery = await existingDelivery(database, notificationId)
  if (!delivery) throw new Error('push delivery receipt was not created')
  return delivery
}

const markEnqueued = async (
  database: D1Database,
  notificationIds: number[],
  now: Date
) => {
  if (notificationIds.length === 0) return
  const at = now.toISOString()
  await database.batch(
    notificationIds.map(notificationId =>
      database
        .prepare(
          `UPDATE player_notification_push_deliveries
           SET last_enqueued_at = ?, updated_at = ?
           WHERE notification_id = ? AND status = 'PENDING'`
        )
        .bind(at, at, notificationId)
    )
  )
}

const configuredQueue = (env: PushNotificationPublisherEnv) => {
  if (!env.PUSH_NOTIFICATION_QUEUE) {
    throw new Error('push notification Queue binding is missing')
  }
  return env.PUSH_NOTIFICATION_QUEUE
}

export const dispatchDuePushNotifications = async (
  database: D1Database,
  env: PushNotificationPublisherEnv,
  now = new Date()
): Promise<PushDispatchResult> => {
  const config = configuration(env)
  if (config.status !== 'configured') {
    return { status: config.status, published: 0 }
  }
  const queue = configuredQueue(env)
  const candidates = await dueCandidates(database, now)
  const pending: number[] = []
  for (const candidate of candidates) {
    const delivery = await ensureDelivery(database, candidate.id, now)
    if (delivery.status === 'PENDING') pending.push(candidate.id)
  }
  if (pending.length === 0) return { status: 'completed', published: 0 }
  await queue.sendBatch(
    pending.map(notificationId => ({
      body: queueBody(notificationId),
      contentType: 'json' as const
    }))
  )
  await markEnqueued(database, pending, now)
  return { status: 'completed', published: pending.length }
}

const notificationIdForReward = async (
  database: D1Database,
  reference: RewardPushReference
) => {
  if (reference.kind === 'LEADERBOARD_REWARD') {
    return database
      .prepare(
        `SELECT notification.id
         FROM player_notifications notification
         JOIN player_leaderboard_reward_awards award
           ON award.id = notification.leaderboard_award_id
         WHERE award.cycle_id = ? AND award.user_id = ?
           AND award.application_status = 'APPLIED'
           AND notification.notification_type = 'LEADERBOARD_REWARD'
           AND notification.push_enabled = 1
           AND notification.pushed_at IS NULL`
      )
      .bind(reference.cycleId, reference.userId)
      .first<number>('id')
  }
  return database
    .prepare(
      `SELECT notification.id
       FROM player_notifications notification
       JOIN player_conquest_v2_reward_awards award
         ON award.id = notification.conquest_v2_award_id
       WHERE award.cycle_id = ? AND award.user_id = ?
         AND award.application_status = 'APPLIED'
         AND notification.notification_type = 'CONQUEST_V2_REWARD'
         AND notification.push_enabled = 1
         AND notification.pushed_at IS NULL`
    )
    .bind(reference.cycleId, reference.userId)
    .first<number>('id')
}

export const dispatchRewardPushNotification = async (
  database: D1Database,
  env: PushNotificationPublisherEnv,
  reference: RewardPushReference,
  now = new Date()
): Promise<PushDispatchResult> => {
  const config = configuration(env)
  if (config.status !== 'configured') {
    return { status: config.status, published: 0 }
  }
  const notificationId = await notificationIdForReward(database, reference)
  if (!notificationId) return { status: 'completed', published: 0 }
  const delivery = await ensureDelivery(database, notificationId, now)
  if (delivery.status === 'SENT') {
    return { status: 'completed', published: 0 }
  }
  await configuredQueue(env).send(queueBody(notificationId), {
    contentType: 'json'
  })
  await markEnqueued(database, [notificationId], now)
  return { status: 'completed', published: 1 }
}

const providerNotification = (database: D1Database, notificationId: number) =>
  database
    .prepare(
      `SELECT notification.id AS notification_id,
              notification.user_id,
              notification.notification_type,
              notification.push_enabled,
              notification.valid_from,
              notification.expires_at,
              notification.pushed_at AS notification_pushed_at,
              delivery.idempotency_key,
              delivery.status
       FROM player_notification_push_deliveries delivery
       JOIN player_notifications notification
         ON notification.id = delivery.notification_id
       JOIN users ON users.id = notification.user_id
       WHERE delivery.notification_id = ?`
    )
    .bind(notificationId)
    .first<ProviderNotificationRow>()

const responseBody = async (response: Response) => {
  const text = (await response.text()).slice(0, ERROR_LIMIT)
  if (!text) return {}
  try {
    return JSON.parse(text) as { id?: unknown; errors?: unknown }
  } catch {
    return { errors: text }
  }
}

export const deliverPushNotificationQueueMessage = async (
  database: D1Database,
  env: PushNotificationPublisherEnv,
  body: unknown,
  now = new Date(),
  fetcher: Fetcher = fetch
): Promise<PushDeliveryResult> => {
  if (!isPushNotificationQueueMessage(body)) {
    throw new Error('push notification Queue message is invalid')
  }
  const config = configuration(env)
  if (config.status !== 'configured') return { status: 'ineligible' }
  const notification = await providerNotification(database, body.notificationId)
  if (!notification) return { status: 'ineligible' }
  if (notification.status === 'SENT') return { status: 'duplicate' }
  if (
    notification.push_enabled !== 1 ||
    notification.notification_pushed_at !== null ||
    !(notification.notification_type in CONTENT)
  ) {
    return { status: 'ineligible' }
  }
  const nowMs = now.getTime()
  const validFromMs = notification.valid_from
    ? Date.parse(notification.valid_from)
    : Number.NEGATIVE_INFINITY
  if (validFromMs > nowMs) {
    return {
      status: 'future',
      delaySeconds: Math.min(
        MAX_QUEUE_DELAY_SECONDS,
        Math.max(1, Math.ceil((validFromMs - nowMs) / 1_000))
      )
    }
  }
  if (notification.expires_at && Date.parse(notification.expires_at) < nowMs) {
    return { status: 'ineligible' }
  }
  const response = await fetcher(ONE_SIGNAL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Key ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_id: config.appId,
      include_aliases: { external_id: [notification.user_id] },
      target_channel: 'push',
      headings: { en: 'Cloud Weasel' },
      contents: { en: CONTENT[notification.notification_type] },
      idempotency_key: notification.idempotency_key
    })
  })
  const responseJson = await responseBody(response)
  if (!response.ok) {
    throw new Error(
      `OneSignal ${response.status}: ${JSON.stringify(responseJson).slice(0, ERROR_LIMIT)}`
    )
  }
  const at = now.toISOString()
  const providerMessageId =
    typeof responseJson.id === 'string' ? responseJson.id : null
  await database.batch([
    database
      .prepare(
        `UPDATE player_notification_push_deliveries
         SET status = 'SENT', provider_message_id = ?, pushed_at = ?,
             updated_at = ?
         WHERE notification_id = ? AND status = 'PENDING'`
      )
      .bind(providerMessageId, at, at, notification.notification_id),
    database
      .prepare(
        `UPDATE player_notifications SET pushed_at = ?
         WHERE id = ? AND pushed_at IS NULL
           AND EXISTS (
             SELECT 1 FROM player_notification_push_deliveries
             WHERE notification_id = ? AND status = 'SENT'
           )`
      )
      .bind(at, notification.notification_id, notification.notification_id)
  ])
  return { status: 'sent' }
}

const failureText = (error: unknown) =>
  (error instanceof Error
    ? error.message
    : String(error || 'push failed')
  ).slice(0, ERROR_LIMIT)

const recordQueueFailure = async (
  database: D1Database,
  message: Message<PushNotificationQueueMessage>,
  error: unknown,
  now: Date
) => {
  if (!isPushNotificationQueueMessage(message.body)) return
  await database
    .prepare(
      `INSERT OR IGNORE INTO player_notification_push_failures
         (notification_id, message_id, delivery_attempt, error, failed_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      message.body.notificationId,
      message.id,
      message.attempts,
      failureText(error),
      now.toISOString()
    )
    .run()
}

export const handlePushNotificationQueue = async (
  batch: MessageBatch<PushNotificationQueueMessage>,
  database: D1Database,
  env: PushNotificationPublisherEnv,
  now = new Date(),
  fetcher: Fetcher = fetch
) => {
  const config = configuration(env)
  if (config.status !== 'configured') {
    for (const message of batch.messages) message.ack()
    return
  }
  await Promise.all(
    batch.messages.map(async message => {
      try {
        const result = await deliverPushNotificationQueueMessage(
          database,
          env,
          message.body,
          now,
          fetcher
        )
        if (result.status === 'future') {
          message.retry({ delaySeconds: result.delaySeconds })
        } else {
          message.ack()
        }
      } catch (error) {
        if (!isPushNotificationQueueMessage(message.body)) {
          console.error('invalid push notification Queue message', error)
          message.ack()
          return
        }
        try {
          await recordQueueFailure(database, message, error, now)
        } catch (recordError) {
          console.error(
            'push notification failure observation failed',
            recordError
          )
        }
        message.retry()
      }
    })
  )
}
