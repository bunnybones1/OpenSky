import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'
import { runDueSkypassAutoClaims } from '../src/skypass-auto-claim'

const SEASON = 10
const DUE = new Date(seasonStart(SEASON + 1).getTime() + 10_000)

const setupPlayer = async (userId: string, premium = false) => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  if (premium) {
    await env.AUTH_DB.prepare(
      `INSERT INTO player_skypass_season_stats
         (user_id, season, has_premium, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`
    )
      .bind(userId, SEASON, now, now)
      .run()
  }
}

const addReward = async (tier: 1 | 2, amount: number, level = 1) => {
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO skypass_rewards
       (level, season, tier, item_type, amount, is_starter, attributes,
        updated_at, is_infinite)
     VALUES (?, ?, ?, 303, ?, 0, NULL, ?, 0)
     RETURNING id`
  )
    .bind(level, SEASON, tier, amount, new Date().toISOString())
    .first<{ id: number }>()
  return result!.id
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  await env.AUTH_DB.prepare('DELETE FROM skypass_season_close_cycles').run()
  await env.AUTH_DB.prepare(
    'DELETE FROM skypass_rewards WHERE season != 62'
  ).run()
})

describe('SkyPass season auto-claim', () => {
  it('delivers free and entitled premium rewards off chain exactly once', async () => {
    await setupPlayer('free-player')
    await setupPlayer('premium-player', true)
    const freeReward = await addReward(1, 5)
    const premiumReward = await addReward(2, 7)

    const premiumListing = await new PlayerRpcRepository(
      env.AUTH_DB
    ).listSkypassRewards('premium-player', SEASON)
    expect(
      premiumListing.levels
        .flatMap(level => level.rewards)
        .find(reward => reward.id === premiumReward)
    ).toMatchObject({ tier: 'PREMIUM', claimable: true })

    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 1,
      seasonsCompleted: 1,
      playersProcessed: 2,
      rewardsClaimed: 3,
      failures: 0
    })

    const inventory = await env.AUTH_DB.prepare(
      `SELECT user_id, balance FROM player_items
       WHERE item_type = 'SW_STICKER_POINTS' AND token_id = 0
       ORDER BY user_id`
    ).all<{ user_id: string; balance: number }>()
    expect(inventory.results).toEqual([
      { user_id: 'free-player', balance: 5 },
      { user_id: 'premium-player', balance: 12 }
    ])

    const claims = await env.AUTH_DB.prepare(
      `SELECT user_id, reward_id, auto_claim_season
       FROM player_skypass_claims ORDER BY user_id, reward_id`
    ).all<{
      user_id: string
      reward_id: number
      auto_claim_season: number
    }>()
    expect(claims.results).toEqual([
      {
        user_id: 'free-player',
        reward_id: freeReward,
        auto_claim_season: SEASON
      },
      {
        user_id: 'premium-player',
        reward_id: freeReward,
        auto_claim_season: SEASON
      },
      {
        user_id: 'premium-player',
        reward_id: premiumReward,
        auto_claim_season: SEASON
      }
    ])

    const receipts = await env.AUTH_DB.prepare(
      `SELECT user_id, claimed_reward_count
       FROM player_skypass_auto_claims ORDER BY user_id`
    ).all<{ user_id: string; claimed_reward_count: number }>()
    expect(receipts.results).toEqual([
      { user_id: 'free-player', claimed_reward_count: 1 },
      { user_id: 'premium-player', claimed_reward_count: 2 }
    ])
    const notifications = await env.AUTH_DB.prepare(
      `SELECT user_id, payload FROM player_notifications
       WHERE skypass_auto_claim_season = ? ORDER BY user_id`
    )
      .bind(SEASON)
      .all<{ user_id: string; payload: string }>()
    expect(notifications.results).toHaveLength(2)
    expect(JSON.parse(notifications.results[0].payload)).toMatchObject({
      oneTime: {
        name: 'Autoclaimed Rewards',
        data: { title: expect.stringContaining('AUTO-CLAIMED') }
      }
    })

    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 0,
      seasonsCompleted: 0,
      playersProcessed: 0,
      rewardsClaimed: 0,
      failures: 0
    })
    const unchanged = await env.AUTH_DB.prepare(
      `SELECT SUM(balance) AS balance FROM player_items
       WHERE item_type = 'SW_STICKER_POINTS'`
    ).first<{ balance: number }>()
    expect(unchanged?.balance).toBe(17)
  })

  it('waits for the source close boundary and resumes bounded reward batches', async () => {
    await setupPlayer('batch-player')
    for (let reward = 0; reward < 6; reward++) {
      await addReward(1, 1, reward + 1)
    }
    await env.AUTH_DB.prepare(
      `UPDATE player_progression SET basic_skypass_level = 6
       WHERE user_id = 'batch-player'`
    ).run()

    const early = new Date(DUE.getTime() - 1)
    expect(await runDueSkypassAutoClaims(env.AUTH_DB, early)).toEqual({
      cyclesCreated: 0,
      seasonsCompleted: 0,
      playersProcessed: 0,
      rewardsClaimed: 0,
      failures: 0
    })

    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 1,
      seasonsCompleted: 0,
      playersProcessed: 0,
      rewardsClaimed: 5,
      failures: 0
    })
    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 0,
      seasonsCompleted: 1,
      playersProcessed: 1,
      rewardsClaimed: 1,
      failures: 0
    })

    const inventory = await env.AUTH_DB.prepare(
      `SELECT balance FROM player_items
       WHERE user_id = 'batch-player'
         AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
    ).first<{ balance: number }>()
    expect(inventory?.balance).toBe(6)
    const notificationCount = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_notifications
       WHERE user_id = 'batch-player' AND skypass_auto_claim_season = ?`
    )
      .bind(SEASON)
      .first<{ count: number }>()
    expect(notificationCount?.count).toBe(1)
  })

  it('records malformed reward failures and stops after five attempts', async () => {
    await setupPlayer('broken-player')
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, is_infinite)
       VALUES (1, ?, 1, 999, 1, 0, NULL, ?, 0)`
    )
      .bind(SEASON, new Date().toISOString())
      .run()

    for (let attempt = 1; attempt <= 5; attempt++) {
      const run = await runDueSkypassAutoClaims(env.AUTH_DB, DUE)
      expect(run.failures).toBe(1)
      expect(run.seasonsCompleted).toBe(attempt === 5 ? 1 : 0)
    }
    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 0,
      seasonsCompleted: 0,
      playersProcessed: 0,
      rewardsClaimed: 0,
      failures: 0
    })
    const failure = await env.AUTH_DB.prepare(
      `SELECT attempts, last_error FROM player_skypass_auto_claim_failures
       WHERE user_id = 'broken-player' AND season = ?`
    )
      .bind(SEASON)
      .first<{ attempts: number; last_error: string }>()
    expect(failure).toEqual({
      attempts: 5,
      last_error: 'unsupported item type UNKNOWN'
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_skypass_auto_claim_failures SET attempts = 1
         WHERE user_id = 'broken-player' AND season = ?`
      )
        .bind(SEASON)
        .run()
    ).rejects.toThrow('Invalid SkyPass auto-claim failure transition')
  })

  it('keeps concurrent scheduled delivery idempotent', async () => {
    await setupPlayer('concurrent-player')
    await addReward(1, 9)

    const runs = await Promise.all([
      runDueSkypassAutoClaims(env.AUTH_DB, DUE),
      runDueSkypassAutoClaims(env.AUTH_DB, DUE)
    ])
    expect(runs.every(run => run.failures === 0)).toBe(true)

    const inventory = await env.AUTH_DB.prepare(
      `SELECT balance FROM player_items
       WHERE user_id = 'concurrent-player'
         AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
    ).first<{ balance: number }>()
    expect(inventory?.balance).toBe(9)
    const counts = await env.AUTH_DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM player_skypass_claims
          WHERE user_id = 'concurrent-player') AS claims,
         (SELECT COUNT(*) FROM player_skypass_auto_claims
          WHERE user_id = 'concurrent-player') AS completions,
         (SELECT COUNT(*) FROM player_notifications
          WHERE user_id = 'concurrent-player'
            AND skypass_auto_claim_season = ?) AS notifications`
    )
      .bind(SEASON)
      .first<{ claims: number; completions: number; notifications: number }>()
    expect(counts).toEqual({ claims: 1, completions: 1, notifications: 1 })
  })
})
