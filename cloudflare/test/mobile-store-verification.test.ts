import { env } from 'cloudflare:workers'
import { PaymentProvider } from '@opensky/proto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleApiRequest, type AuthServices } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import {
  MobileStoreVerificationRepository,
  type MobileStoreFetch
} from '../src/mobile-store-verification'
import { PlayerRepository } from '../src/player'

const baseEnv = env as unknown as Env
const userId = 'samsung-payment-user'
const attackerId = 'samsung-payment-attacker'
const NOW = new Date('2026-08-12T12:00:00.000Z')
const PACKAGE_NAME = 'com.cloudweasel.game'

const configuredEnv = (): Env =>
  ({ ...baseEnv, SAMSUNG_IAP_PACKAGE_NAME: PACKAGE_NAME }) as Env

const providerResponse = {
  itemId: 'conquest_tickets_0009',
  itemName: 'Nine tickets',
  itemPrice: 7.99,
  itemPriceString: '$7.99',
  currencyUnit: '$',
  currencyCode: 'USD',
  itemDesc: 'Nine Cloud Weasel Conquest tickets',
  type: 'Item',
  isConsumable: true,
  paymentId: 'samsung-payment-20260812',
  purchaseId: 'samsung-purchase-20260812',
  purchaseDate: '2026-08-12 12:00:00 GMT',
  passThroughParam: '',
  itemImageUrl: '',
  itemDownloadUrl: '',
  orderId: 'samsung-order-20260812'
}

const receipt = (overrides: Record<string, unknown> = {}) => ({
  itemId: providerResponse.itemId,
  paymentId: providerResponse.paymentId,
  orderId: providerResponse.orderId,
  packageName: PACKAGE_NAME,
  itemName: providerResponse.itemName,
  itemDesc: providerResponse.itemDesc,
  purchaseDate: providerResponse.purchaseDate,
  paymentAmount: '7.99',
  status: 'success',
  mode: 'PRODUCTION',
  currencyCode: 'USD',
  currencyUnit: '$',
  ...overrides
})

const createPlayer = async (id: string, name: string) => {
  const now = NOW.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, name, `${id}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(id)
}

const ticketBalance = (id = userId) =>
  env.AUTH_DB.prepare(
    `SELECT balance FROM player_items
     WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
  )
    .bind(id)
    .first<number>('balance')

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS mobile_store_payments_no_delete'
    ),
    env.AUTH_DB.prepare(
      `DELETE FROM mobile_store_payments WHERE user_id IN (?, ?)`
    ).bind(userId, attackerId),
    env.AUTH_DB.prepare(`DELETE FROM users WHERE id IN (?, ?)`).bind(
      userId,
      attackerId
    ),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER mobile_store_payments_no_delete
       BEFORE DELETE ON mobile_store_payments
       BEGIN SELECT RAISE(ABORT, 'Mobile store payments are immutable'); END`
    )
  ])
  await createPlayer(userId, 'SamsungWeasel')
  await createPlayer(attackerId, 'SamsungBandit')
})

describe('Samsung Galaxy Store payment verification', () => {
  it('verifies against the fixed HTTPS endpoint and delivers off-chain', async () => {
    const mobileStoreFetch = vi.fn<MobileStoreFetch>(async request => {
      const url = new URL(request.url)
      expect(url.origin + url.pathname).toBe(
        'https://iap.samsungapps.com/iap/v6/receipt'
      )
      expect(url.searchParams.get('purchaseID')).toBe(
        providerResponse.purchaseId
      )
      return Response.json(receipt())
    })
    const repository = new MobileStoreVerificationRepository(
      env.AUTH_DB,
      configuredEnv(),
      mobileStoreFetch
    )

    await repository.verifySamsung(userId, providerResponse, NOW)
    await repository.verifySamsung(userId, providerResponse, NOW)

    expect(await ticketBalance()).toBe(9)
    expect(mobileStoreFetch).toHaveBeenCalledTimes(2)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT provider, verification_sha256, status
         FROM mobile_store_payments
         WHERE external_transaction_id = ?`
      )
        .bind(providerResponse.paymentId)
        .first()
    ).toMatchObject({
      provider: PaymentProvider.SAMSUNG_GALAXY_STORE,
      verification_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      status: 'SUCCEEDED'
    })
  })

  it('rejects test, failed, mismatched package, item, and payment receipts', async () => {
    for (const override of [
      { mode: 'TEST' },
      { status: 'fail' },
      { packageName: 'com.attacker.game' },
      { itemId: 'conquest_tickets_0024' },
      { paymentId: 'different-payment' }
    ]) {
      const repository = new MobileStoreVerificationRepository(
        env.AUTH_DB,
        configuredEnv(),
        async () => Response.json(receipt(override))
      )
      await expect(
        repository.verifySamsung(userId, providerResponse, NOW)
      ).rejects.toThrow()
    }
    expect(await ticketBalance()).toBeNull()
  })

  it('fails closed without package configuration or when Samsung is unavailable', async () => {
    const storeFetch = vi.fn<MobileStoreFetch>()
    await expect(
      new MobileStoreVerificationRepository(
        env.AUTH_DB,
        baseEnv,
        storeFetch
      ).verifySamsung(userId, providerResponse, NOW)
    ).rejects.toThrow('payments are disabled')
    expect(storeFetch).not.toHaveBeenCalled()

    await expect(
      new MobileStoreVerificationRepository(
        env.AUTH_DB,
        configuredEnv(),
        async () => Response.json({ error: 'down' }, { status: 503 })
      ).verifySamsung(userId, providerResponse, NOW)
    ).rejects.toThrow('verification is unavailable')
    expect(await ticketBalance()).toBeNull()
  })

  it('exposes the authenticated source RPC envelope and rejects anonymous calls', async () => {
    const mobileStoreFetch: MobileStoreFetch = async () =>
      Response.json(receipt())
    const services: AuthServices = {
      verifyProof: async () => {
        throw new Error('not expected')
      },
      mobileStoreFetch
    }
    const rpc = async (signedIn: boolean) => {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      if (signedIn) {
        headers.set(
          'Cookie',
          `${IDENTITY_SESSION_COOKIE}=${await createIdentitySession(
            userId,
            baseEnv.SESSION_SIGNING_KEY
          )}`
        )
      }
      return handleApiRequest(
        new Request(
          'https://opensky.example/api/rpc/SkyWeaverAPI/VerifySamsungGalaxyStorePayment',
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ providerResponse })
          }
        ),
        configuredEnv(),
        services
      )
    }

    const anonymous = await rpc(false)
    expect(anonymous.status).toBe(401)
    const authenticated = await rpc(true)
    expect(authenticated.status).toBe(200)
    expect(await authenticated.json()).toEqual({ status: true })
    expect(await ticketBalance()).toBe(9)
  })

  it('cannot reassign one verified payment to another identity', async () => {
    const repository = new MobileStoreVerificationRepository(
      env.AUTH_DB,
      configuredEnv(),
      async () => Response.json(receipt())
    )
    await repository.verifySamsung(userId, providerResponse, NOW)
    await expect(
      repository.verifySamsung(attackerId, providerResponse, NOW)
    ).rejects.toThrow('already fulfilled')
    expect(await ticketBalance(userId)).toBe(9)
    expect(await ticketBalance(attackerId)).toBeNull()
  })
})
