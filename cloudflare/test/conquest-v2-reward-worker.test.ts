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
import {
  calculatedConquestV2RewardPolicyHash,
  CONQUEST_V2_REWARD_POLICY_HASH,
  CONQUEST_V2_REWARD_POLICY_VERSION
} from '../src/conquest-v2-reward-policy'
import {
  CONQUEST_V2_TREASURE_TOTAL_POINTS,
  CONQUEST_V2_TREASURE_TOTAL_WEIGHTS
} from '../src/conquest-v2-treasure'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const FIRST_RUN = new Date('2026-08-10T01:00:00.000Z')
const DELIVERY = new Date(FIRST_RUN.getTime() + DAY_MS)
const SNAPSHOT_NOW = new Date(FIRST_RUN.getTime() + 60_000)
const DELIVERY_NOW = new Date(DELIVERY.getTime() + 60_000)

const setupPlayer = async (
  userId: string,
  points: number,
  userKind: 'PLAYER' | 'SYSTEM' = 'PLAYER'
) => {
  const now = FIRST_RUN.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at, user_kind)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, now, now, userKind)
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
  const settings = await env.AUTH_DB.prepare(
    `SELECT version, mutation_id, weight_per_silver_card
     FROM conquest_v2_pool_settings WHERE singleton = 1`
  ).first<{
    version: number
    mutation_id: string
    weight_per_silver_card: number
  }>()
  const silverCounts = Array.from({ length: 11 }, (_, level) =>
    conquestV2SilverCardCount(settings!.weight_per_silver_card, level)
  )
  await env.AUTH_DB.prepare(
    `INSERT INTO conquest_v2_reward_schedule_activations
       (schedule_version, status, policy_version, policy_hash,
        settings_version, settings_mutation_id, weight_per_silver_card,
        silver_counts_json, created_by_user_id, activated_by_user_id,
        reason, review_reference, created_at, activated_at)
     VALUES (1, 'DRAFT', ?, ?, ?, ?, ?, ?, 'system:test-author', NULL,
             'test policy', 'test:review', ?, NULL)`
  )
    .bind(
      CONQUEST_V2_REWARD_POLICY_VERSION,
      CONQUEST_V2_REWARD_POLICY_HASH,
      settings!.version,
      settings!.mutation_id,
      settings!.weight_per_silver_card,
      JSON.stringify(silverCounts),
      createdAt
    )
    .run()
  await env.AUTH_DB.prepare(
    `UPDATE conquest_v2_reward_schedule_activations
     SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
         activated_at = ? WHERE schedule_version = 1`
  )
    .bind(createdAt)
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
      'DROP TRIGGER IF EXISTS reject_conquest_v2_reward_completion'
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
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS conquest_v2_reward_schedule_activations_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS conquest_v2_reward_cycle_policy_receipts_no_delete'
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
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_cycle_policy_receipts'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_cycles'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_schedule_activations'),
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_reward_schedule_versions'),
    env.AUTH_DB.prepare(
      `DELETE FROM users
       WHERE id LIKE 'treasure-%' OR id LIKE 'system:treasure-%'`
    ),
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
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER conquest_v2_reward_schedule_activations_no_delete
       BEFORE DELETE ON conquest_v2_reward_schedule_activations
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward policy activations are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER conquest_v2_reward_cycle_policy_receipts_no_delete
       BEFORE DELETE ON conquest_v2_reward_cycle_policy_receipts
       BEGIN
         SELECT RAISE(ABORT, 'Conquest V2 reward cycle policy receipts are immutable');
       END`
    )
  ])
})

describe('Conquest V2 off-chain weekly rewards', () => {
  it('pins the approved algorithm to source thresholds, math, catalog, and off-chain mapping', async () => {
    expect(await calculatedConquestV2RewardPolicyHash()).toBe(
      CONQUEST_V2_REWARD_POLICY_HASH
    )
  })

  it('keeps an enabled cadence dormant without two-actor exact-policy approval', async () => {
    await setWeightPerSilver(1)
    const createdAt = new Date(FIRST_RUN.getTime() - DAY_MS).toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO conquest_v2_reward_schedule_versions
         (version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
          first_season, first_week, delivery_delay_seconds,
          reward_card_sets_json, starts_at, reason, created_at)
       VALUES (1, 1, ?, ?, ?, ?, 31, 2, 86400,
               '["HEXBOUND_INVASION"]', ?, 'test schedule', ?)`
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
    expect(await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)).toEqual({
      status: 'disabled',
      delivered: 0
    })
  })

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

  it('pins D1 policy ranges to the generated card catalog and fallback pool', async () => {
    const catalog = await env.AUTH_DB.prepare(
      `SELECT card_id, card_set, valid_from_season
       FROM conquest_v2_reward_policy_cards
       WHERE policy_version = ? AND policy_hash = ? ORDER BY card_id`
    )
      .bind(
        CONQUEST_V2_REWARD_POLICY_VERSION,
        CONQUEST_V2_REWARD_POLICY_HASH
      )
      .all<{
        card_id: number
        card_set: string
        valid_from_season: number
      }>()
    expect(catalog.results).toEqual(
      [...cardLibrary.cards]
        .sort((left, right) => left.id - right.id)
        .map(card => ({
          card_id: card.id,
          card_set: card.set,
          valid_from_season: card.validFromSeason
        }))
    )

    for (const [season, sets] of [
      [1, ['HEXBOUND_INVASION']],
      [31, ['HEXBOUND_INVASION']],
      [31, ['NOT_A_SOURCE_SET']],
      [62, ['CORE_SET', 'STARTER_EXPANSION']]
    ] as const) {
      const placeholders = sets.map(() => '?').join(', ')
      const selectedCount = Number(
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM conquest_v2_reward_policy_cards
           WHERE policy_version = ? AND policy_hash = ?
             AND valid_from_season <= ? AND card_set IN (${placeholders})`
        )
          .bind(
            CONQUEST_V2_REWARD_POLICY_VERSION,
            CONQUEST_V2_REWARD_POLICY_HASH,
            season,
            ...sets
          )
          .first('count')
      )
      const rows = await env.AUTH_DB.prepare(
        `SELECT card_id FROM conquest_v2_reward_policy_cards
         WHERE policy_version = ? AND policy_hash = ?
           AND valid_from_season <= ?
           AND (${selectedCount} = 0 OR card_set IN (${placeholders}))
         ORDER BY card_id`
      )
        .bind(
          CONQUEST_V2_REWARD_POLICY_VERSION,
          CONQUEST_V2_REWARD_POLICY_HASH,
          season,
          ...sets
        )
        .all<{ card_id: number }>()
      expect(rows.results.map(row => row.card_id)).toEqual(
        conquestV2RewardCardIds(season, [...sets])
      )
    }
  })

  it('refuses activation that could deduct points without an off-chain item', async () => {
    await setupPlayer('treasure-guard', 250)
    await expect(
      enableSchedule()
    ).rejects.toThrow('must start as a valid draft')
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

  it('requires a distinct reviewer and exact current settings snapshot', async () => {
    await setWeightPerSilver(1)
    const createdAt = new Date(FIRST_RUN.getTime() - DAY_MS).toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO conquest_v2_reward_schedule_versions
         (version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
          first_season, first_week, delivery_delay_seconds,
          reward_card_sets_json, starts_at, reason, created_at)
       VALUES (1, 1, ?, ?, ?, ?, 31, 2, 86400,
               '["HEXBOUND_INVASION"]', ?, 'test schedule', ?)`
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
    const settings = await env.AUTH_DB.prepare(
      `SELECT version, mutation_id, weight_per_silver_card
       FROM conquest_v2_pool_settings WHERE singleton = 1`
    ).first<{
      version: number
      mutation_id: string
      weight_per_silver_card: number
    }>()
    const silverCounts = Array.from({ length: 11 }, (_, level) =>
      conquestV2SilverCardCount(settings!.weight_per_silver_card, level)
    )
    await env.AUTH_DB.prepare(
      `INSERT INTO conquest_v2_reward_schedule_activations
         (schedule_version, status, policy_version, policy_hash,
          settings_version, settings_mutation_id, weight_per_silver_card,
          silver_counts_json, created_by_user_id, activated_by_user_id,
          reason, review_reference, created_at, activated_at)
       VALUES (1, 'DRAFT', ?, ?, ?, ?, ?, ?, 'system:test-author', NULL,
               'test policy', 'test:review', ?, NULL)`
    )
      .bind(
        CONQUEST_V2_REWARD_POLICY_VERSION,
        CONQUEST_V2_REWARD_POLICY_HASH,
        settings!.version,
        settings!.mutation_id,
        settings!.weight_per_silver_card,
        JSON.stringify(silverCounts),
        createdAt
      )
      .run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_v2_reward_schedule_activations
         SET status = 'ACTIVE', activated_by_user_id = 'system:test-author',
             activated_at = ? WHERE schedule_version = 1`
      )
        .bind(createdAt)
        .run()
    ).rejects.toThrow('policy activation is invalid')
    await setWeightPerSilver(2)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_v2_reward_schedule_activations
         SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
             activated_at = ? WHERE schedule_version = 1`
      )
        .bind(createdAt)
        .run()
    ).rejects.toThrow('policy activation is invalid')
  })

  it('rejects a caller-selected cycle card pool before snapshotting points', async () => {
    await setWeightPerSilver(1)
    await enableSchedule()
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO conquest_v2_reward_cycles
           (schedule_version, scheduled_at, delivery_at, season, week,
            random_seed, reward_card_sets_json, eligible_card_ids_json,
            pool_amount, weight_per_silver_card, status, attempt_count,
            started_at)
         VALUES (1, ?, ?, 31, 2, ?, '["HEXBOUND_INVASION"]', '[121]',
                 100, 1, 'PREPARING', 0, ?)`
      )
        .bind(
          FIRST_RUN.toISOString(),
          DELIVERY.toISOString(),
          crypto.randomUUID(),
          SNAPSHOT_NOW.toISOString()
        )
        .run()
    ).rejects.toThrow('Conquest V2 reward cycle creation is invalid')
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

    await setWeightPerSilver(2)

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, DELIVERY_NOW)
    ).toMatchObject({ status: 'completed', delivered: 1 })
    expect(await silverTotal('treasure-player')).toBe(6)

    const award = await env.AUTH_DB.prepare(
      `SELECT id, silver_card_ids_json, legacy_usdc_micros_audit_only,
              application_status, completed_at
       FROM player_conquest_v2_reward_awards
       WHERE user_id = 'treasure-player'`
    ).first<{
      id: number
      silver_card_ids_json: string
      legacy_usdc_micros_audit_only: number
      application_status: string
      completed_at: string
    }>()
    const cardIds = JSON.parse(award!.silver_card_ids_json) as number[]
    expect(cardIds).toHaveLength(6)
    expect(
      cardIds.every(cardId =>
        conquestV2RewardCardIds(31, ['HEXBOUND_INVASION']).includes(cardId)
      )
    ).toBe(true)
    expect(award!.legacy_usdc_micros_audit_only).toBe(100_000_000)
    expect(award!.application_status).toBe('APPLIED')
    expect(award!.completed_at).toBe(DELIVERY_NOW.toISOString())
    const grants = await env.AUTH_DB.prepare(
      `SELECT token_id, quantity, before_balance, after_balance
       FROM player_conquest_v2_reward_inventory_grants
       WHERE award_id = ? ORDER BY token_id`
    )
      .bind(award!.id)
      .all<{
        token_id: number
        quantity: number
        before_balance: number
        after_balance: number
      }>()
    expect(grants.results.reduce((sum, grant) => sum + grant.quantity, 0)).toBe(
      6
    )
    expect(
      grants.results.every(
        grant =>
          grant.before_balance === 0 &&
          grant.after_balance === grant.quantity &&
          cardIds.filter(cardId => cardId === grant.token_id).length ===
            grant.quantity
      )
    ).toBe(true)
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
        tokenIds: expect.arrayContaining(cardIds.map(id => 65_536 + id)),
        cards: expect.arrayContaining([
          expect.objectContaining({
            id: cardIds[0],
            itemType: 'SW_SILVER_CARDS'
          })
        ])
      })
    ])

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, DELIVERY_NOW)
    ).toMatchObject({ status: 'disabled', delivered: 0 })
    expect(await silverTotal('treasure-player')).toBe(6)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = 'treasure-player' AND event_id = 2`
      ).first('current_points')
    ).toBe(100)
  })

  it('settles the source level-ten band in one bounded set-based grant batch', async () => {
    await setupPlayer(
      'treasure-level-ten',
      CONQUEST_V2_TREASURE_TOTAL_POINTS[10]
    )
    await setWeightPerSilver(1)
    await enableSchedule(0)

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).toMatchObject({ status: 'completed', delivered: 1 })
    expect(await silverTotal('treasure-level-ten')).toBe(218)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT points_before, points_accounted, points_remaining,
                treasure_level, treasure_weight
         FROM conquest_v2_reward_entries
         WHERE user_id = 'treasure-level-ten'`
      ).first()
    ).toEqual({
      points_before: CONQUEST_V2_TREASURE_TOTAL_POINTS[10],
      points_accounted: CONQUEST_V2_TREASURE_TOTAL_POINTS[10],
      points_remaining: 0,
      treasure_level: 10,
      treasure_weight: CONQUEST_V2_TREASURE_TOTAL_WEIGHTS[10]
    })
    const grants = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS distinct_cards, SUM(quantity) AS total_cards
       FROM player_conquest_v2_reward_inventory_grants`
    ).first<{ distinct_cards: number; total_cards: number }>()
    expect(grants!.total_cards).toBe(218)
    expect(grants!.distinct_cards).toBeLessThanOrEqual(75)
  })

  it('finishes a snapshotted cycle after a newer schedule disables future rewards', async () => {
    await setupPlayer('treasure-disabled-successor', 250)
    await setWeightPerSilver(1)
    await enableSchedule()

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).toMatchObject({ status: 'awaiting_delivery', delivered: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = 'treasure-disabled-successor' AND event_id = 2`
      ).first('current_points')
    ).toBe(0)

    const disabledAt = new Date(SNAPSHOT_NOW.getTime() + 60_000).toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO conquest_v2_reward_schedule_versions
         (version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
          first_season, first_week, delivery_delay_seconds,
          reward_card_sets_json, starts_at, reason, created_at)
       VALUES (2, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
               ?, 'test emergency disable', ?)`
    )
      .bind(disabledAt, disabledAt)
      .run()

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, DELIVERY_NOW)
    ).toMatchObject({ status: 'completed', delivered: 1 })
    expect(await silverTotal('treasure-disabled-successor')).toBe(1)
    expect(
      await runDueConquestV2Rewards(
        env.AUTH_DB,
        new Date(FIRST_RUN.getTime() + WEEK_MS + 60_000)
      )
    ).toEqual({ status: 'disabled', delivered: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM conquest_v2_reward_cycles`
      ).first('count')
    ).toBe(1)
  })

  it('does not snapshot operational system points into player reward cycles', async () => {
    const userId = 'system:treasure-readiness-test'
    await setupPlayer(userId, 1_600, 'SYSTEM')
    await setWeightPerSilver(1)
    await enableSchedule()

    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).toMatchObject({ status: 'awaiting_delivery', delivered: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = ? AND event_id = 2`
      )
        .bind(userId)
        .first('current_points')
    ).toBe(1_600)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM conquest_v2_reward_entries
         WHERE user_id = ?`
      )
        .bind(userId)
        .first('count')
    ).toBe(0)
  })

  it('makes approval inert when settings change before a cycle starts', async () => {
    await setupPlayer('treasure-settings-drift', 250)
    await setWeightPerSilver(1)
    await enableSchedule()
    await setWeightPerSilver(2)

    expect(await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)).toEqual({
      status: 'disabled',
      delivered: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT current_points FROM player_conquest_points
         WHERE user_id = 'treasure-settings-drift' AND event_id = 2`
      ).first('current_points')
    ).toBe(250)
  })

  it('rejects direct under-awards and cards outside the frozen pool', async () => {
    await setupPlayer('treasure-policy-attack', 1_500)
    await setWeightPerSilver(1)
    await enableSchedule()
    const snapshot = await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    expect(snapshot.status).toBe('awaiting_delivery')
    await env.AUTH_DB.prepare(
      `UPDATE conquest_v2_reward_cycles SET status = 'DELIVERING'
       WHERE id = ? AND status = 'PENDING_DELIVERY'`
    )
      .bind(snapshot.cycleId)
      .run()

    for (const [suffix, cardIds] of [
      ['under', [121]],
      ['pool', Array.from({ length: 6 }, () => 999_999)]
    ] as const) {
      await expect(
        env.AUTH_DB.prepare(
          `INSERT INTO player_conquest_v2_reward_awards
             (award_key, cycle_id, user_id, treasure_level,
              silver_card_ids_json, legacy_usdc_micros_audit_only,
              delivery_key, awarded_at, application_status, completed_at)
           VALUES (?, ?, 'treasure-policy-attack', 3, ?, 0, ?, ?,
                   'PREPARING', NULL)`
        )
          .bind(
            `${snapshot.cycleId}:${suffix}`,
            snapshot.cycleId,
            JSON.stringify(cardIds),
            crypto.randomUUID(),
            DELIVERY_NOW.toISOString()
          )
          .run()
      ).rejects.toThrow('active Conquest V2 reward policy receipt required')
    }
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

  it('rolls back all evidence when reward receipt completion fails', async () => {
    await setupPlayer('treasure-receipt-retry', 250)
    await setWeightPerSilver(1)
    await enableSchedule(0)
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_conquest_v2_reward_completion
       BEFORE UPDATE OF application_status
       ON player_conquest_v2_reward_awards
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected Conquest V2 receipt failure');
       END`
    ).run()

    await expect(
      runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).rejects.toThrow('injected Conquest V2 receipt failure')
    expect(await silverTotal('treasure-receipt-retry')).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquest_v2_reward_awards) AS awards,
           (SELECT COUNT(*)
            FROM player_conquest_v2_reward_inventory_grants) AS grants,
           (SELECT COUNT(*)
            FROM player_conquest_v2_reward_feed_events) AS feed,
           (SELECT COUNT(*) FROM player_notifications
            WHERE conquest_v2_award_id IS NOT NULL) AS notifications`
      ).first()
    ).toEqual({ awards: 0, grants: 0, feed: 0, notifications: 0 })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_conquest_v2_reward_completion'
    ).run()
    expect(
      await runDueConquestV2Rewards(env.AUTH_DB, SNAPSHOT_NOW)
    ).toMatchObject({ status: 'completed', delivered: 1 })
    expect(await silverTotal('treasure-receipt-retry')).toBe(1)
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
    ).rejects.toThrow('reward receipt completion is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_v2_reward_inventory_grants
         SET after_balance = after_balance + 1`
      ).run()
    ).rejects.toThrow('reward inventory grants are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_notifications SET payload = '{}'
         WHERE conquest_v2_award_id IS NOT NULL`
      ).run()
    ).rejects.toThrow('reward notifications are immutable')
  })
})
