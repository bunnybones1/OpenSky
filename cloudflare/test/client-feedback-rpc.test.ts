import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { feedbackPrefixForUser } from '../src/client-feedback'

const testEnv = env as unknown as Env
const userId = 'feedback-user'
const prefix = feedbackPrefixForUser(userId)

const rpc = async (
  body: unknown,
  signedIn = true,
  headersInit?: HeadersInit
) => {
  const headers = new Headers(headersInit)
  headers.set('Content-Type', 'application/json')
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(
      'https://opensky.example/api/rpc/SkyWeaverAPI/RecordGameClientFeedback',
      {
        method: 'POST',
        headers,
        body: typeof body === 'string' ? body : JSON.stringify(body)
      }
    ),
    testEnv
  )
}

const clearFeedback = async () => {
  while (true) {
    const listed = await env.CLIENT_FEEDBACK.list({ prefix })
    const keys = listed.objects.map(object => object.key)
    if (!keys.length) return
    await env.CLIENT_FEEDBACK.delete(keys)
  }
}

beforeEach(async () => {
  await clearFeedback()
  await env.AUTH_DB.prepare(
    `DELETE FROM client_feedback_rate_limits WHERE user_id = ?`
  )
    .bind(userId)
    .run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT OR IGNORE INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Feedback Player', 'feedback@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
})

describe('source client-feedback RPC on private R2', () => {
  it('requires a Google identity session', async () => {
    const response = await rpc(
      { req: { sentiment: 'positive', dump: {}, screenshotImageURI: '' } },
      false
    )
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      code: 'webrpc.unauthenticated'
    })
  })

  it('fails closed when the production R2 binding is absent', async () => {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    const response = await handleApiRequest(
      new Request(
        'https://opensky.example/api/rpc/SkyWeaverAPI/RecordGameClientFeedback',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `${IDENTITY_SESSION_COOKIE}=${token}`
          },
          body: JSON.stringify({
            req: { sentiment: 'positive', dump: {}, screenshotImageURI: '' }
          })
        }
      ),
      { ...testEnv, CLIENT_FEEDBACK: undefined }
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      code: 'webrpc.unavailable'
    })
  })

  it('stores feedback JSON under a private identity-scoped key', async () => {
    const response = await rpc({
      req: {
        sentiment: 'Positive',
        timestamp: '2000-01-01T00:00:00.000Z',
        dump: { release: 'cloudflare', match: 42 },
        screenshotImageURI: ''
      }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: true })

    const listed = await env.CLIENT_FEEDBACK.list({ prefix })
    expect(listed.objects).toHaveLength(1)
    expect(listed.objects[0].key).toMatch(
      /^client-feedback\/feedback-user\/\d{4}-\d{2}\/positive\/.*\.json$/
    )
    const object = await env.CLIENT_FEEDBACK.get(listed.objects[0].key)
    expect(await object?.text()).toBe('{"release":"cloudflare","match":42}')
    expect(object?.httpMetadata?.contentType).toBe(
      'application/json; charset=utf-8'
    )
    expect(object?.customMetadata).toMatchObject({
      userId,
      sentiment: 'positive'
    })
  })

  it('stores a validated JPEG beside its JSON record', async () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
    const response = await rpc({
      req: {
        sentiment: 'negative',
        timestamp: new Date().toISOString(),
        dump: { error: 'render failed' },
        screenshotImageURI: btoa(String.fromCharCode(...jpeg))
      }
    })
    expect(response.status).toBe(200)

    const listed = await env.CLIENT_FEEDBACK.list({ prefix })
    expect(listed.objects.map(object => object.key).sort()).toEqual([
      expect.stringMatching(/\.jpeg$/),
      expect.stringMatching(/\.json$/)
    ])
    const screenshot = await env.CLIENT_FEEDBACK.get(
      listed.objects.find(object => object.key.endsWith('.jpeg'))!.key
    )
    expect(new Uint8Array(await screenshot!.arrayBuffer())).toEqual(jpeg)
    expect(screenshot?.httpMetadata?.contentType).toBe('image/jpeg')
  })

  it('uses collision-resistant keys for submissions in the same instant', async () => {
    const body = {
      req: {
        sentiment: 'neutral',
        timestamp: new Date().toISOString(),
        dump: { state: 'same' },
        screenshotImageURI: ''
      }
    }
    expect((await rpc(body)).status).toBe(200)
    expect((await rpc(body)).status).toBe(200)
    const listed = await env.CLIENT_FEEDBACK.list({ prefix })
    expect(new Set(listed.objects.map(object => object.key)).size).toBe(2)
  })

  it('bounds each identity to ten stored submissions per hour', async () => {
    const body = {
      req: {
        sentiment: 'neutral',
        timestamp: new Date().toISOString(),
        dump: { state: 'bounded' },
        screenshotImageURI: ''
      }
    }
    for (let index = 0; index < 10; index += 1) {
      expect((await rpc(body)).status).toBe(200)
    }
    const limited = await rpc(body)
    expect(limited.status).toBe(400)
    expect(await limited.json()).toMatchObject({
      msg: 'feedback submission limit reached'
    })
    expect((await env.CLIENT_FEEDBACK.list({ prefix })).objects).toHaveLength(
      10
    )
  })

  it('keeps the same ten-upload limit under concurrent submissions', async () => {
    const body = {
      req: {
        sentiment: 'neutral',
        timestamp: new Date().toISOString(),
        dump: { state: 'concurrent' },
        screenshotImageURI: ''
      }
    }
    const responses = await Promise.all(
      Array.from({ length: 12 }, () => rpc(body))
    )
    expect(responses.filter(response => response.status === 200)).toHaveLength(
      10
    )
    expect(responses.filter(response => response.status === 400)).toHaveLength(
      2
    )
    expect((await env.CLIENT_FEEDBACK.list({ prefix })).objects).toHaveLength(
      10
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT submission_count FROM client_feedback_rate_limits
         WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ submission_count: 10 })
  })

  it('opens a fresh window after one hour and guards direct counter edits', async () => {
    await env.AUTH_DB.prepare(
      `INSERT INTO client_feedback_rate_limits
         (user_id, window_started_at, submission_count)
       VALUES (?, ?, 10)`
    )
      .bind(userId, new Date(Date.now() - 61 * 60 * 1000).toISOString())
      .run()
    const response = await rpc({
      req: {
        sentiment: 'positive',
        timestamp: new Date().toISOString(),
        dump: { state: 'new-window' },
        screenshotImageURI: ''
      }
    })
    expect(response.status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT submission_count FROM client_feedback_rate_limits
         WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ submission_count: 1 })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE client_feedback_rate_limits SET submission_count = 9
         WHERE user_id = ?`
      )
        .bind(userId)
        .run()
    ).rejects.toThrow(/Invalid client feedback rate transition/)
  })

  it('rejects malformed or excessive data without storing an object', async () => {
    const invalidCases = [
      { req: { sentiment: '../escape', dump: {}, screenshotImageURI: '' } },
      { req: { sentiment: 'positive', dump: [], screenshotImageURI: '' } },
      {
        req: {
          sentiment: 'positive',
          dump: {},
          screenshotImageURI: btoa('not a jpeg')
        }
      },
      {
        req: {
          sentiment: 'positive',
          dump: { data: 'x'.repeat(512 * 1024) },
          screenshotImageURI: ''
        }
      }
    ]
    for (const body of invalidCases) {
      expect((await rpc(body)).status).toBe(400)
    }
    expect((await env.CLIENT_FEEDBACK.list({ prefix })).objects).toHaveLength(0)
  })

  it('rejects an excessive declared request before parsing', async () => {
    const response = await rpc('{}', true, {
      'Content-Length': String(8 * 1024 * 1024 + 1)
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      msg: 'feedback request is too large'
    })
  })
})
