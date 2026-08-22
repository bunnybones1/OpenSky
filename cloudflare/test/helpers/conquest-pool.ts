interface TestConquestPool {
  version: string
  startsAt: string
  endsAt: string
  createdAt: string
  activatedAt?: string
  silver: number[]
  gold: number[]
}

export const conquestPoolManifest = (
  silver: number[],
  gold: number[]
): string =>
  JSON.stringify([
    ...[...silver]
      .sort((left, right) => left - right)
      .map(cardId => `SW_SILVER_CARDS:${cardId}`),
    ...[...gold]
      .sort((left, right) => left - right)
      .map(cardId => `SW_GOLD_CARDS:${cardId}`)
  ])

export const approvedConquestPoolStatements = (
  database: D1Database,
  pool: TestConquestPool
): D1PreparedStatement[] => {
  const activatedAt = pool.activatedAt ?? pool.createdAt
  const statements = [
    database
      .prepare(
        `INSERT INTO conquest_reward_pools
           (version, status, starts_at, ends_at, created_at)
         VALUES (?, 'DRAFT', ?, ?, ?)`
      )
      .bind(pool.version, pool.startsAt, pool.endsAt, pool.createdAt)
  ]
  for (const cardId of pool.silver) {
    statements.push(
      database
        .prepare(
          `INSERT INTO conquest_reward_pool_cards
             (pool_version, item_type, card_id)
           VALUES (?, 'SW_SILVER_CARDS', ?)`
        )
        .bind(pool.version, cardId)
    )
  }
  for (const cardId of pool.gold) {
    statements.push(
      database
        .prepare(
          `INSERT INTO conquest_reward_pool_cards
             (pool_version, item_type, card_id)
           VALUES (?, 'SW_GOLD_CARDS', ?)`
        )
        .bind(pool.version, cardId)
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO conquest_reward_pool_activations
           (pool_version, status, card_manifest_json, expected_silver_count,
            expected_gold_count, created_by_user_id, proposal_reason,
            review_reference, created_at)
         VALUES (?, 'DRAFT', ?, ?, ?, 'system:test-author',
                 'source-faithful test pool', 'test:conquest-pool', ?)`
      )
      .bind(
        pool.version,
        conquestPoolManifest(pool.silver, pool.gold),
        pool.silver.length,
        pool.gold.length,
        pool.createdAt
      ),
    database
      .prepare(
        `UPDATE conquest_reward_pool_activations
         SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
             activation_reason = 'independent test review', activated_at = ?
         WHERE pool_version = ?`
      )
      .bind(activatedAt, pool.version),
    database
      .prepare(
        `UPDATE conquest_reward_pools SET status = 'ACTIVE'
         WHERE version = ?`
      )
      .bind(pool.version)
  )
  return statements
}
