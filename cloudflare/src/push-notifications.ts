import type { Env } from './env'

const MAX_ATTEMPTS = 5
const MAX_PER_RUN = 25
const ERROR_LIMIT = 500
const ONE_SIGNAL_URL = 'https://api.onesignal.com/notifications'

const CONTENT = {
  LEADERBOARD_REWARD: 'Your leaderboard rewards are waiting!',
  CONQUEST_V2_REWARD: 'Your conquest treasure is waiting!'
} as const

type PushType = keyof typeof CONTENT

interface PendingNotificationRow {
  id: number
  user_id: string
  notification_type: PushType
}

interface DeliveryRow {
  idempotency_key: string
  status: 'PENDING' | 'SENT' | 'DEAD'
  attempts: number
}

export interface PushRunResult {
  status: 'disabled' | 'misconfigured' | 'completed'
  sent: number
  failed: number
  dead: number
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const configuration = (
  env: Pick<Env, 'ONESIGNAL_APP_ID' | 'ONESIGNAL_REST_API_KEY'>
) => {
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

const pendingNotifications = async (
  database: D1Database,
  now: string
): Promise<PendingNotificationRow[]> => {
  const result = await database
    .prepare(
      `SELECT notification.id, notification.user_id,
              notification.notification_type
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
         AND (delivery.notification_id IS NULL OR (
           delivery.status = 'PENDING' AND delivery.attempts < ?
         ))
       ORDER BY COALESCE(notification.valid_from, notification.created_at),
                notification.created_at, notification.id
       LIMIT ?`
    )
    .bind(now, now, MAX_ATTEMPTS, MAX_PER_RUN)
    .all<PendingNotificationRow>()
  return result.results
}

const ensureDelivery = async (
  database: D1Database,
  notificationId: number,
  now: string
): Promise<DeliveryRow> => {
  await database
    .prepare(
      `INSERT OR IGNORE INTO player_notification_push_deliveries
         (notification_id, idempotency_key, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(notificationId, crypto.randomUUID(), now, now)
    .run()
  const delivery = await database
    .prepare(
      `SELECT idempotency_key, status, attempts
       FROM player_notification_push_deliveries WHERE notification_id = ?`
    )
    .bind(notificationId)
    .first<DeliveryRow>()
  if (!delivery) throw new Error('push delivery receipt was not created')
  return delivery
}

const responseBody = async (response: Response) => {
  const text = (await response.text()).slice(0, ERROR_LIMIT)
  if (!text) return {}
  try {
    return JSON.parse(text) as { id?: unknown; errors?: unknown }
  } catch {
    return { errors: text }
  }
}

const failureText = (error: unknown) =>
  (error instanceof Error ? error.message : String(error || 'push failed')).slice(
    0,
    ERROR_LIMIT
  )

const markFailed = async (
  database: D1Database,
  notificationId: number,
  error: unknown,
  now: string
) => {
  await database
    .prepare(
      `UPDATE player_notification_push_deliveries
       SET attempts = attempts + 1,
           status = CASE WHEN attempts + 1 >= ? THEN 'DEAD' ELSE 'PENDING' END,
           last_error = ?, updated_at = ?
       WHERE notification_id = ? AND status = 'PENDING' AND attempts < ?`
    )
    .bind(
      MAX_ATTEMPTS,
      failureText(error),
      now,
      notificationId,
      MAX_ATTEMPTS
    )
    .run()
  return database
    .prepare(
      `SELECT status FROM player_notification_push_deliveries
       WHERE notification_id = ?`
    )
    .bind(notificationId)
    .first<'PENDING' | 'SENT' | 'DEAD'>('status')
}

const markSent = async (
  database: D1Database,
  notificationId: number,
  providerMessageId: string | null,
  now: string
) => {
  await database.batch([
    database
      .prepare(
        `UPDATE player_notification_push_deliveries
         SET status = 'SENT', attempts = attempts + 1,
             provider_message_id = ?, last_error = NULL,
             pushed_at = ?, updated_at = ?
         WHERE notification_id = ? AND status = 'PENDING' AND attempts < ?`
      )
      .bind(providerMessageId, now, now, notificationId, MAX_ATTEMPTS),
    database
      .prepare(
        `UPDATE player_notifications SET pushed_at = ?
         WHERE id = ? AND pushed_at IS NULL
           AND EXISTS (
             SELECT 1 FROM player_notification_push_deliveries
             WHERE notification_id = ? AND status = 'SENT'
           )`
      )
      .bind(now, notificationId, notificationId)
  ])
}

export const runPushNotifications = async (
  database: D1Database,
  env: Pick<Env, 'ONESIGNAL_APP_ID' | 'ONESIGNAL_REST_API_KEY'>,
  now = new Date(),
  fetcher: Fetcher = fetch
): Promise<PushRunResult> => {
  const config = configuration(env)
  if (config.status !== 'configured') {
    return { status: config.status, sent: 0, failed: 0, dead: 0 }
  }

  const timestamp = now.toISOString()
  const rows = await pendingNotifications(database, timestamp)
  const result: PushRunResult = {
    status: 'completed',
    sent: 0,
    failed: 0,
    dead: 0
  }

  for (const row of rows) {
    const delivery = await ensureDelivery(database, row.id, timestamp)
    if (delivery.status !== 'PENDING' || delivery.attempts >= MAX_ATTEMPTS) continue
    try {
      const response = await fetcher(ONE_SIGNAL_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Key ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_id: config.appId,
          include_aliases: { external_id: [row.user_id] },
          target_channel: 'push',
          headings: { en: 'Cloud Weasel' },
          contents: { en: CONTENT[row.notification_type] },
          idempotency_key: delivery.idempotency_key
        })
      })
      const body = await responseBody(response)
      if (!response.ok) {
        throw new Error(
          `OneSignal ${response.status}: ${JSON.stringify(body).slice(0, ERROR_LIMIT)}`
        )
      }
      const messageId = typeof body.id === 'string' ? body.id : null
      await markSent(database, row.id, messageId, timestamp)
      result.sent += 1
    } catch (error) {
      const status = await markFailed(database, row.id, error, timestamp)
      if (status === 'DEAD') result.dead += 1
      else result.failed += 1
    }
  }
  return result
}
