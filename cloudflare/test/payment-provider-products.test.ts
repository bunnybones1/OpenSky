import { env } from 'cloudflare:workers'
import type { ItemType, PaymentProvider } from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { listPaymentProviderProducts } from '../src/payment-provider-products'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const userId = 'payment-catalog-user'

const rpc = async (body: object, signedIn = true) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(
      'https://opensky.example/api/rpc/SkyWeaverAPI/ListPaymentProviderProducts',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }
    ),
    testEnv
  )
}

beforeEach(async () => {
  await env.AUTH_DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Payment Catalog User', 'payments@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('source payment provider product catalog', () => {
  it('preserves every source provider, product code, item type, and quantity', () => {
    const providers = [
      'GOOGLE_PLAY',
      'APPLE_APP_STORE',
      'STRIPE',
      'SEQUENCE',
      'SAMSUNG_GALAXY_STORE'
    ] as PaymentProvider[]
    for (const provider of providers) {
      expect(listPaymentProviderProducts(provider)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provider,
            itemType: 'SW_SKYPASS',
            code: 'skypass_0001',
            quantity: 1
          })
        ])
      )
    }
    expect(listPaymentProviderProducts('STRIPE' as PaymentProvider)).toEqual([
      {
        provider: 'STRIPE',
        itemType: 'SW_CONQUEST_TICKET',
        code: 'conquest_tickets_0001',
        quantity: 1
      },
      {
        provider: 'STRIPE',
        itemType: 'SW_SKYPASS',
        code: 'skypass_0001',
        quantity: 1
      }
    ])
    expect(
      listPaymentProviderProducts('GOOGLE_PLAY' as PaymentProvider).map(
        product => product.quantity
      )
    ).toEqual([2, 5, 9, 14, 24, 1])
  })

  it('filters by source item type and returns no products for unsupported input', () => {
    expect(
      listPaymentProviderProducts(
        'STRIPE' as PaymentProvider,
        'SW_SKYPASS' as ItemType
      )
    ).toEqual([
      {
        provider: 'STRIPE',
        itemType: 'SW_SKYPASS',
        code: 'skypass_0001',
        quantity: 1
      }
    ])
    expect(
      listPaymentProviderProducts(
        'STRIPE' as PaymentProvider,
        'SW_BASE_CARDS' as ItemType
      )
    ).toEqual([])
    expect(listPaymentProviderProducts('UNKNOWN' as PaymentProvider)).toEqual(
      []
    )
  })

  it('serves the catalog to a Google identity and keeps it authenticated', async () => {
    const response = await rpc({
      provider: 'STRIPE',
      itemType: 'SW_SKYPASS'
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      products: [
        {
          provider: 'STRIPE',
          itemType: 'SW_SKYPASS',
          code: 'skypass_0001',
          quantity: 1
        }
      ]
    })
    expect((await rpc({ provider: 'STRIPE' }, false)).status).toBe(401)
    expect((await rpc({})).status).toBe(400)
  })
})
