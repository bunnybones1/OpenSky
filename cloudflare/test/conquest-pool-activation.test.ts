import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  approvedConquestPoolStatements,
  conquestPoolManifest
} from './helpers/conquest-pool'

const STARTS_AT = '2026-08-12T00:00:00.000Z'
const ENDS_AT = '2026-08-19T00:00:00.000Z'
const CREATED_AT = '2026-08-11T00:00:00.000Z'

let version: string

const draftPool = async (
  silver = [6, 68],
  gold = [136],
  window = {
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    createdAt: CREATED_AT
  }
) => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO conquest_reward_pools
         (version, status, starts_at, ends_at, created_at)
       VALUES (?, 'DRAFT', ?, ?, ?)`
    ).bind(version, window.startsAt, window.endsAt, window.createdAt),
    ...silver.map(cardId =>
      env.AUTH_DB
        .prepare(
          `INSERT INTO conquest_reward_pool_cards
             (pool_version, item_type, card_id)
           VALUES (?, 'SW_SILVER_CARDS', ?)`
        )
        .bind(version, cardId)
    ),
    ...gold.map(cardId =>
      env.AUTH_DB
        .prepare(
          `INSERT INTO conquest_reward_pool_cards
             (pool_version, item_type, card_id)
           VALUES (?, 'SW_GOLD_CARDS', ?)`
        )
        .bind(version, cardId)
    )
  ])
}

const propose = (manifest = conquestPoolManifest([6, 68], [136])) =>
  env.AUTH_DB.prepare(
    `INSERT INTO conquest_reward_pool_activations
       (pool_version, status, card_manifest_json, expected_silver_count,
        expected_gold_count, created_by_user_id, proposal_reason,
        review_reference, created_at)
     VALUES (?, 'DRAFT', ?, 2, 1, 'operator:author',
             'reviewed source-equivalent candidates', 'review:pool-test', ?)`
  )
    .bind(version, manifest, CREATED_AT)
    .run()

beforeEach(async () => {
  version = `pool-approval-${crypto.randomUUID()}`
  await env.AUTH_DB.prepare(
    `UPDATE conquest_reward_pools SET status = 'RETIRED'
     WHERE status = 'ACTIVE'`
  ).run()
})

describe('Conquest reward-pool approval', () => {
  it('requires draft creation and exact independently reviewed activation', async () => {
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO conquest_reward_pools
           (version, status, starts_at, ends_at, created_at)
         VALUES (?, 'ACTIVE', ?, ?, ?)`
      )
        .bind(version, STARTS_AT, ENDS_AT, CREATED_AT)
        .run()
    ).rejects.toThrow('Conquest reward pools must start as valid drafts')

    await draftPool()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pools SET status = 'ACTIVE'
         WHERE version = ?`
      )
        .bind(version)
        .run()
    ).rejects.toThrow('Conquest reward pool lifecycle transition is invalid')

    await propose()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pool_activations
         SET status = 'ACTIVE', activated_by_user_id = 'operator:author',
             activation_reason = 'self review', activated_at = ?
         WHERE pool_version = ?`
      )
        .bind(CREATED_AT, version)
        .run()
    ).rejects.toThrow('Conquest reward pool activation is invalid')

    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pool_activations
         SET status = 'ACTIVE', activated_by_user_id = 'operator:reviewer',
             activation_reason = 'independent manifest review', activated_at = ?
         WHERE pool_version = ?`
      ).bind(CREATED_AT, version),
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pools SET status = 'ACTIVE'
         WHERE version = ?`
      ).bind(version)
    ])

    expect(
      await env.AUTH_DB.prepare(
        `SELECT version, expected_silver_count, expected_gold_count
         FROM conquest_approved_active_reward_pools WHERE version = ?`
      )
        .bind(version)
        .first()
    ).toEqual({
      version,
      expected_silver_count: 2,
      expected_gold_count: 1
    })
  })

  it('freezes the exact manifest as soon as it is proposed', async () => {
    await draftPool()
    await expect(propose(conquestPoolManifest([6], [136]))).rejects.toThrow(
      'Conquest reward pool proposal is invalid'
    )
    await propose()

    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO conquest_reward_pool_cards
           (pool_version, item_type, card_id)
         VALUES (?, 'SW_SILVER_CARDS', 69)`
      )
        .bind(version)
        .run()
    ).rejects.toThrow('Reviewed Conquest reward pool cards are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM conquest_reward_pool_cards
         WHERE pool_version = ? AND item_type = 'SW_SILVER_CARDS'
           AND card_id = 6`
      )
        .bind(version)
        .run()
    ).rejects.toThrow('Reviewed Conquest reward pool cards are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM conquest_reward_pool_activations WHERE pool_version = ?`
      )
        .bind(version)
        .run()
    ).rejects.toThrow('Conquest reward pool approvals are immutable')
  })

  it('rejects invalid catalog IDs and empty Silver or Gold pools', async () => {
    await expect(draftPool([999_999], [136])).rejects.toThrow(
      'Conquest reward pool card is invalid'
    )

    version = `pool-approval-${crypto.randomUUID()}`
    await draftPool([6], [])
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO conquest_reward_pool_activations
           (pool_version, status, card_manifest_json, expected_silver_count,
            expected_gold_count, created_by_user_id, proposal_reason,
            review_reference, created_at)
         VALUES (?, 'DRAFT', ?, 1, 0, 'operator:author',
                 'missing Gold', 'review:missing-gold', ?)`
      )
        .bind(version, conquestPoolManifest([6], []), CREATED_AT)
        .run()
    ).rejects.toThrow()
  })

  it('keeps a fully approved pool invisible until its lifecycle is active', async () => {
    const statements = approvedConquestPoolStatements(env.AUTH_DB, {
      version,
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      createdAt: CREATED_AT,
      silver: [6],
      gold: [136]
    })
    await env.AUTH_DB.batch(statements.slice(0, -1))
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM conquest_approved_active_reward_pools WHERE version = ?`
      )
        .bind(version)
        .first()
    ).toEqual({ count: 0 })
  })

  it('rejects overlapping inclusive windows while allowing a strictly later pool', async () => {
    const firstVersion = version
    await env.AUTH_DB.batch(
      approvedConquestPoolStatements(env.AUTH_DB, {
        version: firstVersion,
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        createdAt: CREATED_AT,
        silver: [6, 68],
        gold: [136]
      })
    )

    version = `pool-overlap-${crypto.randomUUID()}`
    await draftPool([6, 68], [136], {
      startsAt: ENDS_AT,
      endsAt: '2026-08-26T00:00:00.000Z',
      createdAt: CREATED_AT
    })
    await propose()
    await expect(
      env.AUTH_DB.batch([
        env.AUTH_DB.prepare(
          `UPDATE conquest_reward_pool_activations
           SET status = 'ACTIVE', activated_by_user_id = 'operator:reviewer',
               activation_reason = 'boundary review', activated_at = ?
           WHERE pool_version = ?`
        ).bind(CREATED_AT, version),
        env.AUTH_DB.prepare(
          `UPDATE conquest_reward_pools SET status = 'ACTIVE'
           WHERE version = ?`
        ).bind(version)
      ])
    ).rejects.toThrow('Conquest reward pool windows cannot overlap')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT pool.status, activation.status AS activation_status
         FROM conquest_reward_pools pool
         JOIN conquest_reward_pool_activations activation
           ON activation.pool_version = pool.version
         WHERE pool.version = ?`
      )
        .bind(version)
        .first()
    ).toEqual({ status: 'DRAFT', activation_status: 'DRAFT' })

    version = `pool-non-overlap-${crypto.randomUUID()}`
    await draftPool([6, 68], [136], {
      startsAt: '2026-08-19T00:00:00.001Z',
      endsAt: '2026-08-26T00:00:00.000Z',
      createdAt: CREATED_AT
    })
    await propose()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pool_activations
         SET status = 'ACTIVE', activated_by_user_id = 'operator:reviewer',
             activation_reason = 'non-overlapping review', activated_at = ?
         WHERE pool_version = ?`
      ).bind(CREATED_AT, version),
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pools SET status = 'ACTIVE'
         WHERE version = ?`
      ).bind(version)
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT version FROM conquest_approved_active_reward_pools
         WHERE version IN (?, ?) ORDER BY version`
      )
        .bind(firstVersion, version)
        .all()
    ).toMatchObject({ results: [{ version: firstVersion }, { version }] })
  })
})
