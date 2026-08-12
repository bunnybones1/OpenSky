import { env } from 'cloudflare:workers'
import { PaymentProvider } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { seasonFromDate } from '../src/legacy-seasons'
import {
  MobileStoreFulfillmentRepository,
  type VerifiedMobileStorePurchase
} from '../src/mobile-store-fulfillment'
import { PlayerRepository } from '../src/player'

const NOW = new Date('2026-08-12T12:00:00.000Z')
const DIGEST = 'a'.repeat(64)

const createPlayer = async (label: string): Promise<string> => {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10)
  const userId = `${label}-${suffix}`
  const displayName = `Mobile${suffix}`
  const now = NOW.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, displayName, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  return userId
}

const tickets = (
  externalTransactionId: string,
  overrides: Partial<VerifiedMobileStorePurchase> = {}
): VerifiedMobileStorePurchase => ({
  provider: PaymentProvider.GOOGLE_PLAY,
  externalTransactionId,
  productCode: 'conquest_tickets_0005',
  verificationSha256: DIGEST,
  currency: 'usd',
  totalPrice: 4.99,
  ...overrides
})

const ticketBalance = (userId: string) =>
  env.AUTH_DB.prepare(
    `SELECT balance FROM player_items
     WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
  )
    .bind(userId)
    .first<number>('balance')

describe('mobile store off-chain fulfillment authority', () => {
  it('credits the source ticket quantity and stores only immutable verification evidence', async () => {
    const userId = await createPlayer('mobile-ticket')
    const transactionId = `GPA.${crypto.randomUUID()}`
    await new MobileStoreFulfillmentRepository(env.AUTH_DB).fulfill(
      userId,
      tickets(transactionId),
      NOW
    )

    expect(await ticketBalance(userId)).toBe(5)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT provider, user_id, product_code, quantity, verification_sha256,
                currency, total_price, status
         FROM mobile_store_payments
         WHERE provider = 'GOOGLE_PLAY' AND external_transaction_id = ?`
      )
        .bind(transactionId)
        .first()
    ).toMatchObject({
      provider: 'GOOGLE_PLAY',
      user_id: userId,
      product_code: 'conquest_tickets_0005',
      quantity: 5,
      verification_sha256: DIGEST,
      currency: 'USD',
      total_price: 4.99,
      status: 'SUCCEEDED'
    })
  })

  it('makes duplicate and concurrent receipt delivery grant exactly once', async () => {
    const userId = await createPlayer('mobile-retry')
    const transactionId = `GPA.${crypto.randomUUID()}`
    const repository = new MobileStoreFulfillmentRepository(env.AUTH_DB)
    const purchase = tickets(transactionId)

    await Promise.all([
      repository.fulfill(userId, purchase, NOW),
      repository.fulfill(userId, purchase, NOW),
      repository.fulfill(userId, purchase, NOW)
    ])
    await repository.fulfill(userId, purchase, NOW)

    expect(await ticketBalance(userId)).toBe(5)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM mobile_store_payments
         WHERE provider = 'GOOGLE_PLAY' AND external_transaction_id = ?`
      )
        .bind(transactionId)
        .first<number>('count')
    ).toBe(1)
  })

  it('rejects cross-account and changed-product replay without another grant', async () => {
    const ownerId = await createPlayer('mobile-owner')
    const attackerId = await createPlayer('mobile-attacker')
    const transactionId = `GPA.${crypto.randomUUID()}`
    const repository = new MobileStoreFulfillmentRepository(env.AUTH_DB)
    await repository.fulfill(ownerId, tickets(transactionId), NOW)

    await expect(
      repository.fulfill(attackerId, tickets(transactionId), NOW)
    ).rejects.toThrow('already fulfilled')
    await expect(
      repository.fulfill(
        ownerId,
        tickets(transactionId, { productCode: 'conquest_tickets_0024' }),
        NOW
      )
    ).rejects.toThrow('already fulfilled')
    expect(await ticketBalance(ownerId)).toBe(5)
    expect(await ticketBalance(attackerId)).toBeNull()
  })

  it('grants current-season premium SkyPass without a wallet or mint', async () => {
    const userId = await createPlayer('mobile-skypass')
    await new MobileStoreFulfillmentRepository(env.AUTH_DB).fulfill(
      userId,
      {
        provider: PaymentProvider.APPLE_APP_STORE,
        externalTransactionId: crypto.randomUUID(),
        productCode: 'skypass_0001',
        verificationSha256: 'b'.repeat(64)
      },
      NOW
    )
    const season = seasonFromDate(NOW)

    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_SKYPASS' AND token_id = ?`
      )
        .bind(userId, season)
        .first<number>('balance')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT has_premium FROM player_skypass_season_stats
         WHERE user_id = ? AND season = ?`
      )
        .bind(userId, season)
        .first<number>('has_premium')
    ).toBe(1)
  })

  it('rolls back the receipt if the inventory grant fails', async () => {
    const userId = await createPlayer('mobile-rollback')
    const transactionId = `GPA.${crypto.randomUUID()}`
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_test_mobile_store_grant
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'mobile-store:%'
       BEGIN SELECT RAISE(ABORT, 'test inventory failure'); END`
    ).run()
    try {
      await expect(
        new MobileStoreFulfillmentRepository(env.AUTH_DB).fulfill(
          userId,
          tickets(transactionId),
          NOW
        )
      ).rejects.toThrow('fulfill mobile store payment')
    } finally {
      await env.AUTH_DB.prepare(
        'DROP TRIGGER reject_test_mobile_store_grant'
      ).run()
    }
    expect(await ticketBalance(userId)).toBeNull()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM mobile_store_payments
         WHERE provider = 'GOOGLE_PLAY' AND external_transaction_id = ?`
      )
        .bind(transactionId)
        .first<number>('count')
    ).toBe(0)
  })
})
