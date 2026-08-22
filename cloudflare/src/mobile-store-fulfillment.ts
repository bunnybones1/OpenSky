import { PaymentProvider, type ItemType } from '@opensky/proto'

import { alreadyExists, internal, invalidArgument } from './errors'
import { seasonFromDate } from './legacy-seasons'
import { listPaymentProviderProducts } from './payment-provider-products'

export type MobileStoreProvider =
  | PaymentProvider.GOOGLE_PLAY
  | PaymentProvider.APPLE_APP_STORE
  | PaymentProvider.SAMSUNG_GALAXY_STORE

export interface VerifiedMobileStorePurchase {
  provider: MobileStoreProvider
  externalTransactionId: string
  productCode: string
  verificationSha256: string
  currency?: string
  totalPrice?: number
}

interface MobileStorePaymentRow {
  user_id: string
  product_code: string
  item_type: ItemType
  quantity: number
  fulfilled_season: number
  verification_sha256: string
  currency: string | null
  total_price: number | null
  status: 'PENDING' | 'SUCCEEDED'
}

const PROVIDERS = new Set<MobileStoreProvider>([
  PaymentProvider.GOOGLE_PLAY,
  PaymentProvider.APPLE_APP_STORE,
  PaymentProvider.SAMSUNG_GALAXY_STORE
])

const normalizedCurrency = (currency: string | undefined): string | null => {
  if (currency === undefined || currency === '') return null
  const normalized = currency.toUpperCase()
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw invalidArgument('payment currency is invalid')
  }
  return normalized
}

const normalizedPrice = (price: number | undefined): number | null => {
  if (price === undefined) return null
  if (!Number.isFinite(price) || price < 0) {
    throw invalidArgument('payment total price is invalid')
  }
  return price
}

export class MobileStoreFulfillmentRepository {
  constructor(private readonly database: D1Database) {}

  async fulfill(
    userId: string,
    purchase: VerifiedMobileStorePurchase,
    now = new Date()
  ): Promise<void> {
    if (!PROVIDERS.has(purchase.provider)) {
      throw invalidArgument('mobile store provider is invalid')
    }
    if (
      typeof purchase.externalTransactionId !== 'string' ||
      purchase.externalTransactionId.length < 1 ||
      purchase.externalTransactionId.length > 256
    ) {
      throw invalidArgument('external transaction ID is invalid')
    }
    if (!/^[a-f0-9]{64}$/.test(purchase.verificationSha256)) {
      throw invalidArgument('verification digest is invalid')
    }
    const product = listPaymentProviderProducts(purchase.provider).find(
      value => value.code === purchase.productCode
    )
    if (!product) throw invalidArgument('mobile store product is invalid')

    const currency = normalizedCurrency(purchase.currency)
    const totalPrice = normalizedPrice(purchase.totalPrice)
    const fulfilledSeason = seasonFromDate(now)
    const createdAt = now.toISOString()
    const paymentId = crypto.randomUUID()
    const unlockSource = `mobile-store:${purchase.provider.toLowerCase()}:${paymentId}`
    const receiptCondition = `
      FROM mobile_store_payments
      WHERE provider = ? AND external_transaction_id = ?
        AND user_id = ? AND product_code = ? AND item_type = ?
        AND quantity = ? AND fulfilled_season = ?
        AND verification_sha256 = ? AND currency IS ? AND total_price IS ?
        AND status = 'PENDING'`
    const receiptBindings = [
      purchase.provider,
      purchase.externalTransactionId,
      userId,
      product.code,
      product.itemType,
      product.quantity,
      fulfilledSeason,
      purchase.verificationSha256,
      currency,
      totalPrice
    ]

    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO mobile_store_payments
             (id, provider, external_transaction_id, user_id, product_code,
              item_type, quantity, fulfilled_season, verification_sha256,
              currency, total_price, status, created_at, updated_at,
              before_balance, after_balance, before_has_premium,
              after_has_premium)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?,
                  snapshot.before_balance,
                  CASE WHEN ? = 'SW_SKYPASS'
                       THEN MAX(snapshot.before_balance, 1)
                       ELSE snapshot.before_balance + ? END,
                  CASE WHEN ? = 'SW_SKYPASS'
                       THEN snapshot.before_has_premium END,
                  CASE WHEN ? = 'SW_SKYPASS' THEN 1 END
           FROM (
             SELECT
               COALESCE((
                 SELECT balance FROM player_items
                 WHERE user_id = ? AND item_type = ? AND token_id = ?
               ), 0) AS before_balance,
               COALESCE((
                 SELECT has_premium FROM player_skypass_season_stats
                 WHERE user_id = ? AND season = ?
               ), 0) AS before_has_premium
           ) snapshot`
        )
        .bind(
          paymentId,
          purchase.provider,
          purchase.externalTransactionId,
          userId,
          product.code,
          product.itemType,
          product.quantity,
          fulfilledSeason,
          purchase.verificationSha256,
          currency,
          totalPrice,
          createdAt,
          createdAt,
          product.itemType,
          product.quantity,
          product.itemType,
          product.itemType,
          userId,
          product.itemType,
          product.itemType === ('SW_SKYPASS' as ItemType)
            ? fulfilledSeason
            : 2,
          userId,
          fulfilledSeason
        )
    ]

    if (product.itemType === ('SW_SKYPASS' as ItemType)) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_SKYPASS', ?, 1, 1, ?, ?, ?
             WHERE EXISTS (SELECT 1 ${receiptCondition})
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = MAX(balance, 1), is_new = 1,
                           updated_at = excluded.updated_at`
          )
          .bind(
            userId,
            fulfilledSeason,
            unlockSource,
            createdAt,
            createdAt,
            ...receiptBindings
          ),
        this.database
          .prepare(
            `INSERT INTO player_skypass_season_stats
               (user_id, season, has_premium, created_at, updated_at,
                initial_account_level, achieved_account_level)
             SELECT ?, ?, 1, ?, ?, source_level, source_level
             FROM (
               SELECT MAX(0, level - 1) AS source_level
               FROM player_profiles WHERE user_id = ?
             )
             WHERE EXISTS (SELECT 1 ${receiptCondition})
             ON CONFLICT(user_id, season)
             DO UPDATE SET has_premium = 1, updated_at = excluded.updated_at`
          )
          .bind(
            userId,
            fulfilledSeason,
            createdAt,
            createdAt,
            userId,
            ...receiptBindings
          )
      )
    } else {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_CONQUEST_TICKET', 2, ?, 1, ?, ?, ?
             WHERE EXISTS (SELECT 1 ${receiptCondition})
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = balance + excluded.balance,
                           is_new = 1, updated_at = excluded.updated_at`
          )
          .bind(
            userId,
            product.quantity,
            unlockSource,
            createdAt,
            createdAt,
            ...receiptBindings
          )
      )
    }

    statements.push(
      this.database
        .prepare(
          `UPDATE mobile_store_payments
           SET status = 'SUCCEEDED', fulfilled_at = ?, updated_at = ?
           WHERE provider = ? AND external_transaction_id = ?
             AND user_id = ? AND product_code = ? AND item_type = ?
             AND quantity = ? AND fulfilled_season = ?
             AND verification_sha256 = ? AND currency IS ? AND total_price IS ?
             AND status = 'PENDING'`
        )
        .bind(createdAt, createdAt, ...receiptBindings)
    )

    try {
      await this.database.batch(statements)
    } catch {
      throw internal('fulfill mobile store payment')
    }

    const stored = await this.database
      .prepare(
        `SELECT user_id, product_code, item_type, quantity, fulfilled_season,
                verification_sha256, currency, total_price, status
         FROM mobile_store_payments
         WHERE provider = ? AND external_transaction_id = ?`
      )
      .bind(purchase.provider, purchase.externalTransactionId)
      .first<MobileStorePaymentRow>()
    if (!stored) throw internal('fulfill mobile store payment')
    if (
      stored.user_id !== userId ||
      stored.product_code !== product.code ||
      stored.item_type !== product.itemType ||
      stored.quantity !== product.quantity ||
      stored.fulfilled_season !== fulfilledSeason ||
      stored.verification_sha256 !== purchase.verificationSha256 ||
      stored.currency !== currency ||
      stored.total_price !== totalPrice
    ) {
      throw alreadyExists('mobile store transaction was already fulfilled')
    }
    if (stored.status !== 'SUCCEEDED') {
      throw internal('fulfill mobile store payment')
    }
  }
}
