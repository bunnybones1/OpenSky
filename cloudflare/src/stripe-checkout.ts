import type {
  ItemType,
  Page,
  Payment,
  PaymentLog,
  PaymentProvider,
  PaymentStatus,
  SortBy
} from '@opensky/proto'

import type { Env } from './env'
import { internal, invalidArgument, unauthenticated } from './errors'
import { seasonFromDate } from './legacy-seasons'
import { listPaymentProviderProducts } from './payment-provider-products'

const STRIPE_API = 'https://api.stripe.com/v1'
const MAX_WEBHOOK_BYTES = 256 * 1024
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60
const SUCCESS_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded'
])
const FAILURE_EVENTS = new Set([
  'checkout.session.expired',
  'checkout.session.async_payment_failed'
])

export type StripeFetch = (request: Request) => Promise<Response>

interface ProductDefinition {
  code: string
  itemType: ItemType
  quantity: number
  priceId: string
  currency: 'usd'
  amountTotal: number
}

interface StripeSessionResponse {
  id?: unknown
  object?: unknown
  url?: unknown
  currency?: unknown
  amount_total?: unknown
}

class StripeRequestError extends Error {}

interface StripeEvent {
  id?: unknown
  object?: unknown
  type?: unknown
  data?: {
    object?: {
      id?: unknown
      object?: unknown
      payment_status?: unknown
      amount_total?: unknown
      currency?: unknown
      client_reference_id?: unknown
      metadata?: unknown
    }
  }
}

interface PaymentRow {
  id: string
  user_id: string
  product_code: string
  item_type: ItemType
  quantity: number
  checkout_season: number
  status: 'INITIATING' | 'PENDING' | 'SUCCEEDED' | 'FAILED'
  stripe_session_id: string | null
}

interface StaffPaymentRow {
  staff_id: number
  account_id: number | null
  status: PaymentRow['status']
  stripe_session_id: string | null
  payment_id: string
  created_at: string
}

interface StaffPaymentLogRow {
  id: number
  staff_id: number
  log_type: string
  data_json: string
  created_at: string
}

const PAYMENT_PROVIDERS = new Set<PaymentProvider>([
  'UNKNOWN' as PaymentProvider,
  'GOOGLE_PLAY' as PaymentProvider,
  'APPLE_APP_STORE' as PaymentProvider,
  'STRIPE' as PaymentProvider,
  'SEQUENCE' as PaymentProvider,
  'SAMSUNG_GALAXY_STORE' as PaymentProvider
])
const PAYMENT_STATUSES = new Set<PaymentStatus>([
  'INITIATED' as PaymentStatus,
  'PENDING' as PaymentStatus,
  'SUCCEEDED' as PaymentStatus,
  'FAILED' as PaymentStatus
])
const STAFF_PAGE_SIZE = 20
const MAX_STAFF_PAGE_SIZE = 200

const staffPaymentSortOrder = (page?: Page): SortBy['order'] => {
  const requested = page?.sort?.length
    ? page.sort
    : [{ column: 'created_at', order: 'DESC' as SortBy['order'] }]
  let order = 'DESC' as SortBy['order']
  for (const item of requested) {
    const itemOrder = item.order ?? ('DESC' as SortBy['order'])
    if (
      !['created_at', 'createdAt'].includes(item.column) ||
      !['ASC', 'DESC'].includes(itemOrder)
    ) {
      throw invalidArgument('payment sort is invalid')
    }
    order = itemOrder
  }
  return order
}

const encodeStaffPaymentCursor = (row: StaffPaymentRow): string =>
  btoa(JSON.stringify([row.created_at]))

const decodeStaffPaymentCursor = (value: string): string => {
  try {
    const decoded = JSON.parse(atob(value)) as unknown
    if (
      Array.isArray(decoded) &&
      decoded.length === 1 &&
      typeof decoded[0] === 'string' &&
      decoded[0].length > 0
    ) {
      return decoded[0]
    }
  } catch {
    // Fall through to the source-compatible invalid page response.
  }
  throw invalidArgument('page cursor is invalid')
}

const configured = (value: string | undefined): value is string =>
  typeof value === 'string' && value.length > 0

const SKYPASS_PRODUCT_CODE = 'skypass_0001'
const CONQUEST_TICKET_PRODUCT_CODE = 'conquest_tickets_0001'

const productPricePolicy = (
  productCode: string
): {
  itemType: ItemType
  quantity: 1
  currency: 'usd'
  amountTotal: number
} => {
  if (productCode === SKYPASS_PRODUCT_CODE) {
    return {
      itemType: 'SW_SKYPASS' as ItemType,
      quantity: 1,
      currency: 'usd',
      amountTotal: 1_495
    }
  }
  if (productCode === CONQUEST_TICKET_PRODUCT_CODE) {
    return {
      itemType: 'SW_CONQUEST_TICKET' as ItemType,
      quantity: 1,
      currency: 'usd',
      amountTotal: 150
    }
  }
  throw invalidArgument('Stripe product is invalid')
}

const validateRedirect = (value: string, field: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw internal(`${field} is invalid`)
  }
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && url.hostname === 'localhost')
  ) {
    throw internal(`${field} must use HTTPS`)
  }
  return url.toString()
}

const validRedirectConfiguration = (value: string | undefined): boolean => {
  if (!configured(value)) return false
  try {
    validateRedirect(value, 'Stripe redirect URL')
    return true
  } catch {
    return false
  }
}

export interface PremiumSkypassCommerceCapability {
  available: boolean
  provider: 'STRIPE'
  productCode: 'skypass_0001'
  fulfillment: 'OFFCHAIN'
  price: {
    currency: 'USD'
    amountMinor: 1495
    display: '$14.95'
  }
}

export const premiumSkypassCommerceCapability = (
  env: Env
): PremiumSkypassCommerceCapability => ({
  available:
    configured(env.STRIPE_SECRET_KEY) &&
    configured(env.STRIPE_WEBHOOK_SECRET) &&
    configured(env.STRIPE_SKYPASS_PRICE_ID) &&
    env.STRIPE_SKYPASS_PRICE_ID.startsWith('price_') &&
    validRedirectConfiguration(env.STRIPE_SUCCESS_URL) &&
    validRedirectConfiguration(env.STRIPE_CANCEL_URL),
  provider: 'STRIPE',
  productCode: SKYPASS_PRODUCT_CODE,
  fulfillment: 'OFFCHAIN',
  price: { currency: 'USD', amountMinor: 1_495, display: '$14.95' }
})

const hex = (bytes: Uint8Array): string =>
  [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')

const sha256 = async (value: string): Promise<string> =>
  hex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    )
  )

const hmac = async (secret: string, value: string): Promise<string> => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return hex(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
  )
}

const safeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

const webhookSignature = (value: string | null) => {
  if (!value) throw unauthenticated('Stripe signature is missing')
  const timestamps: string[] = []
  const signatures: string[] = []
  for (const part of value.split(',')) {
    const [key, data] = part.trim().split('=', 2)
    if (key === 't' && data) timestamps.push(data)
    if (key === 'v1' && data) signatures.push(data.toLowerCase())
  }
  const timestamp = timestamps[0]
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) {
    throw unauthenticated('Stripe signature is invalid')
  }
  return { timestamp, signatures }
}

const metadata = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  )
}

export class StripeCheckoutRepository {
  constructor(
    private readonly database: D1Database,
    private readonly env: Env,
    private readonly stripeFetch: StripeFetch = request => fetch(request)
  ) {}

  private assertCheckoutEnabled() {
    const required = [
      this.env.STRIPE_SECRET_KEY,
      this.env.STRIPE_WEBHOOK_SECRET,
      this.env.STRIPE_SUCCESS_URL,
      this.env.STRIPE_CANCEL_URL
    ]
    if (!required.every(configured)) {
      throw internal('Stripe payments are disabled')
    }
  }

  private assertWebhookEnabled() {
    if (
      !configured(this.env.STRIPE_SECRET_KEY) ||
      !configured(this.env.STRIPE_WEBHOOK_SECRET)
    ) {
      throw internal('Stripe payments are disabled')
    }
  }

  private product(productCode: string): ProductDefinition {
    const product = listPaymentProviderProducts(
      'STRIPE' as PaymentProvider
    ).find(value => value.code === productCode)
    if (!product) throw invalidArgument('Stripe product is invalid')
    const priceId =
      product.itemType === ('SW_SKYPASS' as ItemType)
        ? this.env.STRIPE_SKYPASS_PRICE_ID
        : this.env.STRIPE_CONQUEST_TICKET_PRICE_ID
    if (!configured(priceId) || !priceId.startsWith('price_')) {
      throw internal('Stripe price configuration is invalid')
    }
    const pricePolicy = productPricePolicy(product.code)
    if (
      product.itemType !== pricePolicy.itemType ||
      product.quantity !== pricePolicy.quantity
    ) {
      throw internal('Stripe product configuration is invalid')
    }
    return { ...product, ...pricePolicy, priceId }
  }

  async createCheckout(
    userId: string,
    productCode: string,
    now = new Date()
  ): Promise<{ url: string }> {
    this.assertCheckoutEnabled()
    if (typeof productCode !== 'string' || productCode.length > 128) {
      throw invalidArgument('productID is invalid')
    }
    const product = this.product(productCode)
    const successUrl = validateRedirect(
      this.env.STRIPE_SUCCESS_URL!,
      'Stripe success URL'
    )
    const cancelUrl = validateRedirect(
      this.env.STRIPE_CANCEL_URL!,
      'Stripe cancel URL'
    )
    const candidatePaymentId = crypto.randomUUID()
    const season = seasonFromDate(now)
    const createdAt = now.toISOString()
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO stripe_checkout_payments
           (id, user_id, product_code, item_type, quantity, checkout_season,
            status,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'INITIATING', ?, ?)`
      )
      .bind(
        candidatePaymentId,
        userId,
        product.code,
        product.itemType,
        product.quantity,
        season,
        createdAt,
        createdAt
      )
      .run()
    const initiating = await this.database
      .prepare(
        `SELECT id, checkout_season
         FROM stripe_checkout_payments
         WHERE user_id = ? AND product_code = ? AND status = 'INITIATING'
         ORDER BY created_at, id LIMIT 1`
      )
      .bind(userId, product.code)
      .first<{ id: string; checkout_season: number }>()
    if (!initiating) {
      // A concurrent request can observe the shared idempotent attempt after
      // it has already become pending. Return that Session instead of creating
      // a second checkout or reporting a false failure.
      const pendingUrl = await this.database
        .prepare(
          `SELECT checkout_url
           FROM stripe_checkout_payments
           WHERE user_id = ? AND product_code = ? AND status = 'PENDING'
           ORDER BY created_at DESC, id DESC LIMIT 1`
        )
        .bind(userId, product.code)
        .first<string>('checkout_url')
      if (pendingUrl) return { url: pendingUrl }
      throw internal('create payment intent')
    }
    const paymentId = initiating.id
    const checkoutSeason = initiating.checkout_season

    try {
      const form = new URLSearchParams({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        'line_items[0][price]': product.priceId,
        'line_items[0][quantity]': '1',
        'metadata[cloud_weasel_payment_id]': paymentId,
        'metadata[cloud_weasel_user_id]': userId,
        'metadata[product_code]': product.code,
        'metadata[season]': String(checkoutSeason)
      })
      const response = await this.stripeFetch(
        new Request(`${STRIPE_API}/checkout/sessions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': paymentId
          },
          body: form
        })
      )
      const body = (await response
        .json()
        .catch(() => ({}))) as StripeSessionResponse & {
        error?: { message?: unknown }
      }
      if (!response.ok) {
        const message =
          'error' in body && typeof body.error?.message === 'string'
            ? body.error.message
            : `Stripe returned ${response.status}`
        if (
          response.status >= 500 ||
          response.status === 409 ||
          response.status === 429
        ) {
          throw new Error(message)
        }
        throw new StripeRequestError(message)
      }
      if (
        body.object !== 'checkout.session' ||
        typeof body.id !== 'string' ||
        !body.id.startsWith('cs_') ||
        typeof body.url !== 'string' ||
        new URL(body.url).hostname !== 'checkout.stripe.com'
      ) {
        throw new Error('Stripe returned an invalid Checkout Session')
      }
      if (
        body.currency !== product.currency ||
        body.amount_total !== product.amountTotal
      ) {
        throw new StripeRequestError(
          'Stripe Checkout Session price does not match product policy'
        )
      }
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE stripe_checkout_payments
           SET status = 'PENDING', stripe_session_id = ?, checkout_url = ?,
               updated_at = ?
           WHERE id = ? AND status = 'INITIATING'`
          )
          .bind(body.id, body.url, createdAt, paymentId),
        this.database
          .prepare(
            `INSERT OR IGNORE INTO stripe_checkout_logs
               (payment_id, receipt_key, log_type, data_json, created_at)
             SELECT id, ?, '*stripe.CheckoutSession', ?, ?
             FROM stripe_checkout_payments
             WHERE id = ? AND status = 'PENDING'`
          )
          .bind(
            `session:${body.id}`,
            JSON.stringify(body),
            createdAt,
            paymentId
          )
      ])
      return { url: body.url }
    } catch (error) {
      if (error instanceof StripeRequestError) {
        const message = error.message.slice(0, 1_000)
        const failedAt = createdAt
        await this.database
          .prepare(
            `UPDATE stripe_checkout_payments
             SET status = 'FAILED', last_error = ?, completed_at = ?,
                 updated_at = ?
             WHERE id = ? AND status = 'INITIATING'`
          )
          .bind(message, failedAt, failedAt, paymentId)
          .run()
      }
      throw internal('create payment intent')
    }
  }

  private async verifyWebhook(request: Request, now: Date): Promise<string> {
    if (!configured(this.env.STRIPE_WEBHOOK_SECRET)) {
      throw internal('Stripe payments are disabled')
    }
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
      throw invalidArgument('Stripe webhook is too large')
    }
    const signature = webhookSignature(request.headers.get('Stripe-Signature'))
    const timestamp = Number(signature.timestamp)
    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(Math.floor(now.getTime() / 1_000) - timestamp) >
        WEBHOOK_TOLERANCE_SECONDS
    ) {
      throw unauthenticated('Stripe signature timestamp is invalid')
    }
    const expected = await hmac(
      this.env.STRIPE_WEBHOOK_SECRET,
      `${signature.timestamp}.${rawBody}`
    )
    if (!signature.signatures.some(value => safeEqual(value, expected))) {
      throw unauthenticated('Stripe signature is invalid')
    }
    return rawBody
  }

  async handleWebhook(request: Request, now = new Date()): Promise<void> {
    this.assertWebhookEnabled()
    const rawBody = await this.verifyWebhook(request, now)
    let signedEvent: StripeEvent
    try {
      signedEvent = JSON.parse(rawBody) as StripeEvent
    } catch {
      throw invalidArgument('Stripe webhook must be JSON')
    }
    if (
      typeof signedEvent.id !== 'string' ||
      !/^evt_[A-Za-z0-9_]+$/.test(signedEvent.id) ||
      signedEvent.object !== 'event' ||
      typeof signedEvent.type !== 'string' ||
      !signedEvent.data?.object ||
      signedEvent.data.object.object !== 'checkout.session' ||
      typeof signedEvent.data.object.id !== 'string'
    ) {
      throw invalidArgument('Stripe webhook event is invalid')
    }
    if (
      !SUCCESS_EVENTS.has(signedEvent.type) &&
      !FAILURE_EVENTS.has(signedEvent.type)
    ) {
      return
    }
    let event: StripeEvent
    try {
      const response = await this.stripeFetch(
        new Request(`${STRIPE_API}/events/${signedEvent.id}`, {
          headers: { Authorization: `Bearer ${this.env.STRIPE_SECRET_KEY}` }
        })
      )
      event = (await response.json()) as StripeEvent
      if (!response.ok) throw new Error('Stripe event lookup failed')
    } catch {
      throw internal('process Stripe webhook')
    }
    if (
      event.id !== signedEvent.id ||
      event.type !== signedEvent.type ||
      event.object !== 'event' ||
      !event.data?.object ||
      event.data.object.object !== 'checkout.session' ||
      typeof event.data.object.id !== 'string' ||
      event.data.object.id !== signedEvent.data.object.id
    ) {
      throw invalidArgument('Stripe webhook event is invalid')
    }
    const session = event.data.object
    const payment = await this.database
      .prepare(
        `SELECT id, user_id, product_code, item_type, quantity,
                checkout_season, status, stripe_session_id
         FROM stripe_checkout_payments WHERE stripe_session_id = ?`
      )
      .bind(session.id)
      .first<PaymentRow>()
    if (!payment) throw invalidArgument('Stripe payment was not found')
    const successEvent = SUCCESS_EVENTS.has(event.type)
    const failureEvent = FAILURE_EVENTS.has(event.type)
    if (
      payment.status === 'SUCCEEDED' ||
      (payment.status === 'FAILED' && failureEvent)
    ) {
      return
    }

    const eventMetadata = metadata(session.metadata)
    const pricePolicy = productPricePolicy(payment.product_code)
    if (
      payment.item_type !== pricePolicy.itemType ||
      payment.quantity !== pricePolicy.quantity ||
      session.client_reference_id !== payment.user_id ||
      eventMetadata.cloud_weasel_payment_id !== payment.id ||
      eventMetadata.cloud_weasel_user_id !== payment.user_id ||
      eventMetadata.product_code !== payment.product_code ||
      eventMetadata.season !== String(payment.checkout_season)
    ) {
      throw invalidArgument('Stripe payment metadata does not match')
    }
    const receivedAt = now.toISOString()
    const fulfilledSeason = seasonFromDate(now)
    const digest = await sha256(rawBody)
    if (successEvent) {
      if (
        session.payment_status !== 'paid' &&
        session.payment_status !== 'no_payment_required'
      ) {
        // Delayed payment methods emit checkout.session.completed before the
        // funds settle. A later async_payment_succeeded event performs the
        // grant, while returning success here avoids a pointless retry storm.
        if (event.type === 'checkout.session.completed') return
        throw invalidArgument('Stripe payment is not paid')
      }
      const amountTotal = session.amount_total
      const currency = session.currency
      if (
        amountTotal !== pricePolicy.amountTotal ||
        currency !== pricePolicy.currency
      ) {
        throw invalidArgument(
          'Stripe payment price does not match product policy'
        )
      }
      const statements: D1PreparedStatement[] = [
        this.database
          .prepare(
            `INSERT OR IGNORE INTO stripe_checkout_events
               (event_id, event_type, stripe_session_id, payment_id,
                payload_sha256, outcome, received_at)
             VALUES (?, ?, ?, ?, ?, 'SUCCEEDED', ?)`
          )
          .bind(
            event.id,
            event.type,
            session.id,
            payment.id,
            digest,
            receivedAt
          ),
        this.database
          .prepare(
            `INSERT OR IGNORE INTO stripe_checkout_logs
               (payment_id, receipt_key, log_type, data_json, created_at)
             SELECT ?, ?, '*stripe.Event', ?, ?
             WHERE EXISTS (
               SELECT 1 FROM stripe_checkout_events
               WHERE event_id = ? AND payload_sha256 = ?
             )`
          )
          .bind(
            payment.id,
            `event:${event.id}`,
            JSON.stringify(event),
            receivedAt,
            event.id,
            digest
          )
      ]
      if (payment.item_type === ('SW_SKYPASS' as ItemType)) {
        statements.push(
          this.database
            .prepare(
              `INSERT OR IGNORE INTO stripe_checkout_fulfillment_receipts
                 (payment_id, event_id, user_id, item_type, token_id,
                  quantity, stackable, before_balance, after_balance,
                  before_has_premium, after_has_premium, created_at)
               SELECT payment.id, event.event_id, payment.user_id,
                      payment.item_type, ?, payment.quantity, 0,
                      COALESCE(item.balance, 0),
                      MAX(COALESCE(item.balance, 0), 1),
                      COALESCE(stats.has_premium, 0), 1, ?
               FROM stripe_checkout_payments payment
               JOIN stripe_checkout_events event
                 ON event.payment_id = payment.id
                AND event.event_id = ? AND event.payload_sha256 = ?
                AND event.outcome = 'SUCCEEDED'
               LEFT JOIN player_items item
                 ON item.user_id = payment.user_id
                AND item.item_type = payment.item_type AND item.token_id = ?
               LEFT JOIN player_skypass_season_stats stats
                 ON stats.user_id = payment.user_id AND stats.season = ?
               WHERE payment.id = ? AND payment.status IN ('PENDING', 'FAILED')`
            )
            .bind(
              fulfilledSeason,
              receivedAt,
              event.id,
              digest,
              fulfilledSeason,
              fulfilledSeason,
              payment.id
            ),
          this.database
            .prepare(
              `INSERT INTO player_items
                 (user_id, item_type, token_id, balance, is_new, unlock_source,
                  created_at, updated_at)
               SELECT ?, 'SW_SKYPASS', ?, 1, 1, ?, ?, ?
               WHERE EXISTS (
                 SELECT 1 FROM stripe_checkout_events event
                 JOIN stripe_checkout_payments payment
                   ON payment.id = event.payment_id
                 WHERE event.event_id = ? AND event.payload_sha256 = ?
                   AND payment.status IN ('PENDING', 'FAILED')
               )
               ON CONFLICT(user_id, item_type, token_id)
               DO UPDATE SET balance = MAX(balance, 1), is_new = 1,
                             updated_at = excluded.updated_at`
            )
            .bind(
              payment.user_id,
              fulfilledSeason,
              `stripe:${payment.id}`,
              receivedAt,
              receivedAt,
              event.id,
              digest
            ),
          this.database
            .prepare(
              `INSERT INTO player_skypass_season_stats
                 (user_id, season, has_premium, created_at, updated_at)
               SELECT ?, ?, 1, ?, ?
               WHERE EXISTS (
                 SELECT 1 FROM stripe_checkout_events event
                 JOIN stripe_checkout_payments payment
                   ON payment.id = event.payment_id
                 WHERE event.event_id = ? AND event.payload_sha256 = ?
                   AND payment.status IN ('PENDING', 'FAILED')
               )
               ON CONFLICT(user_id, season)
               DO UPDATE SET has_premium = 1, updated_at = excluded.updated_at`
            )
            .bind(
              payment.user_id,
              fulfilledSeason,
              receivedAt,
              receivedAt,
              event.id,
              digest
            )
        )
      } else {
        statements.push(
          this.database
            .prepare(
              `INSERT OR IGNORE INTO stripe_checkout_fulfillment_receipts
                 (payment_id, event_id, user_id, item_type, token_id,
                  quantity, stackable, before_balance, after_balance,
                  before_has_premium, after_has_premium, created_at)
               SELECT payment.id, event.event_id, payment.user_id,
                      payment.item_type, 2, payment.quantity, 1,
                      COALESCE(item.balance, 0),
                      COALESCE(item.balance, 0) + payment.quantity,
                      NULL, NULL, ?
               FROM stripe_checkout_payments payment
               JOIN stripe_checkout_events event
                 ON event.payment_id = payment.id
                AND event.event_id = ? AND event.payload_sha256 = ?
                AND event.outcome = 'SUCCEEDED'
               LEFT JOIN player_items item
                 ON item.user_id = payment.user_id
                AND item.item_type = payment.item_type AND item.token_id = 2
               WHERE payment.id = ? AND payment.status IN ('PENDING', 'FAILED')`
            )
            .bind(receivedAt, event.id, digest, payment.id),
          this.database
            .prepare(
              `INSERT INTO player_items
                 (user_id, item_type, token_id, balance, is_new, unlock_source,
                  created_at, updated_at)
               SELECT ?, 'SW_CONQUEST_TICKET', 2, ?, 1, ?, ?, ?
               WHERE EXISTS (
                 SELECT 1 FROM stripe_checkout_events event
                 JOIN stripe_checkout_payments payment
                   ON payment.id = event.payment_id
                 WHERE event.event_id = ? AND event.payload_sha256 = ?
                   AND payment.status IN ('PENDING', 'FAILED')
               )
               ON CONFLICT(user_id, item_type, token_id)
               DO UPDATE SET balance = balance + excluded.balance,
                             is_new = 1, updated_at = excluded.updated_at`
            )
            .bind(
              payment.user_id,
              payment.quantity,
              `stripe:${payment.id}`,
              receivedAt,
              receivedAt,
              event.id,
              digest
            )
        )
      }
      statements.push(
        this.database
          .prepare(
            `UPDATE stripe_checkout_payments
             SET status = 'SUCCEEDED', currency = ?, amount_total = ?,
                 fulfilled_season = ?,
                 completed_at = ?, updated_at = ?, last_error = NULL
             WHERE id = ? AND status IN ('PENDING', 'FAILED')
               AND EXISTS (
                 SELECT 1 FROM stripe_checkout_events
                 WHERE event_id = ? AND payload_sha256 = ?
               )`
          )
          .bind(
            currency,
            amountTotal,
            fulfilledSeason,
            receivedAt,
            receivedAt,
            payment.id,
            event.id,
            digest
          )
      )
      await this.database.batch(statements)
      return
    }

    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO stripe_checkout_events
             (event_id, event_type, stripe_session_id, payment_id,
              payload_sha256, outcome, received_at)
           VALUES (?, ?, ?, ?, ?, 'FAILED', ?)`
        )
        .bind(event.id, event.type, session.id, payment.id, digest, receivedAt),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO stripe_checkout_logs
             (payment_id, receipt_key, log_type, data_json, created_at)
           SELECT ?, ?, '*stripe.Event', ?, ?
           WHERE EXISTS (
             SELECT 1 FROM stripe_checkout_events
             WHERE event_id = ? AND payload_sha256 = ?
           )`
        )
        .bind(
          payment.id,
          `event:${event.id}`,
          JSON.stringify(event),
          receivedAt,
          event.id,
          digest
        ),
      this.database
        .prepare(
          `UPDATE stripe_checkout_payments
           SET status = 'FAILED', last_error = ?, completed_at = ?,
               updated_at = ?
           WHERE id = ? AND status = 'PENDING'
             AND EXISTS (
               SELECT 1 FROM stripe_checkout_events
               WHERE event_id = ? AND payload_sha256 = ?
             )`
        )
        .bind(event.type, receivedAt, receivedAt, payment.id, event.id, digest)
    ])
  }

  private async staffUserId(address: string): Promise<string | null> {
    if (address.startsWith('identity:')) {
      const userId = address.slice('identity:'.length)
      if (!userId) throw invalidArgument('address is invalid')
      return (
        (await this.database
          .prepare(`SELECT id FROM users WHERE id = ?`)
          .bind(userId)
          .first<string>('id')) ?? null
      )
    }
    return (
      (await this.database
        .prepare(
          `SELECT user_id FROM wallet_connections
           WHERE namespace = 'eip155' AND address = ? COLLATE NOCASE`
        )
        .bind(address)
        .first<string>('user_id')) ?? null
    )
  }

  async listStaffPayments(input: {
    page?: Page
    status?: PaymentStatus
    provider?: PaymentProvider
    address?: string
  }): Promise<{ page: Page; payments: Payment[] }> {
    if (input.page?.before !== undefined && input.page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
    if (input.status && !PAYMENT_STATUSES.has(input.status)) {
      throw invalidArgument('payment status is invalid')
    }
    if (input.provider && !PAYMENT_PROVIDERS.has(input.provider)) {
      throw invalidArgument('payment provider is invalid')
    }
    const size = Math.min(
      MAX_STAFF_PAGE_SIZE,
      Number.isSafeInteger(input.page?.pageSize) &&
        (input.page?.pageSize ?? 0) > 0
        ? input.page!.pageSize!
        : STAFF_PAGE_SIZE
    )
    const order = staffPaymentSortOrder(input.page)
    const reverse = input.page?.after !== undefined
    const cursorValue = reverse ? input.page?.after : input.page?.before
    const cursor =
      cursorValue !== undefined
        ? decodeStaffPaymentCursor(cursorValue)
        : undefined
    const bindings: unknown[] = []
    const filters: string[] = []
    if (input.address !== undefined) {
      if (typeof input.address !== 'string' || input.address.length > 256) {
        throw invalidArgument('address is invalid')
      }
      const userId = await this.staffUserId(input.address)
      if (!userId) {
        return {
          page: {
            pageSize: size,
            hasBefore: reverse && cursorValue !== undefined,
            hasAfter: !reverse && cursorValue !== undefined,
            sort: []
          },
          payments: []
        }
      }
      filters.push('payment.user_id = ?')
      bindings.push(userId)
    }
    if (input.status) {
      filters.push('payment.status = ?')
      bindings.push(
        input.status === ('INITIATED' as PaymentStatus)
          ? 'INITIATING'
          : input.status
      )
    }
    // This ledger intentionally contains only the ported Stripe provider.
    if (input.provider && input.provider !== ('STRIPE' as PaymentProvider)) {
      filters.push('0 = 1')
    }
    if (cursor !== undefined) {
      const forwardOperator = order === 'ASC' ? '>' : '<'
      const reverseOperator = order === 'ASC' ? '<' : '>'
      filters.push(
        `payment.created_at ${reverse ? reverseOperator : forwardOperator} ?`
      )
      bindings.push(cursor)
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const queryOrder = reverse ? (order === 'ASC' ? 'DESC' : 'ASC') : order
    const result = await this.database
      .prepare(
        `SELECT staff.id AS staff_id, game.id AS account_id,
                payment.status, payment.stripe_session_id,
                payment.id AS payment_id, payment.created_at
         FROM stripe_checkout_payments payment
         JOIN stripe_checkout_payment_staff_ids staff
           ON staff.payment_id = payment.id
         LEFT JOIN game_accounts game ON game.user_id = payment.user_id
         ${where}
         ORDER BY payment.created_at ${queryOrder}
         LIMIT ?`
      )
      .bind(...bindings, size + 1)
      .all<StaffPaymentRow>()
    const hasExtra = result.results.length > size
    const rows = result.results.slice(0, size)
    if (reverse) rows.reverse()
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeStaffPaymentCursor(rows[0]) : undefined,
        after: rows.length
          ? encodeStaffPaymentCursor(rows[rows.length - 1])
          : undefined,
        hasBefore: reverse ? cursorValue !== undefined : hasExtra,
        hasAfter: reverse ? hasExtra : cursorValue !== undefined,
        sort: []
      },
      payments: rows.map(row => ({
        id: row.staff_id,
        accountID: row.account_id ?? 0,
        status: (row.status === 'INITIATING'
          ? 'INITIATED'
          : row.status) as PaymentStatus,
        provider: 'STRIPE' as PaymentProvider,
        externalTxnID: row.stripe_session_id ?? row.payment_id,
        createdAt: row.created_at
      }))
    }
  }

  async listStaffPaymentLogs(paymentId: number): Promise<PaymentLog[]> {
    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      throw invalidArgument('paymentID cannot be zero')
    }
    const result = await this.database
      .prepare(
        `SELECT log.id, staff.id AS staff_id, log.log_type, log.data_json,
                log.created_at
         FROM stripe_checkout_logs log
         JOIN stripe_checkout_payment_staff_ids staff
           ON staff.payment_id = log.payment_id
         WHERE staff.id = ?
         ORDER BY log.created_at DESC, log.id DESC`
      )
      .bind(paymentId)
      .all<StaffPaymentLogRow>()
    return result.results.map(row => ({
      id: row.id,
      paymentID: row.staff_id,
      data: {
        type: row.log_type,
        data: JSON.parse(row.data_json) as unknown
      },
      createdAt: row.created_at
    }))
  }
}
