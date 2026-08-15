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

const activateStickerSchedule = async (
  season: number,
  tokenId: number,
  requiredPoints: number
) => {
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO referral_sticker_schedule_versions
         (version, season, status, expected_entry_count, created_by_user_id,
          activated_by_user_id, reason, review_reference, created_at,
          activated_at)
       VALUES (?, ?, 'DRAFT', 1, 'system:test-author', NULL,
               'test schedule', 'test:review', ?, NULL)`
    ).bind(season, season, now),
    env.AUTH_DB.prepare(
      `INSERT INTO referral_sticker_schedule_entries
         (schedule_version, token_id, required_points) VALUES (?, ?, ?)`
    ).bind(season, tokenId, requiredPoints)
  ])
  await env.AUTH_DB.prepare(
    `UPDATE referral_sticker_schedule_versions
     SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
         activated_at = ? WHERE version = ?`
  )
    .bind(now, season)
    .run()
}

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
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS referral_sticker_schedule_versions_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS referral_sticker_schedule_entries_active_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS content_stickers_active_schedule_no_delete'
    )
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM content_notification_templates'),
    env.AUTH_DB.prepare('DELETE FROM referral_sticker_schedule_versions'),
    env.AUTH_DB.prepare('DELETE FROM users'),
    env.AUTH_DB.prepare('DELETE FROM content_banners'),
    env.AUTH_DB.prepare('DELETE FROM content_featured_streamers'),
    env.AUTH_DB.prepare('DELETE FROM content_stickers')
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `CREATE TRIGGER referral_sticker_schedule_versions_no_delete
       BEFORE DELETE ON referral_sticker_schedule_versions
       BEGIN
         SELECT RAISE(ABORT, 'referral sticker schedule versions are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER referral_sticker_schedule_entries_active_no_delete
       BEFORE DELETE ON referral_sticker_schedule_entries
       WHEN EXISTS (
         SELECT 1 FROM referral_sticker_schedule_versions schedule
         WHERE schedule.version = OLD.schedule_version
           AND schedule.status = 'ACTIVE'
       )
       BEGIN
         SELECT RAISE(ABORT, 'active referral sticker schedule entries are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER content_stickers_active_schedule_no_delete
       BEFORE DELETE ON content_stickers
       WHEN EXISTS (
         SELECT 1
         FROM referral_sticker_schedule_entries entry
         JOIN referral_sticker_schedule_versions schedule
           ON schedule.version = entry.schedule_version
         WHERE schedule.status = 'ACTIVE'
           AND schedule.season = OLD.season
           AND entry.token_id = OLD.token_id
       )
       BEGIN
         SELECT RAISE(ABORT, 'active referral sticker metadata is immutable');
       END`
    )
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
        {
          id: expect.any(Number),
          order: 5,
          type: 'INFO',
          color: null,
          msg: 'Cloud Weasel lives',
          dismissable: true,
          startAt: expect.any(String),
          endAt: expect.any(String)
        }
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
    await activateStickerSchedule(season, 77, 25)

    expect((await rpc('GetStickers', {}, false)).status).toBe(401)
    expect(await (await rpc('GetStickers', {})).json()).toEqual({
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
        await rpc('GetStickersBySeason', { season: season + 1 })
      ).json()
    ).toEqual({ stickers: [] })
    expect(
      (
        await rpc(
          'GetStickersBySeason',
          { season: season + 1 },
          false
        )
      ).status
    ).toBe(401)
    await activateStickerSchedule(season + 1, 88, 50)
    expect(
      await (
        await rpc('GetStickersBySeason', { season: season + 1 })
      ).json()
    ).toMatchObject({ stickers: [{ tokenId: 88, requiredPoints: 50 }] })
    expect(
      (await rpc('GetStickersBySeason', { season: -1 })).status
    ).toBe(400)

    expect(
      await (
        await rpc('GetStickerOwnership', {
          accountAddress: 'identity:somebody-else'
        })
      ).json()
    ).toEqual({
      res: { stickerBalances: { 77: { balance: '3', isNew: null } } }
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
      notifications: null
    })
    expect(
      (await rpc('SetNotificationsAsSeen', { notificationIDs: [] })).status
    ).toBe(400)
    expect((await rpc('ListNotifications', {}, false)).status).toBe(401)
  })

  it('normalizes every notification union arm to the generated Go wire', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at)
         VALUES (?, 'LEADERBOARD_REWARD', ?, ?)`
      ).bind(
        userId,
        JSON.stringify({
          leaderboardReward: {
            earnedConstructedPlayerRanks: [{}]
          }
        }),
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at)
         VALUES (?, 'CONQUEST_V2_REWARD', ?, ?)`
      ).bind(
        userId,
        JSON.stringify({ conquestV2Reward: { season: 62, week: 3 } }),
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at)
         VALUES (?, 'SEASON_START', ?, ?)`
      ).bind(
        userId,
        JSON.stringify({ seasonStart: { seasonNumber: 63 } }),
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_notifications
           (user_id, notification_type, payload, created_at)
         VALUES (?, 'SKYPASS_LEVEL_INTRODUCTION', '{}', ?)`
      ).bind(userId, now)
    ])

    expect(await (await rpc('ListNotifications', {})).json()).toEqual({
      notifications: [
        {
          id: expect.any(Number),
          type: 'LEADERBOARD_REWARD',
          leaderboardReward: {
            season: 0,
            week: 0,
            silverCardAmounts: null,
            ticketAmount: 0,
            earnedConstructedPlayerRanks: [
              { playerRank: null, playerRankStage: null }
            ],
            earnedDiscoveryPlayerRanks: null,
            rankedConstructedRank: 0,
            rankedDiscoveryRank: 0
          }
        },
        {
          id: expect.any(Number),
          type: 'CONQUEST_V2_REWARD',
          conquestV2Reward: {
            season: 62,
            week: 3,
            treasureLevel: 0,
            amountUSDC: 0,
            silverCardAmounts: null
          }
        },
        {
          id: expect.any(Number),
          type: 'SEASON_START',
          seasonStart: { seasonNumber: 63, seasonName: '' }
        },
        {
          id: expect.any(Number),
          type: 'SKYPASS_LEVEL_INTRODUCTION'
        }
      ]
    })
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
