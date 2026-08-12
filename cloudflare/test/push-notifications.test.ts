import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { runPushNotifications } from '../src/push-notifications'

const NOW = new Date('2026-08-12T12:00:00.000Z')
const configured = {
  ONESIGNAL_APP_ID: '11111111-1111-4111-8111-111111111111',
  ONESIGNAL_REST_API_KEY: 'onesignal-test-api-key'
}

const insertUser = async (id: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, id, `${id}@example.com`, NOW.toISOString(), NOW.toISOString())
    .run()
}

const insertNotification = async (
  userId: string,
  type: 'LEADERBOARD_REWARD' | 'CONQUEST_V2_REWARD' | 'ONE_TIME',
  options: { pushEnabled?: boolean; validFrom?: string; expiresAt?: string } = {}
) => {
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO player_notifications
       (user_id, notification_type, created_at, valid_from, expires_at,
        push_enabled)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      type,
      NOW.toISOString(),
      options.validFrom ?? null,
      options.expiresAt ?? null,
      options.pushEnabled === false ? 0 : 1
    )
    .run()
  return Number(result.meta.last_row_id)
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM player_notification_push_deliveries'),
    env.AUTH_DB.prepare(
      `DELETE FROM player_notifications WHERE user_id LIKE 'push-%'`
    ),
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE 'push-%'`)
  ])
})

describe('optional OneSignal push worker', () => {
  it('is a read-only no-op when disabled and fails closed on partial config', async () => {
    await insertUser('push-disabled')
    await insertNotification('push-disabled', 'LEADERBOARD_REWARD')

    const unavailableFetch = async () => {
      throw new Error('fetch must not run')
    }
    expect(
      await runPushNotifications(env.AUTH_DB, {}, NOW, unavailableFetch)
    ).toEqual({ status: 'disabled', sent: 0, failed: 0, dead: 0 })
    expect(
      await runPushNotifications(
        env.AUTH_DB,
        { ONESIGNAL_APP_ID: configured.ONESIGNAL_APP_ID },
        NOW,
        unavailableFetch
      )
    ).toEqual({ status: 'misconfigured', sent: 0, failed: 0, dead: 0 })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_notification_push_deliveries'
      ).first('count')
    ).toBe(0)
  })

  it('targets the Google identity alias and records a successful receipt', async () => {
    const userId = 'push-success'
    await insertUser(userId)
    const notificationId = await insertNotification(
      userId,
      'LEADERBOARD_REWARD'
    )
    const requests: Request[] = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init))
      return Response.json({ id: 'onesignal-message-1' })
    }

    expect(
      await runPushNotifications(env.AUTH_DB, configured, NOW, fetcher)
    ).toEqual({ status: 'completed', sent: 1, failed: 0, dead: 0 })
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('https://api.onesignal.com/notifications')
    expect(requests[0].headers.get('Authorization')).toBe(
      'Key onesignal-test-api-key'
    )
    const body = (await requests[0].json()) as Record<string, unknown>
    expect(body).toMatchObject({
      app_id: configured.ONESIGNAL_APP_ID,
      include_aliases: { external_id: [userId] },
      target_channel: 'push',
      headings: { en: 'Cloud Weasel' },
      contents: { en: 'Your leaderboard rewards are waiting!' }
    })
    expect(body.idempotency_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempts, provider_message_id, pushed_at
         FROM player_notification_push_deliveries WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first()
    ).toMatchObject({
      status: 'SENT',
      attempts: 1,
      provider_message_id: 'onesignal-message-1',
      pushed_at: NOW.toISOString()
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT pushed_at FROM player_notifications WHERE id = ?'
      )
        .bind(notificationId)
        .first('pushed_at')
    ).toBe(NOW.toISOString())

    expect(
      await runPushNotifications(env.AUTH_DB, configured, NOW, fetcher)
    ).toEqual({ status: 'completed', sent: 0, failed: 0, dead: 0 })
    expect(requests).toHaveLength(1)
  })

  it('reuses the same provider idempotency key across retries', async () => {
    const userId = 'push-retry'
    await insertUser(userId)
    const notificationId = await insertNotification(
      userId,
      'CONQUEST_V2_REWARD'
    )
    const keys: string[] = []
    let calls = 0
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1
      const request = new Request(input, init)
      const body = (await request.json()) as { idempotency_key: string }
      keys.push(body.idempotency_key)
      return calls === 1
        ? Response.json({ errors: ['temporary'] }, { status: 503 })
        : Response.json({})
    }

    expect(
      await runPushNotifications(env.AUTH_DB, configured, NOW, fetcher)
    ).toEqual({ status: 'completed', sent: 0, failed: 1, dead: 0 })
    expect(
      await runPushNotifications(
        env.AUTH_DB,
        configured,
        new Date(NOW.getTime() + 60_000),
        fetcher
      )
    ).toEqual({ status: 'completed', sent: 1, failed: 0, dead: 0 })
    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempts, provider_message_id
         FROM player_notification_push_deliveries WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first()
    ).toEqual({ status: 'SENT', attempts: 2, provider_message_id: null })
  })

  it('dead-letters after five attempts without touching the reward notification', async () => {
    const userId = 'push-dead'
    await insertUser(userId)
    const notificationId = await insertNotification(
      userId,
      'LEADERBOARD_REWARD'
    )
    const fetcher = async () => Response.json({ error: 'nope' }, { status: 500 })

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(
        await runPushNotifications(
          env.AUTH_DB,
          configured,
          new Date(NOW.getTime() + attempt * 60_000),
          fetcher
        )
      ).toMatchObject(
        attempt === 5 ? { dead: 1, failed: 0 } : { dead: 0, failed: 1 }
      )
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempts FROM player_notification_push_deliveries
         WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first()
    ).toEqual({ status: 'DEAD', attempts: 5 })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT pushed_at FROM player_notifications WHERE id = ?'
      )
        .bind(notificationId)
        .first('pushed_at')
    ).toBeNull()
  })

  it('ignores other, disabled, future, and expired in-app notifications', async () => {
    await insertUser('push-filters')
    await insertNotification('push-filters', 'ONE_TIME')
    await insertNotification('push-filters', 'LEADERBOARD_REWARD', {
      pushEnabled: false
    })
    await insertNotification('push-filters', 'LEADERBOARD_REWARD', {
      validFrom: new Date(NOW.getTime() + 60_000).toISOString()
    })
    await insertNotification('push-filters', 'LEADERBOARD_REWARD', {
      expiresAt: new Date(NOW.getTime() - 60_000).toISOString()
    })
    const fetcher = async () => {
      throw new Error('fetch must not run')
    }
    expect(
      await runPushNotifications(env.AUTH_DB, configured, NOW, fetcher)
    ).toEqual({ status: 'completed', sent: 0, failed: 0, dead: 0 })
  })
})
