import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import cardLibrary from '../src/generated/card-library.json'
import { ContentRepository } from '../src/content'

import {
  leaderboardRewardCardIds,
  mostRecentLeaderboardRewardTime,
  runDueLeaderboardRewards
} from '../src/leaderboard-reward-worker'
import { seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const SEASON = 10
const FIRST_RUN = new Date(seasonStart(SEASON).getTime() + WEEK_MS + DAY_MS)
const NOW = new Date(FIRST_RUN.getTime() + 60_000)

const setupPlayer = async (
  userId: string,
  score: number,
  createdAt: string,
  modes = ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY']
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, createdAt, createdAt)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  for (const mode of modes) {
    await env.AUTH_DB.prepare(
      `INSERT INTO player_account_stats
         (user_id, game_mode, season, score, player_rank, player_rank_stage,
          player_rank_state, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'MASTER', 'STAGE_NONE', ?, ?, ?)`
    )
      .bind(
        userId,
        mode,
        SEASON,
        score,
        JSON.stringify([-1, 1750, 350, score]),
        createdAt,
        createdAt
      )
      .run()
  }
}

const enableSchedule = async () => {
  const createdAt = new Date(FIRST_RUN.getTime() - DAY_MS).toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO leaderboard_reward_schedule_versions
       (version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
        starts_at, reason, created_at)
     VALUES (1, 1, ?, ?, ?, ?, ?, 'test schedule', ?)`
  )
    .bind(
      FIRST_RUN.getUTCDay(),
      FIRST_RUN.getUTCHours(),
      FIRST_RUN.getUTCMinutes(),
      FIRST_RUN.toISOString(),
      createdAt,
      createdAt
    )
    .run()
}

const inventoryTotals = async (userId: string) =>
  env.AUTH_DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN item_type = 'SW_SILVER_CARDS'
                         THEN balance ELSE 0 END), 0) AS silver,
       COALESCE(SUM(CASE WHEN item_type = 'SW_CONQUEST_TICKET'
                         THEN balance ELSE 0 END), 0) AS tickets
     FROM player_items WHERE user_id = ?`
  )
    .bind(userId)
    .first<{ silver: number; tickets: number }>()

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS reject_leaderboard_reward_grant'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS player_leaderboard_reward_feed_events_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS player_leaderboard_reward_awards_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS leaderboard_reward_entries_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS leaderboard_reward_cycles_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS leaderboard_reward_schedule_versions_no_delete'
    )
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DELETE FROM player_notifications WHERE leaderboard_award_id IS NOT NULL'
    ),
    env.AUTH_DB.prepare('DELETE FROM player_leaderboard_reward_feed_events'),
    env.AUTH_DB.prepare('DELETE FROM player_leaderboard_reward_awards'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_entries'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_cycles'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_schedule_versions'),
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE 'reward-%'`)
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `CREATE TRIGGER player_leaderboard_reward_feed_events_no_delete
       BEFORE DELETE ON player_leaderboard_reward_feed_events
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward feed events are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER player_leaderboard_reward_awards_no_delete
       BEFORE DELETE ON player_leaderboard_reward_awards
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward awards are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER leaderboard_reward_entries_no_delete
       BEFORE DELETE ON leaderboard_reward_entries
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward entries are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER leaderboard_reward_cycles_no_delete
       BEFORE DELETE ON leaderboard_reward_cycles
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward cycles are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER leaderboard_reward_schedule_versions_no_delete
       BEFORE DELETE ON leaderboard_reward_schedule_versions
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward schedule versions are immutable');
       END`
    )
  ])
})

describe('weekly leaderboard reward worker', () => {
  it('is a read-only no-op without an explicitly enabled schedule', async () => {
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toEqual({
      status: 'disabled',
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM leaderboard_reward_cycles'
      ).first('count')
    ).toBe(0)
  })

  it('lets a newer immutable disabled version supersede an enabled schedule', async () => {
    await enableSchedule()
    const disabledAt = new Date(FIRST_RUN.getTime() - 60_000).toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO leaderboard_reward_schedule_versions
         (version, enabled, starts_at, reason, created_at)
       VALUES (2, 0, ?, 'disable test schedule', ?)`
    )
      .bind(disabledAt, disabledAt)
      .run()

    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toEqual({
      status: 'disabled',
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM leaderboard_reward_cycles'
      ).first('count')
    ).toBe(0)
  })

  it('calculates weekly schedule boundaries without skipping missed cycles', () => {
    expect(
      mostRecentLeaderboardRewardTime(
        FIRST_RUN,
        new Date(FIRST_RUN.getTime() - 1)
      )
    ).toBeNull()
    expect(
      mostRecentLeaderboardRewardTime(
        FIRST_RUN,
        new Date(FIRST_RUN.getTime() + 3 * WEEK_MS + 12_345)
      )?.toISOString()
    ).toBe(new Date(FIRST_RUN.getTime() + 3 * WEEK_MS).toISOString())
  })

  it('uses only source-valid, non-Hexbound reward cards', async () => {
    const beforeHexbound = leaderboardRewardCardIds(1)
    const current = leaderboardRewardCardIds(SEASON)
    expect(beforeHexbound.length).toBeGreaterThan(0)
    expect(current.length).toBeGreaterThanOrEqual(beforeHexbound.length)
    expect(new Set(current).size).toBe(current.length)
    expect(current).toEqual(
      cardLibrary.cards
        .filter(
          card =>
            card.set !== 'HEXBOUND_INVASION' && card.validFromSeason <= SEASON
        )
        .map(card => card.id)
    )
  })

  it('catches up missed cycles in order instead of skipping reward weeks', async () => {
    await enableSchedule()
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed'
    })
    const muchLater = new Date(FIRST_RUN.getTime() + 3 * WEEK_MS + 60_000)
    expect(
      await runDueLeaderboardRewards(env.AUTH_DB, muchLater)
    ).toMatchObject({ status: 'completed' })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT scheduled_at FROM leaderboard_reward_cycles
         ORDER BY scheduled_at`
      ).all()
    ).toMatchObject({
      results: [
        { scheduled_at: FIRST_RUN.toISOString() },
        { scheduled_at: new Date(FIRST_RUN.getTime() + WEEK_MS).toISOString() }
      ]
    })
  })

  it('grants exact two-mode rewards, notifications, and feed receipts once', async () => {
    const older = new Date(
      FIRST_RUN.getTime() - 12 * 60 * 60 * 1000
    ).toISOString()
    const newer = new Date(
      FIRST_RUN.getTime() - 6 * 60 * 60 * 1000
    ).toISOString()
    await setupPlayer('reward-first', 2_000, older)
    await setupPlayer('reward-second', 1_000, newer)
    await setupPlayer('reward-suspended', 3_000, newer)
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings SET account_status = 'SUSPENDED'
       WHERE user_id = 'reward-suspended'`
    ).run()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_rank_up_rewards
           (user_id, game_mode, season, player_rank, player_rank_stage,
            proposal_id, awarded_at)
         VALUES ('reward-first', 'RANKED_CONSTRUCTED', ?, 'MASTER',
                 'STAGE_NONE', 'rank-up-master', ?)`
      ).bind(SEASON, newer),
      env.AUTH_DB.prepare(
        `INSERT INTO player_rank_up_rewards
           (user_id, game_mode, season, player_rank, player_rank_stage,
            proposal_id, awarded_at)
         VALUES ('reward-first', 'RANKED_CONSTRUCTED', ?, 'APPRENTICE',
                 'STAGE_II', 'rank-up-apprentice', ?)`
      ).bind(SEASON, older)
    ])
    await enableSchedule()

    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      delivered: 2
    })
    expect(await inventoryTotals('reward-first')).toEqual({
      silver: 20,
      tickets: 4
    })
    expect(await inventoryTotals('reward-second')).toEqual({
      silver: 18,
      tickets: 4
    })
    expect(await inventoryTotals('reward-suspended')).toEqual({
      silver: 0,
      tickets: 0
    })

    const cycle = await env.AUTH_DB.prepare(
      `SELECT season, week, status FROM leaderboard_reward_cycles`
    ).first()
    expect(cycle).toEqual({ season: SEASON, week: 2, status: 'COMPLETED' })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT game_mode, rank FROM leaderboard_reward_entries
         WHERE user_id = 'reward-first' ORDER BY game_mode`
      ).all()
    ).toMatchObject({
      results: [
        { game_mode: 'RANKED_CONSTRUCTED', rank: 1 },
        { game_mode: 'RANKED_DISCOVERY', rank: 1 }
      ]
    })

    const notification = await env.AUTH_DB.prepare(
      `SELECT payload FROM player_notifications
       WHERE user_id = 'reward-first' AND notification_type = 'LEADERBOARD_REWARD'`
    ).first<{ payload: string }>()
    const payload = JSON.parse(notification!.payload).leaderboardReward
    expect(payload).toMatchObject({
      ticketAmount: 4,
      rankedConstructedRank: 1,
      rankedDiscoveryRank: 1,
      earnedConstructedPlayerRanks: [
        { playerRank: 'GRANDWEAVER', playerRankStage: 'STAGE_NONE' },
        { playerRank: 'MASTER', playerRankStage: 'STAGE_NONE' },
        { playerRank: 'APPRENTICE', playerRankStage: 'STAGE_II' }
      ]
    })
    expect(
      Object.values(payload.silverCardAmounts).reduce(
        (sum: number, count) => sum + Number(count),
        0
      )
    ).toBe(20)
    expect(
      Object.keys(payload.silverCardAmounts).every(
        tokenId => Number(tokenId) >= 65_536
      )
    ).toBe(true)
    expect(
      await new ContentRepository(env.AUTH_DB).listNotifications('reward-first')
    ).toEqual([
      expect.objectContaining({
        type: 'LEADERBOARD_REWARD',
        leaderboardReward: expect.objectContaining({
          ticketAmount: 4,
          rankedConstructedRank: 1,
          rankedDiscoveryRank: 1
        })
      })
    ])

    const feed = await new PlayerRpcRepository(env.AUTH_DB).feed(
      'identity:reward-first'
    )
    expect(
      feed.res.filter(event => event.type === 'LEADERBOARD_REWARD')
    ).toEqual([
      expect.objectContaining({
        gameMode: 'RANKED_DISCOVERY',
        leaderboardRank: 1,
        tokenIds: expect.arrayContaining([16_646_145])
      }),
      expect.objectContaining({
        gameMode: 'RANKED_CONSTRUCTED',
        leaderboardRank: 1,
        tokenIds: expect.arrayContaining([16_646_145])
      })
    ])

    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'not_due',
      delivered: 0
    })
    expect(await inventoryTotals('reward-first')).toEqual({
      silver: 20,
      tickets: 4
    })
  })

  it('rolls back a failed award and retries it without double granting', async () => {
    await setupPlayer('reward-retry', 2_000, NOW.toISOString())
    await enableSchedule()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_leaderboard_reward_grant
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'leaderboard:%'
       BEGIN
         SELECT RAISE(ABORT, 'injected leaderboard reward failure');
       END`
    ).run()

    await expect(runDueLeaderboardRewards(env.AUTH_DB, NOW)).rejects.toThrow(
      'injected leaderboard reward failure'
    )
    expect(await inventoryTotals('reward-retry')).toEqual({
      silver: 0,
      tickets: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_leaderboard_reward_awards`
      ).first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count FROM leaderboard_reward_cycles`
      ).first()
    ).toEqual({ status: 'DELIVERING', attempt_count: 1 })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_leaderboard_reward_grant'
    ).run()
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      delivered: 1
    })
    expect(await inventoryTotals('reward-retry')).toEqual({
      silver: 20,
      tickets: 4
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_leaderboard_reward_awards) AS awards,
           (SELECT COUNT(*) FROM player_notifications
            WHERE notification_type = 'LEADERBOARD_REWARD') AS notifications,
           (SELECT COUNT(*) FROM player_leaderboard_reward_feed_events) AS feed`
      ).first()
    ).toEqual({ awards: 1, notifications: 1, feed: 2 })
  })

  it('serializes concurrent cron calls through the cycle and award receipts', async () => {
    await setupPlayer('reward-concurrent', 2_000, NOW.toISOString())
    await enableSchedule()

    const runs = await Promise.all([
      runDueLeaderboardRewards(env.AUTH_DB, NOW),
      runDueLeaderboardRewards(env.AUTH_DB, NOW)
    ])
    expect(runs.reduce((sum, run) => sum + run.delivered, 0)).toBe(1)
    expect(await inventoryTotals('reward-concurrent')).toEqual({
      silver: 20,
      tickets: 4
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM leaderboard_reward_cycles) AS cycles,
           (SELECT COUNT(*) FROM player_leaderboard_reward_awards) AS awards,
           (SELECT COUNT(*) FROM player_notifications
            WHERE notification_type = 'LEADERBOARD_REWARD') AS notifications,
           (SELECT COUNT(*) FROM player_leaderboard_reward_feed_events) AS feed`
      ).first()
    ).toEqual({ cycles: 1, awards: 1, notifications: 1, feed: 2 })
  })

  it('bounds each cron batch and resumes remaining players from receipts', async () => {
    for (let index = 0; index < 25; index++) {
      await setupPlayer(
        `reward-batch-${String(index).padStart(2, '0')}`,
        1_000 - index,
        new Date(NOW.getTime() + index).toISOString(),
        ['RANKED_CONSTRUCTED']
      )
    }
    await enableSchedule()
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'in_progress',
      delivered: 20
    })
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      delivered: 5
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_leaderboard_reward_awards) AS awards,
           (SELECT COUNT(*) FROM player_notifications
            WHERE notification_type = 'LEADERBOARD_REWARD') AS notifications,
           (SELECT SUM(balance) FROM player_items
            WHERE unlock_source LIKE 'leaderboard:%'
              AND item_type = 'SW_CONQUEST_TICKET') AS tickets`
      ).first()
    ).toEqual({ awards: 25, notifications: 25, tickets: 50 })
  })

  it('dead-letters a repeatedly failing cycle after five attempts', async () => {
    await setupPlayer('reward-dead-letter', 2_000, NOW.toISOString())
    await enableSchedule()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_leaderboard_reward_grant
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'leaderboard:%'
       BEGIN
         SELECT RAISE(ABORT, 'persistent leaderboard reward failure');
       END`
    ).run()

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(runDueLeaderboardRewards(env.AUTH_DB, NOW)).rejects.toThrow(
        'persistent leaderboard reward failure'
      )
      expect(
        await env.AUTH_DB.prepare(
          `SELECT status, attempt_count FROM leaderboard_reward_cycles`
        ).first()
      ).toEqual({
        status: attempt === 5 ? 'FAILED' : 'DELIVERING',
        attempt_count: attempt
      })
    }
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'failed',
      delivered: 0
    })
    expect(await inventoryTotals('reward-dead-letter')).toEqual({
      silver: 0,
      tickets: 0
    })
  })
})
