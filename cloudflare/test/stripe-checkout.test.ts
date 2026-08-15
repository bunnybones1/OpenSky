import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Env } from '../src/env'
import { handleApiRequest, type AuthServices } from '../src/api'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import {
  premiumSkypassCommerceCapability,
  StripeCheckoutRepository,
  type StripeFetch
} from '../src/stripe-checkout'

const userId = 'stripe-checkout-user'
const NOW = new Date('2026-08-12T12:00:00.000Z')
const WEBHOOK_SECRET = 'whsec_cloud_weasel_test_secret'
const stripeEvents = new Map<string, object>()

const stripeEventLookup: StripeFetch = async request => {
  const eventId = new URL(request.url).pathname.split('/').pop()!
  const event = stripeEvents.get(eventId)
  return event
    ? Response.json(event)
    : Response.json({ error: 'not found' }, { status: 404 })
}

const authServices = (stripeFetch: StripeFetch): AuthServices => ({
  verifyProof: async () => {
    throw new Error('wallet proof verification is not expected')
  },
  stripeFetch
})

const configuredEnv = (): Env =>
  ({
    ...(env as unknown as Env),
    STRIPE_SECRET_KEY: 'sk_test_cloud_weasel',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_SKYPASS_PRICE_ID: 'price_skypass_test',
    STRIPE_CONQUEST_TICKET_PRICE_ID: 'price_ticket_test',
    STRIPE_SUCCESS_URL: 'https://opensky.example/skypass',
    STRIPE_CANCEL_URL: 'https://opensky.example/skypass/purchase'
  }) as Env

const hex = (bytes: Uint8Array): string =>
  [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')

const signatureFor = async (body: string, at = NOW) => {
  const timestamp = String(Math.floor(at.getTime() / 1_000))
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = hex(
    new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${timestamp}.${body}`)
      )
    )
  )
  return `t=${timestamp},v1=${signature}`
}

const signedWebhook = async (event: object, at = NOW) => {
  const eventId = (event as { id?: unknown }).id
  if (typeof eventId === 'string') stripeEvents.set(eventId, event)
  const body = JSON.stringify(event)
  return new Request(
    'https://opensky.example/api/rpc/SkyWeaverAPI/StripeEventWebhook',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': await signatureFor(body, at)
      },
      body
    }
  )
}

const createPending = async (
  productCode = 'skypass_0001',
  sessionId = 'cs_test_cloud_weasel',
  checkoutAt = NOW
) => {
  let checkoutRequest: Request | undefined
  const stripeFetch: StripeFetch = async request => {
    if (request.method === 'GET') {
      return stripeEventLookup(request)
    }
    checkoutRequest = request
    return Response.json({
      id: sessionId,
      object: 'checkout.session',
      url: `https://checkout.stripe.com/c/pay/${sessionId}`,
      amount_total: productCode === 'skypass_0001' ? 1_495 : 150,
      currency: 'usd'
    })
  }
  const repository = new StripeCheckoutRepository(
    env.AUTH_DB,
    configuredEnv(),
    stripeFetch
  )
  const checkout = await repository.createCheckout(
    userId,
    productCode,
    checkoutAt
  )
  const payment = await env.AUTH_DB.prepare(
    `SELECT id, product_code, item_type, quantity, checkout_season, status,
            stripe_session_id
     FROM stripe_checkout_payments WHERE stripe_session_id = ?`
  )
    .bind(sessionId)
    .first<{
      id: string
      product_code: string
      item_type: string
      quantity: number
      checkout_season: number
      status: string
      stripe_session_id: string
    }>()
  return {
    repository,
    checkout,
    checkoutRequest: checkoutRequest!,
    payment: payment!
  }
}

const eventFor = (
  payment: Awaited<ReturnType<typeof createPending>>['payment'],
  overrides: Record<string, unknown> = {}
) => ({
  id: 'evt_cloud_weasel_success',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: payment.stripe_session_id,
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: payment.product_code === 'skypass_0001' ? 1_495 : 150,
      currency: 'usd',
      client_reference_id: userId,
      metadata: {
        cloud_weasel_payment_id: payment.id,
        cloud_weasel_user_id: userId,
        product_code: payment.product_code,
        season: String(payment.checkout_season)
      },
      ...overrides
    }
  }
})

beforeEach(async () => {
  stripeEvents.clear()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS reject_stripe_skypass_fulfillment'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS stripe_checkout_logs_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS stripe_checkout_payment_staff_ids_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS stripe_checkout_events_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS stripe_checkout_fulfillment_receipts_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS stripe_checkout_payments_no_delete'
    )
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM stripe_checkout_logs'),
    env.AUTH_DB.prepare('DELETE FROM stripe_checkout_payment_staff_ids'),
    env.AUTH_DB.prepare('DELETE FROM stripe_checkout_fulfillment_receipts'),
    env.AUTH_DB.prepare('DELETE FROM stripe_checkout_events'),
    env.AUTH_DB.prepare('DELETE FROM stripe_checkout_payments'),
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId)
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `CREATE TRIGGER stripe_checkout_logs_no_delete
       BEFORE DELETE ON stripe_checkout_logs
       BEGIN SELECT RAISE(ABORT, 'Stripe checkout logs are immutable'); END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER stripe_checkout_payment_staff_ids_no_delete
       BEFORE DELETE ON stripe_checkout_payment_staff_ids
       BEGIN SELECT RAISE(ABORT, 'Stripe staff payment IDs are immutable'); END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER stripe_checkout_events_no_delete
       BEFORE DELETE ON stripe_checkout_events
       BEGIN SELECT RAISE(ABORT, 'Stripe events are immutable'); END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER stripe_checkout_fulfillment_receipts_no_delete
       BEFORE DELETE ON stripe_checkout_fulfillment_receipts
       WHEN EXISTS (
         SELECT 1
         FROM stripe_checkout_payments payment
         JOIN users ON users.id = payment.user_id
         WHERE payment.id = OLD.payment_id
       )
       BEGIN
         SELECT RAISE(ABORT, 'Stripe fulfillment receipts are immutable');
       END`
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER stripe_checkout_payments_no_delete
       BEFORE DELETE ON stripe_checkout_payments
       BEGIN SELECT RAISE(ABORT, 'Stripe payments are immutable'); END`
    )
  ])
  const now = NOW.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Stripe Checkout User', 'stripe@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('dormant Stripe Checkout port', () => {
  const grantAdmin = async () => {
    await env.AUTH_DB.prepare(
      `INSERT INTO staff_roles
         (user_id, role, granted_by_user_id, reason, created_at)
       VALUES (?, 'ADMIN', NULL, 'Stripe staff read test', ?)`
    )
      .bind(userId, NOW.toISOString())
      .run()
  }

  it('fails closed without complete configuration and creates no payment', async () => {
    expect(premiumSkypassCommerceCapability(env as unknown as Env)).toEqual({
      available: false,
      provider: 'STRIPE',
      productCode: 'skypass_0001',
      fulfillment: 'OFFCHAIN',
      price: { currency: 'USD', amountMinor: 1_495, display: '$14.95' }
    })
    const repository = new StripeCheckoutRepository(
      env.AUTH_DB,
      env as unknown as Env
    )
    await expect(
      repository.createCheckout(userId, 'skypass_0001', NOW)
    ).rejects.toThrow('Stripe payments are disabled')
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM stripe_checkout_payments'
      ).first('count')
    ).toBe(0)
  })

  it('creates a pending source checkout with Stripe and D1 idempotency metadata', async () => {
    const { checkout, checkoutRequest, payment } = await createPending()
    expect(checkout.url).toBe(
      'https://checkout.stripe.com/c/pay/cs_test_cloud_weasel'
    )
    expect(payment).toMatchObject({
      product_code: 'skypass_0001',
      item_type: 'SW_SKYPASS',
      quantity: 1,
      checkout_season: seasonFromDate(NOW),
      status: 'PENDING',
      stripe_session_id: 'cs_test_cloud_weasel'
    })
    expect(checkoutRequest.headers.get('Authorization')).toBe(
      'Bearer sk_test_cloud_weasel'
    )
    expect(checkoutRequest.headers.get('Idempotency-Key')).toBe(payment.id)
    const form = await checkoutRequest.clone().formData()
    expect(form.get('mode')).toBe('payment')
    expect(form.get('line_items[0][price]')).toBe('price_skypass_test')
    expect(form.get('line_items[0][quantity]')).toBe('1')
    expect(form.get('metadata[cloud_weasel_payment_id]')).toBe(payment.id)
    expect(form.get('client_reference_id')).toBe(userId)
  })

  it('fails closed before redirect when a Stripe Price ID has the wrong price', async () => {
    const repository = new StripeCheckoutRepository(
      env.AUTH_DB,
      configuredEnv(),
      async () =>
        Response.json({
          id: 'cs_test_wrong_price',
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/c/pay/cs_test_wrong_price',
          amount_total: 1,
          currency: 'usd'
        })
    )
    await expect(
      repository.createCheckout(userId, 'skypass_0001', NOW)
    ).rejects.toThrow('create payment intent')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, last_error FROM stripe_checkout_payments`
      ).first()
    ).toEqual({
      status: 'FAILED',
      last_error: 'Stripe Checkout Session price does not match product policy'
    })
  })

  it('preserves the authenticated source RPC checkout response', async () => {
    const stripeFetch: StripeFetch = async request => {
      if (request.method === 'GET') return stripeEventLookup(request)
      return Response.json({
        id: 'cs_test_checkout_rpc',
        object: 'checkout.session',
        url: 'https://checkout.stripe.com/c/pay/cs_test_checkout_rpc',
        amount_total: 1_495,
        currency: 'usd'
      })
    }
    const token = await createIdentitySession(
      userId,
      configuredEnv().SESSION_SIGNING_KEY
    )
    const request = (signedIn: boolean) =>
      new Request(
        'https://opensky.example/api/rpc/SkyWeaverAPI/CreateStripePaymentIntent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signedIn
              ? { Cookie: `${IDENTITY_SESSION_COOKIE}=${token}` }
              : {})
          },
          body: JSON.stringify({ productID: 'skypass_0001' })
        }
      )

    expect(
      (
        await handleApiRequest(
          request(false),
          configuredEnv(),
          authServices(stripeFetch)
        )
      ).status
    ).toBe(401)
    const response = await handleApiRequest(
      request(true),
      configuredEnv(),
      authServices(stripeFetch)
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      checkout: {
        url: 'https://checkout.stripe.com/c/pay/cs_test_checkout_rpc'
      }
    })
  })

  it('records a failed Stripe API attempt without returning its private error', async () => {
    const repository = new StripeCheckoutRepository(
      env.AUTH_DB,
      configuredEnv(),
      async () =>
        Response.json(
          { error: { message: 'private Stripe account detail' } },
          { status: 400 }
        )
    )
    await expect(
      repository.createCheckout(userId, 'skypass_0001', NOW)
    ).rejects.toThrow('create payment intent')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, last_error FROM stripe_checkout_payments`
      ).first()
    ).toEqual({ status: 'FAILED', last_error: 'private Stripe account detail' })
  })

  it('retries an indeterminate checkout with the same Stripe idempotency key', async () => {
    const idempotencyKeys: string[] = []
    let attempts = 0
    const repository = new StripeCheckoutRepository(
      env.AUTH_DB,
      configuredEnv(),
      async request => {
        idempotencyKeys.push(request.headers.get('Idempotency-Key')!)
        attempts += 1
        if (attempts === 1) throw new Error('response lost after request')
        return Response.json({
          id: 'cs_test_recovered_checkout',
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/c/pay/cs_test_recovered_checkout',
          amount_total: 1_495,
          currency: 'usd'
        })
      }
    )

    await expect(
      repository.createCheckout(userId, 'skypass_0001', NOW)
    ).rejects.toThrow('create payment intent')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM stripe_checkout_payments`
      ).first('status')
    ).toBe('INITIATING')

    await expect(
      repository.createCheckout(userId, 'skypass_0001', NOW)
    ).resolves.toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_test_recovered_checkout'
    })
    expect(idempotencyKeys).toHaveLength(2)
    expect(idempotencyKeys[0]).toBe(idempotencyKeys[1])
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM stripe_checkout_payments'
      ).first('count')
    ).toBe(1)
  })

  it('coalesces concurrent checkout requests into one active Stripe Session', async () => {
    const idempotencyKeys: string[] = []
    const repository = new StripeCheckoutRepository(
      env.AUTH_DB,
      configuredEnv(),
      async request => {
        idempotencyKeys.push(request.headers.get('Idempotency-Key')!)
        await Promise.resolve()
        return Response.json({
          id: 'cs_test_concurrent_checkout',
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/c/pay/cs_test_concurrent_checkout',
          amount_total: 1_495,
          currency: 'usd'
        })
      }
    )
    const checkouts = await Promise.all([
      repository.createCheckout(userId, 'skypass_0001', NOW),
      repository.createCheckout(userId, 'skypass_0001', NOW)
    ])

    expect(checkouts[0]).toEqual(checkouts[1])
    expect(new Set(idempotencyKeys).size).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM stripe_checkout_payments'
      ).first('count')
    ).toBe(1)
  })

  it('verifies the raw signature and grants premium SkyPass exactly once', async () => {
    const { repository, payment } = await createPending()
    const event = eventFor(payment)
    await repository.handleWebhook(await signedWebhook(event), NOW)
    await repository.handleWebhook(await signedWebhook(event), NOW)

    const season = seasonFromDate(NOW)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, currency, amount_total, fulfilled_season
         FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first()
    ).toEqual({
      status: 'SUCCEEDED',
      currency: 'usd',
      amount_total: 1_495,
      fulfilled_season: season
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance, unlock_source FROM player_items
         WHERE user_id = ? AND item_type = 'SW_SKYPASS' AND token_id = ?`
      )
        .bind(userId, season)
        .first()
    ).toEqual({ balance: 1, unlock_source: `stripe:${payment.id}` })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT has_premium, initial_account_level, achieved_account_level
         FROM player_skypass_season_stats
         WHERE user_id = ? AND season = ?`
      )
        .bind(userId, season)
        .first()
    ).toEqual({
      has_premium: 1,
      initial_account_level: 0,
      achieved_account_level: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM stripe_checkout_events'
      ).first('count')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, quantity, stackable, before_balance,
                after_balance, before_has_premium, after_has_premium
         FROM stripe_checkout_fulfillment_receipts WHERE payment_id = ?`
      )
        .bind(payment.id)
        .first()
    ).toEqual({
      item_type: 'SW_SKYPASS',
      token_id: season,
      quantity: 1,
      stackable: 0,
      before_balance: 0,
      after_balance: 1,
      before_has_premium: 0,
      after_has_premium: 1
    })
  })

  it('accepts the signed public source webhook RPC without a login session', async () => {
    const { payment } = await createPending()
    const event = eventFor(payment)
    const request = await signedWebhook(event, new Date())
    const response = await handleApiRequest(
      request,
      configuredEnv(),
      authServices(stripeEventLookup)
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({})
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first('status')
    ).toBe('SUCCEEDED')
  })

  it('preserves source completion-time season rollover semantics', async () => {
    const checkoutAt = new Date('2026-08-12T12:00:00.000Z')
    const completionAt = new Date('2026-09-01T12:00:00.000Z')
    expect(seasonFromDate(completionAt)).not.toBe(seasonFromDate(checkoutAt))
    const { repository, payment } = await createPending()
    await repository.handleWebhook(
      await signedWebhook(eventFor(payment), completionAt),
      completionAt
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT fulfilled_season FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first('fulfilled_season')
    ).toBe(seasonFromDate(completionAt))
    expect(
      await env.AUTH_DB.prepare(
        `SELECT has_premium FROM player_skypass_season_stats
         WHERE user_id = ? AND season = ?`
      )
        .bind(userId, seasonFromDate(completionAt))
        .first('has_premium')
    ).toBe(1)
  })

  it('rejects invalid, stale, unpaid, and metadata-mismatched events', async () => {
    const { repository, payment } = await createPending()
    const event = eventFor(payment)
    const invalidSignature = await signedWebhook(event)
    invalidSignature.headers.set(
      'Stripe-Signature',
      `t=${Math.floor(NOW.getTime() / 1_000)},v1=${'0'.repeat(64)}`
    )
    await expect(
      repository.handleWebhook(invalidSignature, NOW)
    ).rejects.toThrow('Stripe signature is invalid')
    await expect(
      repository.handleWebhook(
        await signedWebhook(event, new Date(NOW.getTime() - 10 * 60_000)),
        NOW
      )
    ).rejects.toThrow('Stripe signature timestamp is invalid')
    await expect(
      repository.handleWebhook(
        await signedWebhook(eventFor(payment, { payment_status: 'unpaid' })),
        NOW
      )
    ).resolves.toBeUndefined()
    await expect(
      repository.handleWebhook(
        await signedWebhook(
          eventFor(payment, {
            metadata: {
              cloud_weasel_payment_id: payment.id,
              cloud_weasel_user_id: 'another-user',
              product_code: payment.product_code,
              season: String(payment.checkout_season)
            }
          })
        ),
        NOW
      )
    ).rejects.toThrow('Stripe payment metadata does not match')
    await expect(
      repository.handleWebhook(
        await signedWebhook(eventFor(payment, { amount_total: 1 })),
        NOW
      )
    ).rejects.toThrow('Stripe payment price does not match product policy')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first('status')
    ).toBe('PENDING')
  })

  it('retrieves the signed event from Stripe before trusting its contents', async () => {
    const { repository, payment } = await createPending()
    const event = eventFor(payment)
    const request = await signedWebhook(event)
    stripeEvents.set(event.id, { ...event, id: 'evt_different_event' })
    await expect(repository.handleWebhook(request, NOW)).rejects.toThrow(
      'Stripe webhook event is invalid'
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first('status')
    ).toBe('PENDING')
  })

  it('rolls back failed fulfillment and retries without double granting', async () => {
    const { repository, payment } = await createPending(
      'conquest_tickets_0001',
      'cs_test_ticket_retry'
    )
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_CONQUEST_TICKET', 2, 7, 0, 'test-existing-ticket',
               ?, ?)`
    )
      .bind(userId, NOW.toISOString(), NOW.toISOString())
      .run()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_stripe_skypass_fulfillment
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'stripe:%'
       BEGIN SELECT RAISE(ABORT, 'injected Stripe fulfillment failure'); END`
    ).run()
    const event = eventFor(payment)
    await expect(
      repository.handleWebhook(await signedWebhook(event), NOW)
    ).rejects.toThrow('injected Stripe fulfillment failure')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM stripe_checkout_events) AS events,
           (SELECT COUNT(*) FROM stripe_checkout_fulfillment_receipts)
             AS fulfillments,
           (SELECT COUNT(*) FROM player_items
            WHERE unlock_source LIKE 'stripe:%') AS items,
           (SELECT balance FROM player_items
            WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
              AND token_id = 2) AS balance,
           (SELECT status FROM stripe_checkout_payments WHERE id = ?) AS status`
      )
        .bind(userId, payment.id)
        .first()
    ).toEqual({
      events: 0,
      fulfillments: 0,
      items: 0,
      balance: 7,
      status: 'PENDING'
    })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_stripe_skypass_fulfillment'
    ).run()
    await Promise.all([
      repository.handleWebhook(await signedWebhook(event), NOW),
      repository.handleWebhook(await signedWebhook(event), NOW)
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
      )
        .bind(userId)
        .first('balance')
    ).toBe(8)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM stripe_checkout_events'
      ).first('count')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, quantity, stackable, before_balance,
                after_balance, before_has_premium, after_has_premium
         FROM stripe_checkout_fulfillment_receipts WHERE payment_id = ?`
      )
        .bind(payment.id)
        .first()
    ).toEqual({
      item_type: 'SW_CONQUEST_TICKET',
      token_id: 2,
      quantity: 1,
      stackable: 1,
      before_balance: 7,
      after_balance: 8,
      before_has_premium: null,
      after_has_premium: null
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE stripe_checkout_fulfillment_receipts
         SET after_balance = after_balance + 1 WHERE payment_id = ?`
      )
        .bind(payment.id)
        .run()
    ).rejects.toThrow('Stripe fulfillment receipts are immutable')
  })

  it('refuses to mark a paid Stripe payment successful without fulfillment evidence', async () => {
    const { payment } = await createPending(
      'conquest_tickets_0001',
      'cs_test_incomplete_fulfillment'
    )
    const receivedAt = NOW.toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO stripe_checkout_events
         (event_id, event_type, stripe_session_id, payment_id,
          payload_sha256, outcome, received_at)
       VALUES ('evt_incomplete_fulfillment', 'checkout.session.completed',
               ?, ?, ?, 'SUCCEEDED', ?)`
    )
      .bind(payment.stripe_session_id, payment.id, 'f'.repeat(64), receivedAt)
      .run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE stripe_checkout_payments
         SET status = 'SUCCEEDED', currency = 'usd', amount_total = 150,
             fulfilled_season = ?, completed_at = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(seasonFromDate(NOW), receivedAt, receivedAt, payment.id)
        .run()
    ).rejects.toThrow('Stripe payment fulfillment is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO stripe_checkout_payments
           (id, user_id, product_code, item_type, quantity, checkout_season,
            fulfilled_season, status, stripe_session_id, checkout_url,
            currency, amount_total, created_at, updated_at, completed_at)
         VALUES (?, ?, 'conquest_tickets_0001', 'SW_CONQUEST_TICKET', 1,
                 ?, ?, 'SUCCEEDED', 'cs_forged_success',
                 'https://checkout.stripe.com/forged', 'usd', 1495, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          userId,
          seasonFromDate(NOW),
          seasonFromDate(NOW),
          receivedAt,
          receivedAt,
          receivedAt
        )
        .run()
    ).rejects.toThrow('Stripe payment preparation is invalid')
  })

  it('pins the exact source price in D1 independently of Worker validation', async () => {
    const { payment } = await createPending(
      'conquest_tickets_0001',
      'cs_test_wrong_d1_price'
    )
    const receivedAt = NOW.toISOString()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE stripe_checkout_payments
         SET status = 'SUCCEEDED', currency = 'usd', amount_total = 1495,
             fulfilled_season = ?, completed_at = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(seasonFromDate(NOW), receivedAt, receivedAt, payment.id)
        .run()
    ).rejects.toThrow('Stripe payment price policy is invalid')
  })

  it('records expiration without granting inventory', async () => {
    const { repository, payment } = await createPending()
    const event = eventFor(payment)
    event.id = 'evt_cloud_weasel_expired'
    event.type = 'checkout.session.expired'
    await repository.handleWebhook(await signedWebhook(event), NOW)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, last_error FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first()
    ).toEqual({ status: 'FAILED', last_error: 'checkout.session.expired' })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items
         WHERE unlock_source LIKE 'stripe:%'`
      ).first('count')
    ).toBe(0)
  })

  it('recovers an expired payment when a paid event arrives out of order', async () => {
    const { repository, payment } = await createPending()
    const expired = eventFor(payment)
    expired.id = 'evt_cloud_weasel_expired_first'
    expired.type = 'checkout.session.expired'
    await repository.handleWebhook(await signedWebhook(expired), NOW)

    const paid = eventFor(payment)
    paid.id = 'evt_cloud_weasel_paid_late'
    paid.type = 'checkout.session.async_payment_succeeded'
    const paidAt = new Date(NOW.getTime() + 60_000)
    await repository.handleWebhook(await signedWebhook(paid, paidAt), paidAt)

    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, last_error FROM stripe_checkout_payments WHERE id = ?`
      )
        .bind(payment.id)
        .first()
    ).toEqual({ status: 'SUCCEEDED', last_error: null })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_SKYPASS'
           AND unlock_source = ?`
      )
        .bind(userId, `stripe:${payment.id}`)
        .first('balance')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM stripe_checkout_events'
      ).first('count')
    ).toBe(2)
  })

  it('ports source staff payment filters, pagination, and immutable logs', async () => {
    const first = await createPending('skypass_0001', 'cs_test_staff_first')
    await first.repository.handleWebhook(
      await signedWebhook(eventFor(first.payment), NOW),
      NOW
    )
    const second = await createPending(
      'conquest_tickets_0001',
      'cs_test_staff_second',
      new Date(NOW.getTime() + 60_000)
    )

    const firstPage = await second.repository.listStaffPayments({
      page: { pageSize: 1 }
    })
    expect(firstPage.payments).toHaveLength(1)
    expect(firstPage.payments[0]).toMatchObject({
      accountID: expect.any(Number),
      status: 'PENDING',
      provider: 'STRIPE',
      externalTxnID: 'cs_test_staff_second'
    })
    expect(firstPage.page.hasBefore).toBe(true)
    expect(firstPage.page.sort).toEqual([])
    expect(JSON.parse(atob(firstPage.page.after!))).toEqual([
      firstPage.payments[0].createdAt
    ])

    const third = await createPending(
      'skypass_0001',
      'cs_test_staff_third',
      new Date(NOW.getTime() + 120_000)
    )
    const secondPage = await second.repository.listStaffPayments({
      page: { pageSize: 1, before: firstPage.page.after }
    })
    expect(secondPage.payments[0]).toMatchObject({
      status: 'SUCCEEDED',
      externalTxnID: 'cs_test_staff_first'
    })
    const backwardPage = await third.repository.listStaffPayments({
      page: { pageSize: 1, after: secondPage.page.before }
    })
    expect(backwardPage.payments[0]).toMatchObject({
      status: 'PENDING',
      externalTxnID: 'cs_test_staff_second'
    })
    expect(backwardPage.page).toMatchObject({
      hasBefore: true,
      hasAfter: true,
      sort: []
    })

    const ascending = await third.repository.listStaffPayments({
      page: {
        pageSize: 1,
        sort: [{ column: 'createdAt', order: 'ASC' as never }]
      }
    })
    expect(ascending.payments[0]).toMatchObject({
      status: 'SUCCEEDED',
      externalTxnID: 'cs_test_staff_first'
    })
    expect(ascending.page.sort).toEqual([])
    expect(
      (
        await third.repository.listStaffPayments({
          page: { pageSize: 999 }
        })
      ).page.pageSize
    ).toBe(200)
    await expect(
      third.repository.listStaffPayments({
        page: { before: 'not-a-cursor' }
      })
    ).rejects.toThrow('page cursor is invalid')
    await expect(
      third.repository.listStaffPayments({
        page: {
          before: firstPage.page.after,
          after: firstPage.page.before
        }
      })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      third.repository.listStaffPayments({
        page: {
          sort: [{ column: 'status', order: 'ASC' as never }]
        }
      })
    ).rejects.toThrow('payment sort is invalid')
    expect(
      (
        await second.repository.listStaffPayments({
          status: 'SUCCEEDED' as never,
          provider: 'STRIPE' as never,
          address: `identity:${userId}`
        })
      ).payments
    ).toHaveLength(1)
    expect(
      (
        await second.repository.listStaffPayments({
          provider: 'GOOGLE_PLAY' as never
        })
      ).payments
    ).toEqual([])

    const logs = await second.repository.listStaffPaymentLogs(
      secondPage.payments[0].id
    )
    expect(logs.map(log => log.data.type)).toEqual([
      '*stripe.Event',
      '*stripe.CheckoutSession',
      'payments.IntentRequest'
    ])
    expect(logs[2].data.data).toEqual({ product_id: 'skypass_0001' })
    await expect(
      env.AUTH_DB.prepare(`DELETE FROM stripe_checkout_logs`).run()
    ).rejects.toThrow('Stripe checkout logs are immutable')
  })

  it('keeps staff payment reads admin-only through the source RPCs', async () => {
    const { payment } = await createPending()
    const token = await createIdentitySession(
      userId,
      configuredEnv().SESSION_SIGNING_KEY
    )
    const call = (method: string, body: object, signedIn = true) =>
      handleApiRequest(
        new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signedIn
              ? { Cookie: `${IDENTITY_SESSION_COOKIE}=${token}` }
              : {})
          },
          body: JSON.stringify(body)
        }),
        configuredEnv()
      )

    expect((await call('GMListPayments', {}, false)).status).toBe(401)
    expect((await call('GMListPayments', {})).status).toBe(403)
    await grantAdmin()

    const paymentsResponse = await call('GMListPayments', {
      provider: 'STRIPE',
      address: `identity:${userId}`
    })
    expect(paymentsResponse.status).toBe(200)
    const paymentsBody = (await paymentsResponse.json()) as {
      payments: Array<{
        id: number
        accountID: number
        status: string | null
        provider: string | null
        externalTxnID: string
        createdAt: string | null
      }>
    }
    expect(paymentsBody.payments).toEqual([
      expect.objectContaining({
        status: 'PENDING',
        provider: 'STRIPE',
        externalTxnID: payment.stripe_session_id,
        createdAt: expect.any(String)
      })
    ])
    expect(Object.keys(paymentsBody.payments[0])).toEqual([
      'id',
      'accountID',
      'status',
      'provider',
      'externalTxnID',
      'createdAt'
    ])
    expect(paymentsBody.payments[0]).not.toHaveProperty('cursor')
    expect(
      (
        (await (
          await call('GMListPayments', { provider: 'GOOGLE_PLAY' })
        ).json()) as { payments: unknown[] }
      ).payments
    ).toEqual([])

    const logsResponse = await call('GMListPaymentLogs', {
      paymentID: paymentsBody.payments[0].id
    })
    expect(logsResponse.status).toBe(200)
    const logsBody = (await logsResponse.json()) as {
      logs: Array<{
        id: number
        paymentID: number
        data: { type: string; data: unknown } | null
        createdAt: string | null
      }>
    }
    expect(logsBody).toMatchObject({
      logs: [
        { data: { type: '*stripe.CheckoutSession' } },
        { data: { type: 'payments.IntentRequest' } }
      ]
    })
    expect(Object.keys(logsBody.logs[0])).toEqual([
      'id',
      'paymentID',
      'data',
      'createdAt'
    ])
    expect(Object.keys(logsBody.logs[0].data!)).toEqual(['type', 'data'])
    expect(
      await (await call('GMListPaymentLogs', { paymentID: 999_999 })).json()
    ).toEqual({ logs: [] })
    expect((await call('GMListPaymentLogs', { paymentID: 0 })).status).toBe(400)
  })
})
