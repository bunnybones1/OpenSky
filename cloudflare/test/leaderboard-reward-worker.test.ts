import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import cardLibrary from '../src/generated/card-library.json'
import { ContentRepository } from '../src/content'

import {
  leaderboardRewardCardIds,
  mostRecentLeaderboardRewardTime,
  nextLeaderboardRewardTime,
  runDueLeaderboardRewards
} from '../src/leaderboard-reward-worker'
import {
  calculatedLeaderboardRewardPolicyHash,
  LEADERBOARD_REWARD_POLICY_HASH,
  LEADERBOARD_REWARD_POLICY_VERSION
} from '../src/leaderboard-reward-policy'
import { seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'
import {
  publishPendingAccountStat,
  stagePendingAccountStat
} from './helpers/rank-publication'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const SEASON = 10
const FIRST_RUN = new Date(seasonStart(SEASON).getTime() + WEEK_MS + DAY_MS)
const NOW = new Date(FIRST_RUN.getTime() + 60_000)

const setupPlayer = async (
  userId: string,
  score: number,
  createdAt: string,
  modes = ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'],
  userKind: 'PLAYER' | 'SYSTEM' = 'PLAYER'
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at, user_kind)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      userId,
      `${userId}@example.com`,
      createdAt,
      createdAt,
      userKind
    )
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
  await env.AUTH_DB.prepare(
    `INSERT INTO leaderboard_reward_schedule_activations
       (schedule_version, status, policy_version, policy_hash,
        created_by_user_id, activated_by_user_id, reason, review_reference,
        created_at, activated_at)
     VALUES (1, 'DRAFT', ?, ?, 'system:test-author', NULL,
             'test policy', 'test:review', ?, NULL)`
  )
    .bind(
      LEADERBOARD_REWARD_POLICY_VERSION,
      LEADERBOARD_REWARD_POLICY_HASH,
      createdAt
    )
    .run()
  await env.AUTH_DB.prepare(
    `UPDATE leaderboard_reward_schedule_activations
     SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
         activated_at = ? WHERE schedule_version = 1`
  )
    .bind(createdAt)
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
      'DROP TRIGGER IF EXISTS reject_leaderboard_reward_completion'
    ),
    env.AUTH_DB.prepare('DROP TRIGGER IF EXISTS reject_leaderboard_rank_reset'),
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
      'DROP TRIGGER IF EXISTS leaderboard_rank_reset_receipts_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS leaderboard_reward_schedule_versions_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS leaderboard_reward_schedule_activations_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS leaderboard_reward_cycle_policy_receipts_no_delete'
    )
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DELETE FROM player_notifications WHERE leaderboard_award_id IS NOT NULL'
    ),
    env.AUTH_DB.prepare('DELETE FROM player_leaderboard_reward_feed_events'),
    env.AUTH_DB.prepare('DELETE FROM player_leaderboard_reward_awards'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_entries'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_rank_reset_receipts'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_cycle_policy_receipts'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_cycles'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_schedule_activations'),
    env.AUTH_DB.prepare('DELETE FROM leaderboard_reward_schedule_versions'),
    env.AUTH_DB.prepare(
      `DELETE FROM users
       WHERE id LIKE 'reward-%' OR id LIKE 'system:reward-%'`
    )
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
      `CREATE TRIGGER leaderboard_rank_reset_receipts_no_delete
       BEFORE DELETE ON leaderboard_rank_reset_receipts
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard rank reset receipts are immutable');
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
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER leaderboard_reward_schedule_activations_no_delete
       BEFORE DELETE ON leaderboard_reward_schedule_activations
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward policy activations are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER leaderboard_reward_cycle_policy_receipts_no_delete
       BEFORE DELETE ON leaderboard_reward_cycle_policy_receipts
       BEGIN
         SELECT RAISE(ABORT, 'leaderboard reward cycle policy receipts are immutable');
       END`
    )
  ])
})

describe('weekly leaderboard reward worker', () => {
  it('keeps an enabled cadence dormant until its exact policy has two-actor approval', async () => {
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
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toEqual({
      status: 'disabled',
      delivered: 0
    })
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO leaderboard_reward_schedule_activations
           (schedule_version, status, policy_version, policy_hash,
            created_by_user_id, activated_by_user_id, reason,
            review_reference, created_at, activated_at)
         VALUES (1, 'DRAFT', 1, ?, 'system:test-author', NULL,
                 'bad policy', 'test:bad-review', ?, NULL)`
      )
        .bind('0'.repeat(64), createdAt)
        .run()
    ).rejects.toThrow(
      'leaderboard reward policy activation must start as a draft'
    )
    await env.AUTH_DB.prepare(
      `INSERT INTO leaderboard_reward_schedule_activations
         (schedule_version, status, policy_version, policy_hash,
          created_by_user_id, activated_by_user_id, reason, review_reference,
          created_at, activated_at)
       VALUES (1, 'DRAFT', ?, ?, 'system:test-author', NULL,
               'test policy', 'test:review', ?, NULL)`
    )
      .bind(
        LEADERBOARD_REWARD_POLICY_VERSION,
        LEADERBOARD_REWARD_POLICY_HASH,
        createdAt
      )
      .run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE leaderboard_reward_schedule_activations
         SET status = 'ACTIVE', activated_by_user_id = 'system:test-author',
             activated_at = ? WHERE schedule_version = 1`
      )
        .bind(createdAt)
        .run()
    ).rejects.toThrow('leaderboard reward policy activation is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE leaderboard_reward_schedule_activations
         SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
             activated_at = ? WHERE schedule_version = 1`
      )
        .bind(NOW.toISOString())
        .run()
    ).rejects.toThrow('leaderboard reward policy activation is invalid')
    await env.AUTH_DB.prepare(
      `UPDATE leaderboard_reward_schedule_activations
       SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
           activated_at = ? WHERE schedule_version = 1`
    )
      .bind(createdAt)
      .run()

    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT policy_version, policy_hash
         FROM leaderboard_reward_cycle_policy_receipts`
      ).first()
    ).toEqual({
      policy_version: LEADERBOARD_REWARD_POLICY_VERSION,
      policy_hash: LEADERBOARD_REWARD_POLICY_HASH
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE leaderboard_reward_cycle_policy_receipts
         SET policy_hash = ?`
      )
        .bind('0'.repeat(64))
        .run()
    ).rejects.toThrow('leaderboard reward cycle policy receipts are immutable')
  })

  it('pins the approved policy to the source curve and generated card pool', async () => {
    expect(await calculatedLeaderboardRewardPolicyHash()).toBe(
      LEADERBOARD_REWARD_POLICY_HASH
    )
  })

  it('keeps a due cycle preparing until staged match stats publish', async () => {
    const userId = 'reward-match-publication'
    const proposalId = `reward-publication-${crypto.randomUUID()}`
    await setupPlayer(userId, 1_500, NOW.toISOString())
    await enableSchedule()
    await stagePendingAccountStat(env.AUTH_DB, {
      proposalId,
      userId,
      season: SEASON
    })

    const waiting = await runDueLeaderboardRewards(env.AUTH_DB, NOW)
    expect(waiting).toMatchObject({ status: 'in_progress', delivered: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count,
                (SELECT COUNT(*) FROM leaderboard_reward_entries
                 WHERE cycle_id = cycles.id) AS entries,
                (SELECT COUNT(*)
                 FROM leaderboard_reward_cycle_policy_receipts
                 WHERE cycle_id = cycles.id) AS policies
         FROM leaderboard_reward_cycles cycles WHERE id = ?`
      )
        .bind(waiting.cycleId)
        .first()
    ).toEqual({
      status: 'PREPARING',
      attempt_count: 0,
      entries: 0,
      policies: 0
    })

    await publishPendingAccountStat(env.AUTH_DB, proposalId)
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      cycleId: waiting.cycleId
    })
  })

  it('rejects caller-selected cycle season, week, and unreceipted delivery', async () => {
    await enableSchedule()
    const scheduledAt = FIRST_RUN.toISOString()
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO leaderboard_reward_cycles
           (schedule_version, scheduled_at, season, week, random_seed, status,
            attempt_count, started_at)
         VALUES (1, ?, ?, 4, ?, 'PREPARING', 0, ?)`
      )
        .bind(scheduledAt, SEASON + 1, crypto.randomUUID(), NOW.toISOString())
        .run()
    ).rejects.toThrow('leaderboard reward cycle creation is invalid')
    const cycle = await env.AUTH_DB.prepare(
      `INSERT INTO leaderboard_reward_cycles
         (schedule_version, scheduled_at, season, week, random_seed, status,
          attempt_count, started_at)
       VALUES (1, ?, ?, 2, ?, 'PREPARING', 0, ?)`
    )
      .bind(scheduledAt, SEASON, crypto.randomUUID(), NOW.toISOString())
      .run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE leaderboard_reward_cycles SET status = 'DELIVERING'
         WHERE id = ?`
      )
        .bind(cycle.meta.last_row_id)
        .run()
    ).rejects.toThrow('active leaderboard reward policy receipt required')
  })

  it('rejects tampered ranks and incomplete authoritative snapshots', async () => {
    await enableSchedule()
    const older = new Date(FIRST_RUN.getTime() - DAY_MS).toISOString()
    const newer = new Date(FIRST_RUN.getTime() - DAY_MS / 2).toISOString()
    await setupPlayer('reward-snapshot-first', 2_000, older)
    await setupPlayer('reward-snapshot-second', 1_000, newer)
    const cycle = await env.AUTH_DB.prepare(
      `INSERT INTO leaderboard_reward_cycles
         (schedule_version, scheduled_at, season, week, random_seed, status,
          attempt_count, started_at)
       VALUES (1, ?, ?, 2, ?, 'PREPARING', 0, ?)`
    )
      .bind(
        FIRST_RUN.toISOString(),
        SEASON,
        crypto.randomUUID(),
        NOW.toISOString()
      )
      .run()
    const cycleId = Number(cycle.meta.last_row_id)
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO leaderboard_reward_entries
           (cycle_id, user_id, game_mode, rank, snapshotted_at)
         VALUES (?, 'reward-snapshot-first', 'RANKED_CONSTRUCTED', 2, ?)`
      )
        .bind(cycleId, NOW.toISOString())
        .run()
    ).rejects.toThrow('leaderboard reward snapshot entry is invalid')
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO leaderboard_reward_cycle_policy_receipts
           (cycle_id, schedule_version, policy_version, policy_hash,
            eligible_card_ids_json, created_at)
         VALUES (?, 1, ?, ?, ?, ?)`
      ).bind(
        cycleId,
        LEADERBOARD_REWARD_POLICY_VERSION,
        LEADERBOARD_REWARD_POLICY_HASH,
        JSON.stringify(leaderboardRewardCardIds(SEASON)),
        NOW.toISOString()
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO leaderboard_reward_entries
           (cycle_id, user_id, game_mode, rank, snapshotted_at)
         VALUES (?, 'reward-snapshot-first', 'RANKED_CONSTRUCTED', 1, ?),
                (?, 'reward-snapshot-second', 'RANKED_CONSTRUCTED', 2, ?)`
      ).bind(cycleId, NOW.toISOString(), cycleId, NOW.toISOString())
    ])
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE leaderboard_reward_cycles SET status = 'DELIVERING'
         WHERE id = ?`
      )
        .bind(cycleId)
        .run()
    ).rejects.toThrow('leaderboard reward snapshot is incomplete')

    await env.AUTH_DB.prepare(
      `INSERT INTO leaderboard_reward_entries
         (cycle_id, user_id, game_mode, rank, snapshotted_at)
       VALUES (?, 'reward-snapshot-first', 'RANKED_DISCOVERY', 1, ?),
              (?, 'reward-snapshot-second', 'RANKED_DISCOVERY', 2, ?)`
    )
      .bind(cycleId, NOW.toISOString(), cycleId, NOW.toISOString())
      .run()
    await env.AUTH_DB.prepare(
      `UPDATE leaderboard_reward_cycles SET status = 'DELIVERING'
       WHERE id = ?`
    )
      .bind(cycleId)
      .run()

    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO player_leaderboard_reward_awards
           (award_key, cycle_id, user_id, season, week, payload_json,
            mode_awards_json, delivery_key, awarded_at, application_status,
            completed_at)
         VALUES (?, ?, 'reward-snapshot-first', ?, 2, ?, ?, ?, ?,
                 'PREPARING', NULL)`
      )
        .bind(
          `${cycleId}:under-award-test`,
          cycleId,
          SEASON,
          JSON.stringify({
            silverCardAmounts: { '65537': 1 },
            ticketAmount: 2,
            rankedConstructedRank: 1,
            rankedDiscoveryRank: 0
          }),
          JSON.stringify({
            RANKED_CONSTRUCTED: {
              rank: 1,
              silverCardIds: [1],
              tickets: 2
            }
          }),
          crypto.randomUUID(),
          NOW.toISOString()
        )
        .run()
    ).rejects.toThrow('active leaderboard reward policy receipt required')
  })

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

  it('does not snapshot operational system scores into player rewards', async () => {
    const userId = 'system:reward-readiness-test'
    await setupPlayer(
      userId,
      9_999,
      NOW.toISOString(),
      ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'],
      'SYSTEM'
    )
    await enableSchedule()

    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM leaderboard_reward_entries
         WHERE user_id = ?`
      )
        .bind(userId)
        .first('count')
    ).toBe(0)
    expect(await inventoryTotals(userId)).toEqual({ silver: 0, tickets: 0 })
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

  it('reports the next configured boundary strictly after now', async () => {
    expect(await nextLeaderboardRewardTime(env.AUTH_DB, NOW)).toBeNull()

    await enableSchedule()
    expect(
      (
        await nextLeaderboardRewardTime(
          env.AUTH_DB,
          new Date(FIRST_RUN.getTime() - 1)
        )
      )?.toISOString()
    ).toBe(FIRST_RUN.toISOString())
    expect(
      (await nextLeaderboardRewardTime(env.AUTH_DB, FIRST_RUN))?.toISOString()
    ).toBe(new Date(FIRST_RUN.getTime() + WEEK_MS).toISOString())
    expect(
      (
        await nextLeaderboardRewardTime(
          env.AUTH_DB,
          new Date(FIRST_RUN.getTime() + 3 * WEEK_MS + 12_345)
        )
      )?.toISOString()
    ).toBe(new Date(FIRST_RUN.getTime() + 4 * WEEK_MS).toISOString())
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
    for (const season of [1, SEASON, 62]) {
      const policyRows = await env.AUTH_DB.prepare(
        `SELECT card_id FROM leaderboard_reward_policy_cards
         WHERE policy_version = ? AND policy_hash = ?
           AND valid_from_season <= ?
         ORDER BY card_id`
      )
        .bind(
          LEADERBOARD_REWARD_POLICY_VERSION,
          LEADERBOARD_REWARD_POLICY_HASH,
          season
        )
        .all<{ card_id: number }>()
      expect(policyRows.results.map(row => row.card_id)).toEqual(
        leaderboardRewardCardIds(season)
      )
    }
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
    const awardEvidence = await env.AUTH_DB.prepare(
      `SELECT id, mode_awards_json, application_status, completed_at
       FROM player_leaderboard_reward_awards
       WHERE user_id = 'reward-first'`
    ).first<{
      id: number
      mode_awards_json: string
      application_status: string
      completed_at: string
    }>()
    expect(awardEvidence).toMatchObject({
      application_status: 'APPLIED',
      completed_at: NOW.toISOString()
    })
    expect(Object.keys(JSON.parse(awardEvidence!.mode_awards_json))).toEqual([
      'RANKED_CONSTRUCTED',
      'RANKED_DISCOVERY'
    ])
    const inventoryEvidence = await env.AUTH_DB.prepare(
      `SELECT item_type, SUM(quantity) AS quantity,
              SUM(after_balance - before_balance) AS balance_change
       FROM player_leaderboard_reward_inventory_grants
       WHERE award_id = ? GROUP BY item_type ORDER BY item_type`
    )
      .bind(awardEvidence!.id)
      .all()
    expect(inventoryEvidence.results).toEqual([
      {
        item_type: 'SW_CONQUEST_TICKET',
        quantity: 4,
        balance_change: 4
      },
      {
        item_type: 'SW_SILVER_CARDS',
        quantity: 20,
        balance_change: 20
      }
    ])
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

  it('proves atomic completion and immutable leaderboard reward evidence', async () => {
    await setupPlayer('reward-receipt-retry', 2_000, NOW.toISOString())
    await enableSchedule()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_leaderboard_reward_completion
       BEFORE UPDATE OF application_status
       ON player_leaderboard_reward_awards
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected leaderboard receipt failure');
       END`
    ).run()

    await expect(runDueLeaderboardRewards(env.AUTH_DB, NOW)).rejects.toThrow(
      'injected leaderboard receipt failure'
    )
    expect(await inventoryTotals('reward-receipt-retry')).toEqual({
      silver: 0,
      tickets: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_leaderboard_reward_awards) AS awards,
           (SELECT COUNT(*)
            FROM player_leaderboard_reward_inventory_grants) AS grants,
           (SELECT COUNT(*)
            FROM player_leaderboard_reward_feed_events) AS feed,
           (SELECT COUNT(*) FROM player_notifications
            WHERE leaderboard_award_id IS NOT NULL) AS notifications`
      ).first()
    ).toEqual({ awards: 0, grants: 0, feed: 0, notifications: 0 })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_leaderboard_reward_completion'
    ).run()
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      delivered: 1
    })
    expect(await inventoryTotals('reward-receipt-retry')).toEqual({
      silver: 20,
      tickets: 4
    })
    const evidence = await env.AUTH_DB.prepare(
      `SELECT
         (SELECT application_status FROM player_leaderboard_reward_awards)
           AS status,
         (SELECT completed_at FROM player_leaderboard_reward_awards)
           AS completed_at,
         (SELECT SUM(quantity)
          FROM player_leaderboard_reward_inventory_grants
          WHERE item_type = 'SW_SILVER_CARDS') AS silver,
         (SELECT quantity
          FROM player_leaderboard_reward_inventory_grants
          WHERE item_type = 'SW_CONQUEST_TICKET') AS tickets`
    ).first()
    expect(evidence).toMatchObject({
      status: 'APPLIED',
      completed_at: NOW.toISOString(),
      silver: 20,
      tickets: 4
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_leaderboard_reward_awards SET week = week + 1`
      ).run()
    ).rejects.toThrow('reward receipt completion is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_leaderboard_reward_inventory_grants
         SET after_balance = after_balance + 1`
      ).run()
    ).rejects.toThrow('reward inventory grants are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_notifications SET payload = '{}'
         WHERE leaderboard_award_id IS NOT NULL`
      ).run()
    ).rejects.toThrow('reward notifications are immutable')
  })

  it('retries a failed rank reset without repeating already delivered rewards', async () => {
    await setupPlayer('reward-reset-retry', 2_000, NOW.toISOString())
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET player_rank_state = json_set(player_rank_state, '$[2]', 100)
       WHERE user_id = 'reward-reset-retry' AND season = ?`
    )
      .bind(SEASON)
      .run()
    await enableSchedule()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_leaderboard_rank_reset
       BEFORE INSERT ON leaderboard_rank_reset_receipts
       BEGIN
         SELECT RAISE(ABORT, 'injected leaderboard rank reset failure');
       END`
    ).run()

    await expect(runDueLeaderboardRewards(env.AUTH_DB, NOW)).rejects.toThrow(
      'injected leaderboard rank reset failure'
    )
    expect(await inventoryTotals('reward-reset-retry')).toEqual({
      silver: 20,
      tickets: 4
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_leaderboard_reward_awards) AS awards,
           (SELECT COUNT(*) FROM leaderboard_rank_reset_receipts) AS resets,
           (SELECT attempt_count FROM leaderboard_reward_cycles) AS attempts`
      ).first()
    ).toEqual({ awards: 1, resets: 0, attempts: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT json_extract(player_rank_state, '$[2]') AS deviation
         FROM player_account_stats
         WHERE user_id = 'reward-reset-retry'
           AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      )
        .bind(SEASON)
        .first('deviation')
    ).toBe(100)

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_leaderboard_rank_reset'
    ).run()
    expect(await runDueLeaderboardRewards(env.AUTH_DB, NOW)).toMatchObject({
      status: 'completed',
      delivered: 0
    })
    expect(await inventoryTotals('reward-reset-retry')).toEqual({
      silver: 20,
      tickets: 4
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT json_extract(player_rank_state, '$[2]') AS deviation
         FROM player_account_stats
         WHERE user_id = 'reward-reset-retry'
           AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      )
        .bind(SEASON)
        .first('deviation')
    ).toBe(125)
  })

  it('serializes concurrent cron calls through the cycle and award receipts', async () => {
    await setupPlayer('reward-concurrent', 2_000, NOW.toISOString())
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET player_rank_state = json_set(player_rank_state, '$[2]', 100)
       WHERE user_id = 'reward-concurrent' AND season = ?`
    )
      .bind(SEASON)
      .run()
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
           (SELECT COUNT(*) FROM player_leaderboard_reward_feed_events) AS feed,
           (SELECT COUNT(*) FROM leaderboard_rank_reset_receipts) AS resets`
      ).first()
    ).toEqual({ cycles: 1, awards: 1, notifications: 1, feed: 2, resets: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT json_extract(player_rank_state, '$[2]') AS deviation
         FROM player_account_stats
         WHERE user_id = 'reward-concurrent'
           AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      )
        .bind(SEASON)
        .first('deviation')
    ).toBe(125)
  })

  // This intentionally creates and settles more players than one cron batch.
  // Shared CI Worker-pool scheduling can exceed Vitest's five-second default
  // even though the exact 20-plus-5 receipt assertions still run unchanged.
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
  }, 15_000)

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
