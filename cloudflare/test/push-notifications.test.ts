import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  dispatchDuePushNotifications,
  handlePushNotificationQueue,
  type PushNotificationQueueMessage
} from '../src/push-notifications'

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
  options: {
    pushEnabled?: boolean
    validFrom?: string
    expiresAt?: string
  } = {}
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

const fakeQueue = () => {
  const bodies: PushNotificationQueueMessage[] = []
  const queue = {
    send: async (body: PushNotificationQueueMessage) => {
      bodies.push(body)
    },
    sendBatch: async (
      messages: Iterable<{ body: PushNotificationQueueMessage }>
    ) => {
      for (const message of messages) bodies.push(message.body)
    }
  } as unknown as Queue<PushNotificationQueueMessage>
  return { queue, bodies }
}

const queueMessage = (
  body: PushNotificationQueueMessage,
  id: string,
  attempts = 1
) => {
  const outcome: {
    acked: boolean
    retried: boolean
    delaySeconds?: number
  } = { acked: false, retried: false }
  const message = {
    id,
    timestamp: NOW,
    body,
    attempts,
    ack: () => {
      outcome.acked = true
    },
    retry: (options?: { delaySeconds?: number }) => {
      outcome.retried = true
      outcome.delaySeconds = options?.delaySeconds
    }
  } as Message<PushNotificationQueueMessage>
  return { message, outcome }
}

const messageBatch = (messages: Message<PushNotificationQueueMessage>[]) =>
  ({
    messages,
    queue: 'cloud-weasel-player-push-delivery',
    metadata: {
      metrics: { backlogCount: messages.length, backlogBytes: 0 }
    },
    ackAll: () => undefined,
    retryAll: () => undefined
  }) as MessageBatch<PushNotificationQueueMessage>

const publish = async (
  userId: string,
  type: 'LEADERBOARD_REWARD' | 'CONQUEST_V2_REWARD'
) => {
  await insertUser(userId)
  const notificationId = await insertNotification(userId, type)
  const queue = fakeQueue()
  await expect(
    dispatchDuePushNotifications(
      env.AUTH_DB,
      { ...configured, PUSH_NOTIFICATION_QUEUE: queue.queue },
      NOW
    )
  ).resolves.toEqual({ status: 'completed', published: 1 })
  expect(queue.bodies).toEqual([
    {
      kind: 'PLAYER_PUSH_NOTIFICATION',
      version: 1,
      notificationId
    }
  ])
  return { notificationId, body: queue.bodies[0] }
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE 'push-%'`),
    env.AUTH_DB.prepare(
      `DELETE FROM player_notifications WHERE user_id LIKE 'push-%'`
    ),
    env.AUTH_DB.prepare('DELETE FROM player_notification_push_deliveries'),
    env.AUTH_DB.prepare('DELETE FROM player_notification_push_failures')
  ])
})

describe('Queue-backed optional OneSignal projection', () => {
  it('is mutation-free when disabled and fails closed on partial config', async () => {
    await insertUser('push-disabled')
    await insertNotification('push-disabled', 'LEADERBOARD_REWARD')
    const queue = fakeQueue()
    await expect(
      dispatchDuePushNotifications(
        env.AUTH_DB,
        { PUSH_NOTIFICATION_QUEUE: queue.queue },
        NOW
      )
    ).resolves.toEqual({ status: 'disabled', published: 0 })
    await expect(
      dispatchDuePushNotifications(
        env.AUTH_DB,
        {
          ONESIGNAL_APP_ID: configured.ONESIGNAL_APP_ID,
          PUSH_NOTIFICATION_QUEUE: queue.queue
        },
        NOW
      )
    ).resolves.toEqual({ status: 'misconfigured', published: 0 })
    expect(queue.bodies).toEqual([])
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_notification_push_deliveries'
      ).first('count')
    ).toBe(0)
  })

  it('publishes only a narrow D1 responsibility and records provider success', async () => {
    const { notificationId, body } = await publish(
      'push-success',
      'LEADERBOARD_REWARD'
    )
    const requests: Request[] = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init))
      return Response.json({ id: 'onesignal-message-1' })
    }
    const message = queueMessage(body, 'push-success-message')
    await handlePushNotificationQueue(
      messageBatch([message.message]),
      env.AUTH_DB,
      configured,
      NOW,
      fetcher
    )
    expect(message.outcome).toEqual({ acked: true, retried: false })
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('https://api.onesignal.com/notifications')
    expect(requests[0].headers.get('Authorization')).toBe(
      'Key onesignal-test-api-key'
    )
    const providerBody = (await requests[0].json()) as Record<string, unknown>
    expect(providerBody).toMatchObject({
      app_id: configured.ONESIGNAL_APP_ID,
      include_aliases: { external_id: ['push-success'] },
      target_channel: 'push',
      headings: { en: 'Cloud Weasel' },
      contents: { en: 'Your leaderboard rewards are waiting!' }
    })
    expect(Object.keys(body).sort()).toEqual([
      'kind',
      'notificationId',
      'version'
    ])
    expect(providerBody.idempotency_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, provider_message_id, pushed_at
         FROM player_notification_push_deliveries WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first()
    ).toEqual({
      status: 'SENT',
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
  })

  it('recovers an ambiguous provider response with the same idempotency key', async () => {
    const { notificationId, body } = await publish(
      'push-ambiguous',
      'CONQUEST_V2_REWARD'
    )
    const keys: string[] = []
    let calls = 0
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1
      const request = new Request(input, init)
      keys.push(
        ((await request.json()) as { idempotency_key: string }).idempotency_key
      )
      if (calls === 1) throw new Error('provider response was lost')
      return Response.json({ id: 'same-provider-result' })
    }
    const first = queueMessage(body, 'ambiguous-first')
    await handlePushNotificationQueue(
      messageBatch([first.message]),
      env.AUTH_DB,
      configured,
      NOW,
      fetcher
    )
    expect(first.outcome).toEqual({
      acked: false,
      retried: true,
      delaySeconds: undefined
    })
    const second = queueMessage(body, 'ambiguous-redrive')
    await handlePushNotificationQueue(
      messageBatch([second.message]),
      env.AUTH_DB,
      configured,
      new Date(NOW.getTime() + 60_000),
      fetcher
    )
    expect(second.outcome).toEqual({ acked: true, retried: false })
    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, provider_message_id
         FROM player_notification_push_deliveries WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first()
    ).toEqual({ status: 'SENT', provider_message_id: 'same-provider-result' })
  })

  it('keeps six provider failures pending and later applies the same responsibility', async () => {
    const { notificationId, body } = await publish(
      'push-unbounded',
      'LEADERBOARD_REWARD'
    )
    const failureFetch = async () =>
      Response.json({ errors: ['temporary'] }, { status: 503 })
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const message = queueMessage(body, `failure-${attempt}`, attempt)
      await handlePushNotificationQueue(
        messageBatch([message.message]),
        env.AUTH_DB,
        configured,
        new Date(NOW.getTime() + attempt * 1_000),
        failureFetch
      )
      expect(message.outcome.retried).toBe(true)
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_notification_push_deliveries
         WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first('status')
    ).toBe('PENDING')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_notification_push_failures
         WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first('count')
    ).toBe(6)
    const recovered = queueMessage(body, 'failure-recovered', 1)
    await handlePushNotificationQueue(
      messageBatch([recovered.message]),
      env.AUTH_DB,
      configured,
      new Date(NOW.getTime() + 7_000),
      async () => Response.json({ id: 'recovered' })
    )
    expect(recovered.outcome.acked).toBe(true)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_notification_push_deliveries
         WHERE notification_id = ?`
      )
        .bind(notificationId)
        .first('status')
    ).toBe('SENT')
  })

  it('isolates a poison notification from another delivery in the same batch', async () => {
    const poison = await publish('push-poison', 'LEADERBOARD_REWARD')
    const healthy = await publish('push-healthy', 'CONQUEST_V2_REWARD')
    const poisonMessage = queueMessage(poison.body, 'poison')
    const healthyMessage = queueMessage(healthy.body, 'healthy')
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const body = (await request.json()) as {
        include_aliases: { external_id: string[] }
      }
      return body.include_aliases.external_id[0] === 'push-poison'
        ? Response.json({ errors: ['poison'] }, { status: 500 })
        : Response.json({ id: 'healthy-provider-message' })
    }
    await handlePushNotificationQueue(
      messageBatch([poisonMessage.message, healthyMessage.message]),
      env.AUTH_DB,
      configured,
      NOW,
      fetcher
    )
    expect(poisonMessage.outcome.retried).toBe(true)
    expect(healthyMessage.outcome.acked).toBe(true)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_notification_push_deliveries
         WHERE notification_id = ?`
      )
        .bind(poison.notificationId)
        .first('status')
    ).toBe('PENDING')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_notification_push_deliveries
         WHERE notification_id = ?`
      )
        .bind(healthy.notificationId)
        .first('status')
    ).toBe('SENT')
  })

  it('redrives stale D1 truth but does not republish a fresh transport observation', async () => {
    const { notificationId } = await publish(
      'push-redrive',
      'LEADERBOARD_REWARD'
    )
    const fresh = fakeQueue()
    await expect(
      dispatchDuePushNotifications(
        env.AUTH_DB,
        { ...configured, PUSH_NOTIFICATION_QUEUE: fresh.queue },
        new Date(NOW.getTime() + 4 * 60_000)
      )
    ).resolves.toEqual({ status: 'completed', published: 0 })
    const stale = fakeQueue()
    await expect(
      dispatchDuePushNotifications(
        env.AUTH_DB,
        { ...configured, PUSH_NOTIFICATION_QUEUE: stale.queue },
        new Date(NOW.getTime() + 5 * 60_000)
      )
    ).resolves.toEqual({ status: 'completed', published: 1 })
    expect(stale.bodies[0].notificationId).toBe(notificationId)
  })

  it('acknowledges tampered, unsupported, expired, and disabled responsibilities without provider access', async () => {
    await insertUser('push-ineligible')
    const unsupported = await insertNotification('push-ineligible', 'ONE_TIME')
    const expired = await insertNotification(
      'push-ineligible',
      'LEADERBOARD_REWARD',
      { expiresAt: new Date(NOW.getTime() - 1).toISOString() }
    )
    const disabled = await insertNotification(
      'push-ineligible',
      'CONQUEST_V2_REWARD',
      { pushEnabled: false }
    )
    const messages = [unsupported, expired, disabled, 999_999].map(
      (id, index) =>
        queueMessage(
          { kind: 'PLAYER_PUSH_NOTIFICATION', version: 1, notificationId: id },
          `ineligible-${index}`
        )
    )
    const tampered = queueMessage(
      {
        kind: 'PLAYER_PUSH_NOTIFICATION',
        version: 1,
        notificationId: expired,
        userId: 'attacker'
      } as unknown as PushNotificationQueueMessage,
      'tampered'
    )
    await handlePushNotificationQueue(
      messageBatch([...messages.map(value => value.message), tampered.message]),
      env.AUTH_DB,
      configured,
      NOW,
      async () => {
        throw new Error('provider must not run')
      }
    )
    for (const message of messages) expect(message.outcome.acked).toBe(true)
    expect(tampered.outcome.acked).toBe(true)
  })
})
