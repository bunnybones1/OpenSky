import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'
import { runDueSkypassAutoClaims } from '../src/skypass-auto-claim'
import {
  clearTestSkypassPolicies,
  createTestSkypassPolicy
} from './helpers/skypass-policy'

const SEASON = 10
const DUE = new Date(seasonStart(SEASON + 1).getTime() + 10_000)

const setupPlayer = async (
  userId: string,
  premium = false,
  achievedAccountLevel: number | null = 1
) => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  if (achievedAccountLevel !== null) {
    await env.AUTH_DB.prepare(
      `INSERT INTO player_skypass_season_stats
         (user_id, season, has_premium, created_at, updated_at,
          initial_account_level, achieved_account_level)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    )
      .bind(userId, SEASON, premium ? 1 : 0, now, now, achievedAccountLevel)
      .run()
  }
}

const stageUnpublishedExperience = async (userId: string) => {
  const proposalId = `skypass-pending-xp-${crypto.randomUUID()}`
  const settlementToken = crypto.randomUUID()
  const beforeAt = '2026-08-21T15:54:00.000Z'
  const stagedAt = '2026-08-21T15:54:01.000Z'
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE player_profiles
       SET level = 1, xp = 170, next_level_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(beforeAt, userId),
    env.AUTH_DB.prepare(
      `UPDATE player_progression
       SET basic_skypass_level = 1, basic_skypass_xp = 170,
           basic_skypass_next_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(beforeAt, userId),
    ...['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'].map(mode =>
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, ?, ?, 0, 'WANDERER', 'STAGE_I', '[1,1750,350,0]', ?, ?)`
      ).bind(userId, mode, SEASON, beforeAt, beforeAt)
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
          player1_principal, player2_principal, player1_user_id,
          player2_user_id, match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, 'PRACTICE_PVP', 'PRACTICE_PVP', 'PRACTICE_PVP',
               'skypass-auto-claim-test', ?, ?, ?, NULL, '{}', 'active', ?, ?)`
    ).bind(
      proposalId,
      `${proposalId}-replay`,
      `identity:${userId}`,
      `identity:bot:${proposalId}`,
      userId,
      stagedAt,
      stagedAt
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_experience_players
         (proposal_id, player_index, user_id, season, settlement_token,
          experience_gain, before_level, before_xp, before_skypass_level,
          before_skypass_xp, season_stats_existed_before,
          season_initial_account_level_before,
          season_achieved_account_level_before, profile_updated_at_before,
          after_level, after_xp, ranked_constructed_before,
          ranked_discovery_before, inviter_user_id,
          inviter_levels_before, inviter_sticker_points_before,
          inviter_sticker_points_existed_before,
          inviter_sticker_points_created_at_before,
          inviter_sticker_points_updated_at_before, rewards_json, processed_at)
       VALUES (?, 0, ?, ?, ?, 50, 1, 170, 1, 170, 1, 0, 0, ?,
               2, 20, 'WANDERER', 'WANDERER', NULL, 0, 0, 0, '', '', '[]', ?)`
    ).bind(proposalId, userId, SEASON, settlementToken, beforeAt, stagedAt),
    env.AUTH_DB.prepare(
      `UPDATE player_profiles
       SET level = 2, xp = 20, next_level_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(stagedAt, userId),
    env.AUTH_DB.prepare(
      `UPDATE player_progression
       SET basic_skypass_level = 2, basic_skypass_xp = 20,
           basic_skypass_next_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(stagedAt, userId),
    env.AUTH_DB.prepare(
      `UPDATE player_skypass_season_stats
       SET achieved_account_level = 1, updated_at = ?
       WHERE user_id = ? AND season = ?`
    ).bind(stagedAt, userId, SEASON),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_experience
         (proposal_id, player1_rewards_json, player2_rewards_json,
          processed_at, player_count, settlement_token)
       VALUES (?, '[]', '[]', ?, 1, ?)`
    ).bind(proposalId, stagedAt, settlementToken)
  ])
  return { proposalId, stagedAt }
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  await env.AUTH_DB.prepare('DELETE FROM skypass_season_close_cycles').run()
  await clearTestSkypassPolicies(env.AUTH_DB, [SEASON])
})

describe('SkyPass season auto-claim', () => {
  it('delivers free and entitled premium rewards off chain exactly once', async () => {
    await setupPlayer('free-player')
    await setupPlayer('premium-player', true)
    const policy = await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 5, isInfinite: 0 },
      { level: 1, tier: 2, itemType: 303, amount: 7, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    const [freeReward, premiumReward] = policy.rows.map(row => row.id)

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
    await createTestSkypassPolicy(
      env.AUTH_DB,
      SEASON,
      Array.from({ length: 6 }, (_, reward) => ({
        level: reward + 1,
        tier: 1 as const,
        itemType: 303,
        amount: 1
      }))
    )
    await env.AUTH_DB.prepare(
      `UPDATE player_skypass_season_stats SET achieved_account_level = 6
       WHERE user_id = 'batch-player' AND season = ?`
    )
      .bind(SEASON)
      .run()

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

  it('rejects malformed reward authority before auto-claim can discover it', async () => {
    await setupPlayer('broken-player')
    const createdAt = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_reward_policy_versions
         (season, version, status, mutation_id, source_origin, content_sha256,
          reward_count, fulfillment_policy_version, fulfillment_policy_hash,
          created_by_user_id, activated_by_user_id, activation_reason,
          review_reference, created_at, activated_at)
       VALUES (?, 1, 'DRAFT', ?, 'test:malformed',
               'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
               1, 1,
               'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb',
               'test:author', NULL, NULL, NULL, ?, NULL)`
    )
      .bind(SEASON, crypto.randomUUID(), createdAt)
      .run()
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, is_infinite, policy_version, policy_ordinal)
       VALUES (1, ?, 1, 999, 1, 0, NULL, ?, 1, 1, 1)`
    )
      .bind(SEASON, createdAt)
      .run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE skypass_reward_policy_versions
         SET status = 'ACTIVE', activated_by_user_id = 'test:reviewer',
             activation_reason = 'review', review_reference = 'test:bad',
             activated_at = ? WHERE season = ? AND version = 1`
      )
        .bind(createdAt, SEASON)
        .run()
    ).rejects.toThrow('SkyPass reward policy activation is invalid')
    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 0,
      seasonsCompleted: 0,
      playersProcessed: 0,
      rewardsClaimed: 0,
      failures: 0
    })
  })

  it('does not enqueue absent or zero-progress season rows', async () => {
    await setupPlayer('zero-progress-player', false, 0)
    await setupPlayer('absent-progress-player', false, null)
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 5 }
    ])

    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 1,
      seasonsCompleted: 1,
      playersProcessed: 0,
      rewardsClaimed: 0,
      failures: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_skypass_auto_claims`
      ).first()
    ).toEqual({ count: 0 })
  })

  it('keeps a season close open until staged match XP publishes', async () => {
    const userId = 'pending-match-player'
    await setupPlayer(userId, false, 0)
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 5, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    const pending = await stageUnpublishedExperience(userId)

    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 1,
      seasonsCompleted: 0,
      playersProcessed: 0,
      rewardsClaimed: 0,
      failures: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT completed_at FROM skypass_season_close_cycles
         WHERE season = ?`
      )
        .bind(SEASON)
        .first('completed_at')
    ).toBeNull()

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET status = 'ended', ended_at = ?, updated_at = ?
       WHERE proposal_id = ?`
    )
      .bind(pending.stagedAt, pending.stagedAt, pending.proposalId)
      .run()
    expect(await runDueSkypassAutoClaims(env.AUTH_DB, DUE)).toEqual({
      cyclesCreated: 0,
      seasonsCompleted: 1,
      playersProcessed: 1,
      rewardsClaimed: 1,
      failures: 0
    })
  })

  it('keeps concurrent scheduled delivery idempotent', async () => {
    await setupPlayer('concurrent-player')
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 9, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])

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
