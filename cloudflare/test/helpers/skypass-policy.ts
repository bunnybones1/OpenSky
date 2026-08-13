import {
  SKYPASS_REWARD_POLICY_HASH,
  SKYPASS_REWARD_POLICY_VERSION
} from '../../src/skypass-reward-policy'

export interface TestSkypassReward {
  level: number
  tier: 1 | 2
  itemType: number
  amount: number
  isStarter?: 0 | 1
  attributes?: Record<string, unknown> | null
  isInfinite?: 0 | 1
}

export const createTestSkypassPolicy = async (
  database: D1Database,
  season: number,
  rewards: TestSkypassReward[],
  options: { activate?: boolean; author?: string; reviewer?: string } = {}
) => {
  const version =
    ((await database
      .prepare(
        `SELECT MAX(version) AS version FROM skypass_reward_policy_versions
         WHERE season = ?`
      )
      .bind(season)
      .first<number>('version')) ?? 0) + 1
  const createdAt = new Date().toISOString()
  const mutationId = crypto.randomUUID()
  const author = options.author ?? 'system:test-skypass-author'
  const reviewer = options.reviewer ?? 'system:test-skypass-reviewer'
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO skypass_reward_policy_versions
           (season, version, status, mutation_id, source_origin,
            content_sha256, reward_count, fulfillment_policy_version,
            fulfillment_policy_hash, created_by_user_id,
            activated_by_user_id, activation_reason, review_reference,
            created_at, activated_at)
         VALUES (?, ?, 'DRAFT', ?, 'test:fixture',
                 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                 ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL)`
      )
      .bind(
        season,
        version,
        mutationId,
        rewards.length,
        SKYPASS_REWARD_POLICY_VERSION,
        SKYPASS_REWARD_POLICY_HASH,
        author,
        createdAt
      )
  ]
  for (const [index, reward] of rewards.entries()) {
    statements.push(
      database
        .prepare(
          `INSERT INTO skypass_rewards
             (level, season, tier, item_type, amount, is_starter, attributes,
              updated_at, is_infinite, policy_version, policy_ordinal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING id`
        )
        .bind(
          reward.level,
          season,
          reward.tier,
          reward.itemType,
          reward.amount,
          reward.isStarter ?? 0,
          reward.attributes === undefined || reward.attributes === null
            ? null
            : JSON.stringify(reward.attributes),
          createdAt,
          reward.isInfinite ?? (index === rewards.length - 1 ? 1 : 0),
          version,
          index + 1
        )
    )
  }
  await database.batch(statements)
  if (options.activate !== false) {
    await database
      .prepare(
        `UPDATE skypass_reward_policy_versions
         SET status = 'ACTIVE', activated_by_user_id = ?,
             activation_reason = 'test exact-policy review',
             review_reference = 'test:skypass-policy', activated_at = ?
         WHERE season = ? AND version = ?`
      )
      .bind(reviewer, createdAt, season, version)
      .run()
  }
  const rows = await database
    .prepare(
      `SELECT id, level FROM skypass_rewards
       WHERE season = ? AND policy_version = ? ORDER BY policy_ordinal`
    )
    .bind(season, version)
    .all<{ id: number; level: number }>()
  return {
    version,
    policyHash: SKYPASS_REWARD_POLICY_HASH,
    rows: rows.results
  }
}

export const clearTestSkypassPolicies = async (
  database: D1Database,
  seasons: number[]
) => {
  if (!seasons.length) return
  const placeholders = seasons.map(() => '?').join(',')
  await database.batch([
    database.prepare('DROP TRIGGER skypass_rewards_policy_delete_guard'),
    database.prepare('DROP TRIGGER skypass_reward_policy_versions_no_delete')
  ])
  await database
    .prepare(`DELETE FROM skypass_rewards WHERE season IN (${placeholders})`)
    .bind(...seasons)
    .run()
  await database
    .prepare(
      `DELETE FROM skypass_reward_policy_versions
       WHERE season IN (${placeholders})`
    )
    .bind(...seasons)
    .run()
  await database.batch([
    database.prepare(
      `CREATE TRIGGER skypass_rewards_policy_delete_guard
       BEFORE DELETE ON skypass_rewards
       WHEN OLD.policy_version IS NOT NULL
       BEGIN
         SELECT RAISE(ABORT, 'Versioned SkyPass reward rows are immutable');
       END`
    ),
    database.prepare(
      `CREATE TRIGGER skypass_reward_policy_versions_no_delete
       BEFORE DELETE ON skypass_reward_policy_versions
       BEGIN
         SELECT RAISE(ABORT, 'SkyPass reward policy versions are immutable');
       END`
    )
  ])
}
