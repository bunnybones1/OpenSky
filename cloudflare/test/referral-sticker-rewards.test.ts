import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { seasonFromDate, seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import { runReferralStickerRewards } from '../src/referral-sticker-rewards'
import { SocialRepository } from '../src/social'

const SEASON = 10
const NOW = new Date(seasonStart(SEASON).getTime() + 2 * 24 * 60 * 60 * 1000)
const DUE = new Date(NOW.getTime() + 23 * 60 * 60 * 1000)
const inviterId = 'sticker-inviter'
const firstFriendId = 'sticker-friend-1'
const secondFriendId = 'sticker-friend-2'

const addUser = async (userId: string) => {
  const createdAt = NOW.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, createdAt, createdAt)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
}

const setupRewards = async () => {
  await Promise.all([
    addUser(inviterId),
    addUser(firstFriendId),
    addUser(secondFriendId)
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO player_invites
         (invitee_user_id, inviter_user_id, created_at)
       VALUES (?, ?, ?), (?, ?, ?)`
    ).bind(
      firstFriendId,
      inviterId,
      NOW.toISOString(),
      secondFriendId,
      inviterId,
      NOW.toISOString()
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO player_friend_points
         (invitee_user_id, inviter_user_id, season, levels, points_carried,
          points_spent, updated_at)
       VALUES (?, ?, ?, 20, 0, 0, ?), (?, ?, ?, 15, 0, 0, ?)`
    ).bind(
      firstFriendId,
      inviterId,
      SEASON,
      NOW.toISOString(),
      secondFriendId,
      inviterId,
      SEASON,
      NOW.toISOString()
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_STICKER_POINTS', 0, 35, 0, 'test', ?, ?)`
    ).bind(inviterId, NOW.toISOString(), NOW.toISOString()),
    env.AUTH_DB.prepare(
      `INSERT INTO content_stickers (token_id, required_points, season)
       VALUES (101, 10, ?), (102, 20, ?), (103, 30, ?)`
    ).bind(SEASON, SEASON, SEASON)
  ])
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS reject_referral_sticker_delivery'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS referral_sticker_reward_awards_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS referral_sticker_reward_batches_no_delete'
    )
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM referral_sticker_reward_awards'),
    env.AUTH_DB.prepare('DELETE FROM referral_sticker_reward_batches'),
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE 'sticker-%'`),
    env.AUTH_DB.prepare('DELETE FROM content_stickers')
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `CREATE TRIGGER referral_sticker_reward_awards_no_delete
       BEFORE DELETE ON referral_sticker_reward_awards
       BEGIN
         SELECT RAISE(ABORT, 'referral sticker reward awards are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER referral_sticker_reward_batches_no_delete
       BEFORE DELETE ON referral_sticker_reward_batches
       BEGIN
         SELECT RAISE(ABORT, 'referral sticker reward batches are immutable');
       END`
    )
  ])
})

describe('off-chain referral sticker rewards', () => {
  it('is a read-only no-op when no seasonal content is configured', async () => {
    expect(seasonFromDate(NOW)).toBe(SEASON)
    expect(await runReferralStickerRewards(env.AUTH_DB, NOW)).toEqual({
      status: 'no_content',
      prepared: 0,
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM referral_sticker_reward_batches'
      ).first('count')
    ).toBe(0)
  })

  it('preserves thresholds and friend attribution, then delivers D1 inventory', async () => {
    await setupRewards()

    expect(await runReferralStickerRewards(env.AUTH_DB, NOW)).toEqual({
      status: 'processed',
      prepared: 1,
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, total_cost, previous_cost, points_deducted, deliver_at
         FROM referral_sticker_reward_batches`
      ).first()
    ).toEqual({
      status: 'PENDING',
      total_cost: 30,
      previous_cost: 0,
      points_deducted: 30,
      deliver_at: DUE.toISOString()
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS'`
      )
        .bind(inviterId)
        .first('balance')
    ).toBe(5)
    expect(
      (await new SocialRepository(env.AUTH_DB).getFriendPoints(inviterId, NOW))
        .total
    ).toBe(35)
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT invitee_user_id, points_spent FROM player_friend_points
           WHERE inviter_user_id = ? AND season = ?
           ORDER BY invitee_user_id`
        )
          .bind(inviterId, SEASON)
          .all()
      ).results
    ).toEqual([
      { invitee_user_id: firstFriendId, points_spent: 20 },
      { invitee_user_id: secondFriendId, points_spent: 10 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM referral_sticker_reward_awards'
      ).first('count')
    ).toBe(3)

    expect(await runReferralStickerRewards(env.AUTH_DB, NOW)).toMatchObject({
      prepared: 0,
      delivered: 0
    })
    expect(await runReferralStickerRewards(env.AUTH_DB, DUE)).toEqual({
      status: 'processed',
      prepared: 0,
      delivered: 1
    })
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT token_id, balance, unlock_source FROM player_items
           WHERE user_id = ? AND item_type = 'SW_STICKERS'
           ORDER BY token_id`
        )
          .bind(inviterId)
          .all()
      ).results
    ).toEqual([
      { token_id: 101, balance: 100, unlock_source: 'referral-sticker-reward' },
      { token_id: 102, balance: 100, unlock_source: 'referral-sticker-reward' },
      { token_id: 103, balance: 100, unlock_source: 'referral-sticker-reward' }
    ])
    expect(await runReferralStickerRewards(env.AUTH_DB, DUE)).toMatchObject({
      prepared: 0,
      delivered: 0
    })
  })

  it('is safe under concurrent preparation', async () => {
    await setupRewards()

    await Promise.all([
      runReferralStickerRewards(env.AUTH_DB, NOW),
      runReferralStickerRewards(env.AUTH_DB, NOW)
    ])

    expect(
      await env.AUTH_DB.prepare(
        `SELECT (SELECT COUNT(*) FROM referral_sticker_reward_batches) AS batches,
                (SELECT COUNT(*) FROM referral_sticker_reward_awards) AS awards,
                (SELECT balance FROM player_items
                 WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS') AS points`
      )
        .bind(inviterId)
        .first()
    ).toEqual({ batches: 1, awards: 3, points: 5 })
  })

  it('preserves source support for zero-point promotional stickers', async () => {
    await addUser(inviterId)
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_STICKER_POINTS', 0, 0, 0, 'test', ?, ?)`
      ).bind(inviterId, NOW.toISOString(), NOW.toISOString()),
      env.AUTH_DB.prepare(
        `INSERT INTO content_stickers (token_id, required_points, season)
         VALUES (100, 0, ?)`
      ).bind(SEASON)
    ])

    expect(await runReferralStickerRewards(env.AUTH_DB, NOW)).toMatchObject({
      prepared: 1
    })
    expect(await runReferralStickerRewards(env.AUTH_DB, DUE)).toMatchObject({
      delivered: 1
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKERS' AND token_id = 100`
      )
        .bind(inviterId)
        .first('balance')
    ).toBe(100)
  })

  it('rolls a failed delivery back for a clean retry', async () => {
    await setupRewards()
    await runReferralStickerRewards(env.AUTH_DB, NOW)
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_referral_sticker_delivery
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source = 'referral-sticker-reward'
       BEGIN
         SELECT RAISE(ABORT, 'injected referral sticker delivery failure');
       END`
    ).run()

    await expect(runReferralStickerRewards(env.AUTH_DB, DUE)).rejects.toThrow(
      'injected referral sticker delivery failure'
    )
    expect(
      await env.AUTH_DB.prepare(
        'SELECT status, delivery_token FROM referral_sticker_reward_batches'
      ).first()
    ).toEqual({ status: 'PENDING', delivery_token: null })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKERS'`
      )
        .bind(inviterId)
        .first('count')
    ).toBe(0)

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_referral_sticker_delivery'
    ).run()
    expect(await runReferralStickerRewards(env.AUTH_DB, DUE)).toMatchObject({
      delivered: 1
    })
  })

  it('pauses prepared delivery while the account is sanctioned', async () => {
    await setupRewards()
    await runReferralStickerRewards(env.AUTH_DB, NOW)
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings SET account_status = 'SUSPENDED'
       WHERE user_id = ?`
    )
      .bind(inviterId)
      .run()

    expect(await runReferralStickerRewards(env.AUTH_DB, DUE)).toMatchObject({
      delivered: 0
    })
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings SET account_status = 'ACTIVE'
       WHERE user_id = ?`
    )
      .bind(inviterId)
      .run()
    expect(await runReferralStickerRewards(env.AUTH_DB, DUE)).toMatchObject({
      delivered: 1
    })
  })
})
