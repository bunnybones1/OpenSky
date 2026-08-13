import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import cardLibrary from '../src/generated/card-library.json'
import { ContentRepository } from '../src/content'
import {
  conquestV2LegacyUsdcMicros,
  conquestV2OffchainTreasureInfo,
  conquestV2RewardCardIds,
  conquestV2SilverCardCount,
  mostRecentConquestV2RewardTime,
  runDueConquestV2Rewards
} from '../src/conquest-v2-reward-worker'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const FIRST_RUN = new Date('2026-08-10T01:00:00.000Z')
const DELIVERY = new Date(FIRST_RUN.getTime() + DAY_MS)
const SNAPSHOT_NOW = new Date(FIRST_RUN.getTime() + 60_000)
const DELIVERY_NOW = new Date(DELIVERY.getTime() + 60_000)

const setupPlayer = async (userId: string, points: number) => {
  const now = FIRST_RUN.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquest_points
       (user_id, event_id, current_points, total_points, updated_at)
     VALUES (?, 2, ?, ?, ?)`
  )
    .bind(userId, points, points, now)
    .run()
}

const enableSchedule = async (deliveryDelaySeconds = 86_400) => {
  const createdAt = new Date(FIRST_RUN.getTime() - DAY_MS).toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO conquest_v2_reward_schedule_versions
       (version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
        first_season, first_week, delivery_delay_seconds, reward_card_sets_json,
        starts_at, reason, created_at)
     VALUES (1, 1, ?, ?, ?, ?, 31, 2, ?, '["HEXBOUND_INVASION"]', ?,
             'test schedule', ?)`
  )
    .bind(
      FIRST_RUN.getUTCDay(),
      FIRST_RUN.getUTCHours(),
      FIRST_RUN.getUTCMinutes(),
      FIRST_RUN.toISOString(),
      deliveryDelaySeconds,
      createdAt,
      createdAt
    )
    .run()
}

const setWeightPerSilver = async (value: number) => {
  await env.AUTH_DB.prepare(
    `UPDATE conquest_v2_pool_settings
     SET weight_per_silver_card = ?, version = version + 1,
         mutation_id = ?, updated_by_user_id = 'system:test', updated_at = ?
     WHERE singleton = 1`
  )
    .bind(value, crypto.randomUUID(), new Date().toISOString())
    .run()
}

const silverTotal = async (userId: string) =>
  env.AUTH_DB.prepare(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM player_items
     WHERE user_id = ? AND item_type = 'SW_SILVER_CARDS'`
  )
    .bind(userId)
    .first<number>('total')

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS reject_conquest_v2_reward_grant'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS player_conquest_v2_reward_feed_events_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS player_conquest_v2_reward_awards_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS conquest_v2_reward_cycle_failures_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS conquest_v2_reward_entries_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS conquest_v2_reward_cycles_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS conquest_v2_reward_schedule_versions_no_delete'
    )
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DELETE FROM player_notifications WHERE conquest_v2_award_id IS NOT NULL'
    ),
    env.AUTH_DB.prepare('DELETE FROM player_conquest_v2_reward_feed_events'),
    env.AUTH_DB.prepare('DELETE FROM player_conquest_v2_reward_awards'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_cycle_failures'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_entries'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_cycles'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_schedule_versions'),
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE 'treasure-%'`),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_pool_cache'),
    env.AUTH_DB.prepare(
      `UPDATE conquest_v2_pool_settings
       SET pool_ceiling = 0, pool_floor = 0,
           top_weight_unit_price = 0, bottom_weight_unit_price = 0,
           weight_per_silver_card = 0, version = version + 1,
           mutation_id = ?, updated_by_user_id = 'system:test-reset',
           updated_at = ?
       WHERE singleton = 1`
    ).bind(crypto.randomUUID(), new Date().toISOString())
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `CREATE TRIGGER player_conquest_v2_reward_feed_events_no_delete
       BEFORE DELETE ON player_conquest_v2_reward_feed_events
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward feed events are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER player_conquest_v2_reward_awards_no_delete
       BEFORE DELETE ON player_conquest_v2_reward_awards
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward awards are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER conquest_v2_reward_cycle_failures_no_delete
       BEFORE DELETE ON conquest_v2_reward_cycle_failures
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward failures are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER conquest_v2_reward_entries_no_delete
       BEFORE DELETE ON conquest_v2_reward_entries
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward entries are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER conquest_v2_reward_cycles_no_delete
       BEFORE DELETE ON conquest_v2_reward_cycles
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward cycles are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER conquest_v2_reward_schedule_versions_no_delete
       BEFORE DELETE ON conquest_v2_reward_schedule_versions
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward schedule versions are immutable');
       END`
    )
  ])
})

describe('Conquest V2 off-chain weekly rewards', () => {
  it('is a read-only no-op without an explicitly enabled schedule', async () => {
    expect(await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)).toEqual({
      status: 'disabled',
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM conquest_v2_reward_cycles'
      ).first('count')
    ).toBe(0)
  })

  it('preserves source float32 reward math and season-valid card filtering', () => {
    expect(conquestV2SilverCardCount(1, 1)).toBe(1)
    expect(conquestV2SilverCardCount(0.05, 10)).toBe(10)
    expect(conquestV2LegacyUsdcMicros(100, 226.58, 2)).toBe(1_407_891)
    expect(conquestV2RewardCardIds(18, ['HEXBOUND_INVASION'])).toEqual(
      cardLibrary.cards
        .filter(
          card => card.set === 'HEXBOUND_INVASION' && card.validFromSeason <= 18
        )
        .map(card => card.id)
    )
    expect(conquestV2RewardCardIds(1, ['NOT_A_SOURCE_SET'])).toEqual(
      cardLibrary.cards
        .filter(card => card.validFromSeason <= 1)
        .map(card => card.id)
    )
    expect(
      mostRecentConquestV2RewardTime(
        FIRST_RUN,
        new Date(FIRST_RUN.getTime() + 3 * WEEK_MS + 1)
      )?.toISOString()
    ).toBe(new Date(FIRST_RUN.getTime() + 3 * WEEK_MS).toISOString())
  })

  it('refuses activation that could deduct points without an off-chain item', async () => {
    await setupPlayer('treasure-guard', 250)
    await enableSchedule()

    await expect(
      runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).rejects.toThrow('deduct points without an off-chain item')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = 'treasure-guard' AND event_id = 2`
      ).first('current_points')
    ).toBe(250)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM conquest_v2_reward_cycles'
      ).first('count')
    ).toBe(0)
  })

  it('advertises only enabled off-chain Silver and never legacy USDC', async () => {
    expect(
      await conquestV2OffchainTreasureInfo(env.AUTH_DB, SNAPSHOT_NOW)
    ).toEqual(
      Object.fromEntries(
        Array.from({ length: 11 }, (_, level) => [
          level,
          { amountSilver: 0, amountUSDC: 0 }
        ])
      )
    )
    await setWeightPerSilver(1)
    await enableSchedule()
    const info = await conquestV2OffchainTreasureInfo(env.AUTH_DB, SNAPSHOT_NOW)
    expect(info[0]).toEqual({ amountSilver: 0, amountUSDC: 0 })
    expect(info[1]).toEqual({ amountSilver: 1, amountUSDC: 0 })
    expect(info[10]).toEqual({ amountSilver: 218, amountUSDC: 0 })
    expect(Object.values(info).every(value => value.amountUSDC === 0)).toBe(
      true
    )
  })

  it('rolls over points once, delays delivery, and grants only D1 Silvers', async () => {
    await setupPlayer('treasure-player', 1_600)
    await setWeightPerSilver(1)
    await enableSchedule()

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).toMatchObject({ status: 'awaiting_delivery', delivered: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points, total_points FROM player_conquest_points
         WHERE user_id = 'treasure-player' AND event_id = 2`
      ).first()
    ).toEqual({ current_points: 100, total_points: 1_600 })
    expect(await silverTotal('treasure-player')).toBe(0)

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, DELIVERY_NOW)
    ).toMatchObject({ status: 'completed', delivered: 1 })
    expect(await silverTotal('treasure-player')).toBe(6)

    const award = await env.AUTH_DB.prepare(
      `SELECT silver_card_ids_json, legacy_usdc_micros_audit_only
       FROM player_conquest_v2_reward_awards
       WHERE user_id = 'treasure-player'`
    ).first<{
      silver_card_ids_json: string
      legacy_usdc_micros_audit_only: number
    }>()
    const cardIds = JSON.parse(award!.silver_card_ids_json) as number[]
    expect(cardIds).toHaveLength(6)
    expect(
      cardIds.every(cardId =>
        conquestV2RewardCardIds(31, ['HEXBOUND_INVASION']).includes(cardId)
      )
    ).toBe(true)
    expect(award!.legacy_usdc_micros_audit_only).toBe(100_000_000)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items
         WHERE user_id = 'treasure-player'
           AND item_type IN ('SW_CRYSTALS', 'USDC')`
      ).first('count')
    ).toBe(0)

    const notification = await env.AUTH_DB.prepare(
      `SELECT payload, push_enabled FROM player_notifications
       WHERE user_id = 'treasure-player'
         AND notification_type = 'CONQUEST_V2_REWARD'`
    ).first<{ payload: string; push_enabled: number }>()
    expect(JSON.parse(notification!.payload).conquestV2Reward).toMatchObject({
      season: 31,
      week: 2,
      treasureLevel: 3,
      amountUSDC: 0
    })
    expect(notification!.push_enabled).toBe(1)
    expect(
      Object.values(
        JSON.parse(notification!.payload).conquestV2Reward.silverCardAmounts
      ).reduce((sum: number, count) => sum + Number(count), 0)
    ).toBe(6)

    expect(
      await new ContentRepository(env.AUTH_DB).listNotifications(
        'treasure-player'
      )
    ).toEqual([
      expect.objectContaining({
        type: 'CONQUEST_V2_REWARD',
        conquestV2Reward: expect.objectContaining({ amountUSDC: 0 })
      })
    ])
    const feed = await new PlayerRpcRepository(env.AUTH_DB).feed(
      'identity:treasure-player'
    )
    expect(feed.res).toEqual([
      expect.objectContaining({
        type: 'REWARD',
        tokenIds: expect.arrayContaining(cardIds.map(id => 65_536 + id))
      })
    ])

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, DELIVERY_NOW)
    ).toMatchObject({ status: 'not_due', delivered: 0 })
    expect(await silverTotal('treasure-player')).toBe(6)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = 'treasure-player' AND event_id = 2`
      ).first('current_points')
    ).toBe(100)
  })

  it('rolls back a failed grant and retries without double inventory', async () => {
    await setupPlayer('treasure-retry', 250)
    await setWeightPerSilver(1)
    await enableSchedule(0)
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_conquest_v2_reward_grant
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'conquest-v2:%'
       BEGIN
         SELECT RAISE(ABORT, 'injected Conquest V2 reward failure');
       END`
    ).run()

    await expect(
      runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).rejects.toThrow('injected Conquest V2 reward failure')
    expect(await silverTotal('treasure-retry')).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_conquest_v2_reward_awards'
      ).first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT attempt_number, error
         FROM conquest_v2_reward_cycle_failures`
      ).first()
    ).toEqual({
      attempt_number: 1,
      error: expect.stringContaining('injected Conquest V2 reward failure')
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = 'treasure-retry' AND event_id = 2`
      ).first('current_points')
    ).toBe(0)

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_conquest_v2_reward_grant'
    ).run()
    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).toMatchObject({ status: 'completed', delivered: 1 })
    expect(await silverTotal('treasure-retry')).toBe(1)
  })

  it('keeps schedules and reward evidence immutable', async () => {
    await setupPlayer('treasure-audit', 250)
    await setWeightPerSilver(1)
    await enableSchedule(0)
    await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_v2_reward_schedule_versions SET reason = 'rewrite'
         WHERE version = 1`
      ).run()
    ).rejects.toThrow('schedule versions are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_v2_reward_awards
         SET legacy_usdc_micros_audit_only = 0`
      ).run()
    ).rejects.toThrow('reward awards are immutable')
  })
})
