import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { ContentRepository } from '../src/content'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const userId = 'content-player-user-id'

const rpc = async (method: string, body: object, signedIn = true) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    testEnv
  )
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM content_notification_templates'),
    env.AUTH_DB.prepare('DELETE FROM users'),
    env.AUTH_DB.prepare('DELETE FROM content_banners'),
    env.AUTH_DB.prepare('DELETE FROM content_featured_streamers'),
    env.AUTH_DB.prepare('DELETE FROM content_stickers')
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Content Player', 'content-player@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('source content RPC compatibility', () => {
  it('filters banners by validity and lists configured featured streamers', async () => {
    const now = Date.now()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO content_banners
           (order_by, banner_type, message, dismissable, start_at, end_at)
         VALUES (5, 'INFO', 'Cloud Weasel lives', 1, ?, ?)`
      ).bind(
        new Date(now - 60_000).toISOString(),
        new Date(now + 60_000).toISOString()
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO content_banners
           (order_by, banner_type, message, dismissable, end_at)
         VALUES (9, 'WARNING', 'Expired', 0, ?)`
      ).bind(new Date(now - 1).toISOString()),
      env.AUTH_DB.prepare(
        `INSERT INTO content_featured_streamers (username) VALUES ('weasel_tv')`
      )
    ])

    const banners = await rpc('GetBanners', {}, false)
    expect(banners.status).toBe(200)
    expect(await banners.json()).toEqual({
      banners: [
        expect.objectContaining({
          order: 5,
          type: 'INFO',
          msg: 'Cloud Weasel lives',
          dismissable: true
        })
      ]
    })
    expect(await (await rpc('GetFeaturedStreamers', {}, false)).json()).toEqual(
      { streamers: [{ username: 'weasel_tv' }] }
    )
  })

  it('serves source sticker metadata and identity-owned balances', async () => {
    const season = seasonFromDate()
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO content_stickers (token_id, required_points, season)
         VALUES (77, 25, ?)`
      ).bind(season),
      env.AUTH_DB.prepare(
        `INSERT INTO content_stickers (token_id, required_points, season)
         VALUES (88, 50, ?)`
      ).bind(season + 1),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_STICKERS', 77, 3, 1, 'test', ?, ?)`
      ).bind(userId, now, now)
    ])

    expect(await (await rpc('GetStickers', {}, false)).json()).toEqual({
      stickers: [
        {
          id: expect.any(Number),
          name: '',
          requiredPoints: 25,
          asset: '',
          tokenId: 77,
          season
        }
      ]
    })
    expect(
      await (
        await rpc('GetStickersBySeason', { season: season + 1 }, false)
      ).json()
    ).toMatchObject({ stickers: [{ tokenId: 88, requiredPoints: 50 }] })
    expect(
      (await rpc('GetStickersBySeason', { season: -1 }, false)).status
    ).toBe(400)

    expect(
      await (
        await rpc('GetStickerOwnership', {
          accountAddress: 'identity:somebody-else'
        })
      ).json()
    ).toEqual({
      res: { stickerBalances: { 77: { balance: '3', isNew: false } } }
    })
    expect((await rpc('GetStickerOwnership', {}, false)).status).toBe(401)
  })

  it('lists only valid unseen notifications and marks owned IDs as seen', async () => {
    const now = Date.now()
    const validPayload = JSON.stringify({
      oneTime: { id: 9, name: 'migration', data: { message: 'hello' } }
    })
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at, valid_from,
            expires_at)
         VALUES (?, 'ONE_TIME', ?, ?, ?, ?)`
      ).bind(
        userId,
        validPayload,
        new Date(now - 2_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now + 60_000).toISOString()
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at, valid_from)
         VALUES (?, 'SEASON_START', '{}', ?, ?)`
      ).bind(
        userId,
        new Date(now).toISOString(),
        new Date(now + 60_000).toISOString()
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at, expires_at)
         VALUES (?, 'SKYPASS_LEVEL_INTRODUCTION', '{}', ?, ?)`
      ).bind(
        userId,
        new Date(now - 60_000).toISOString(),
        new Date(now - 1).toISOString()
      )
    ])

    const listed = await rpc('ListNotifications', {})
    expect(listed.status).toBe(200)
    const notifications = (
      await listed.json<{
        notifications: Array<{ id: number; type: string; oneTime: unknown }>
      }>()
    ).notifications
    expect(notifications).toEqual([
      {
        id: expect.any(Number),
        type: 'ONE_TIME',
        oneTime: { id: 9, name: 'migration', data: { message: 'hello' } }
      }
    ])

    expect(
      await (
        await rpc('SetNotificationsAsSeen', {
          notificationIDs: [notifications[0].id]
        })
      ).json()
    ).toEqual({ status: true })
    expect(await (await rpc('ListNotifications', {})).json()).toEqual({
      notifications: []
    })
    expect(
      (await rpc('SetNotificationsAsSeen', { notificationIDs: [] })).status
    ).toBe(400)
    expect((await rpc('ListNotifications', {}, false)).status).toBe(401)
  })

  it('materializes each eligible one-time template exactly once', async () => {
    const now = Date.now()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(`UPDATE users SET created_at = ? WHERE id = ?`).bind(
        new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        userId
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO content_notification_templates
           (name, data_json, filter_json, valid_from, expires_at,
            created_at, updated_at)
         VALUES ('Eligible', '{"title":"Hello"}',
                 '{"age":[{">":"1h"}]}', ?, ?, ?, ?),
                ('Too new', '{"title":"Later"}',
                 '{"age":[{"<":"1h"}]}', ?, ?, ?, ?)`
      ).bind(
        new Date(now - 1_000).toISOString(),
        new Date(now + 60_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now + 60_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now - 1_000).toISOString()
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO content_notification_templates
           (name, data_json, filter_json, valid_from, expires_at,
            created_at, updated_at)
         VALUES ('Identity match', '{"title":"Identity"}',
                 ?,
                 ?, ?, ?, ?)`
      ).bind(
        JSON.stringify({
          address: [{ '==': `identity:${userId}` }],
          created_at: [
            {
              '<=': new Date(now + 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)
            }
          ]
        }),
        new Date(now - 1_000).toISOString(),
        new Date(now + 60_000).toISOString(),
        new Date(now - 1_000).toISOString(),
        new Date(now - 1_000).toISOString()
      )
    ])
    const first = await rpc('ListNotifications', {})
    expect(await first.json()).toMatchObject({
      notifications: [
        {
          type: 'ONE_TIME',
          oneTime: { name: 'Eligible', data: { title: 'Hello' } }
        },
        {
          type: 'ONE_TIME',
          oneTime: { name: 'Identity match', data: { title: 'Identity' } }
        }
      ]
    })
    const second = await rpc('ListNotifications', {})
    expect(await second.json()).toMatchObject({
      notifications: [
        { oneTime: { name: 'Eligible' } },
        { oneTime: { name: 'Identity match' } }
      ]
    })
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM player_notifications
           WHERE notification_template_id IS NOT NULL`
        ).first<{ count: number }>()
      )?.count
    ).toBe(2)
  })

  it('reissues only after a prior template delivery expires and is revised', async () => {
    const now = Date.now()
    const initialExpiry = new Date(now + 1_000).toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO content_notification_templates
         (name, data_json, valid_from, expires_at, created_at, updated_at)
       VALUES ('Revision', '{"title":"First"}', ?, ?, ?, ?)`
    )
      .bind(
        new Date(now - 1_000).toISOString(),
        initialExpiry,
        new Date(now - 1_000).toISOString(),
        new Date(now - 1_000).toISOString()
      )
      .run()
    expect(await (await rpc('ListNotifications', {})).json()).toMatchObject({
      notifications: [{ oneTime: { data: { title: 'First' } } }]
    })
    await env.AUTH_DB.prepare(
      `UPDATE content_notification_templates
       SET data_json = '{"title":"Second"}', expires_at = ?, updated_at = ?,
           revision = revision + 1
       WHERE name = 'Revision'`
    )
      .bind(
        new Date(now + 60_000).toISOString(),
        new Date(now + 500).toISOString()
      )
      .run()
    // The source suppresses a revised definition while its previous delivery
    // is still valid.
    expect(await (await rpc('ListNotifications', {})).json()).toMatchObject({
      notifications: [{ oneTime: { data: { title: 'First' } } }]
    })
    // Once the old delivery expires, the still-valid revised template issues
    // once under its new revision key.
    const afterExpiry = new Date(now + 2_000)
    const content = new ContentRepository(env.AUTH_DB)
    expect(await content.listNotifications(userId, afterExpiry)).toMatchObject([
      { oneTime: { data: { title: 'Second' } } }
    ])
    expect(await content.listNotifications(userId, afterExpiry)).toMatchObject([
      { oneTime: { data: { title: 'Second' } } }
    ])
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM player_notifications
           WHERE notification_template_id IS NOT NULL`
        ).first<{ count: number }>()
      )?.count
    ).toBe(2)
  })
})
