import { env } from 'cloudflare:workers'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
const userId = 'google-play-payment-user'
const NOW = new Date('2026-08-12T12:00:00.000Z')
const PACKAGE_NAME = 'com.cloudweasel.game'
const PRODUCT_ID = 'conquest_tickets_0014'
const ORDER_ID = 'GPA.1234-5678-9012-34567'
const PURCHASE_TOKEN = 'google/token+with=symbols'
let serviceAccountJson = ''
let publicKey: CryptoKey

const base64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const base64UrlBytes = (value: string): ArrayBuffer => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  )
  return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer
}

const configuredEnv = (): Env =>
  ({
    ...baseEnv,
    GOOGLE_PLAY_PACKAGE_NAME: PACKAGE_NAME,
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: serviceAccountJson
  }) as Env

const providerResponse = {
  productId: PRODUCT_ID,
  transactionId: ORDER_ID,
  transactionDate: NOW.getTime(),
  transactionReceipt: '{}',
  purchaseToken: PURCHASE_TOKEN,
  packageNameAndroid: PACKAGE_NAME,
  currency: 'USD',
  totalPrice: 9.99
}

const productPurchase = (overrides: Record<string, unknown> = {}) => ({
  kind: 'androidpublisher#productPurchase',
  orderId: ORDER_ID,
  purchaseState: 0,
  productId: PRODUCT_ID,
  purchaseToken: PURCHASE_TOKEN,
  purchaseTimeMillis: String(NOW.getTime()),
  quantity: 1,
  regionCode: 'CA',
  ...overrides
})

const ticketBalance = () =>
  env.AUTH_DB.prepare(
    `SELECT balance FROM player_items
     WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
  )
    .bind(userId)
    .first<number>('balance')

beforeAll(async () => {
  const keys = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  publicKey = keys.publicKey
  const privateBytes = new Uint8Array(
    await crypto.subtle.exportKey('pkcs8', keys.privateKey)
  )
  const wrapped =
    base64(privateBytes)
      .match(/.{1,64}/g)
      ?.join('\n') ?? ''
  serviceAccountJson = JSON.stringify({
    type: 'service_account',
    client_email: 'play-payments@cloud-weasel.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`
  })
})

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      'DROP TRIGGER IF EXISTS mobile_store_payments_no_delete'
    ),
    env.AUTH_DB.prepare(
      'DELETE FROM mobile_store_payments WHERE user_id = ?'
    ).bind(userId),
    env.AUTH_DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
    env.AUTH_DB.prepare(
      `CREATE TRIGGER mobile_store_payments_no_delete
       BEFORE DELETE ON mobile_store_payments
       BEGIN SELECT RAISE(ABORT, 'Mobile store payments are immutable'); END`
    )
  ])
  const now = NOW.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'GooglePlayWeasel', 'play@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('Google Play payment verification', () => {
  it('signs the Android Publisher JWT, verifies the purchase, and delivers off-chain', async () => {
    const storeFetch = vi.fn<MobileStoreFetch>(async request => {
      const url = new URL(request.url)
      if (url.pathname === '/token') {
        expect(request.method).toBe('POST')
        const form = new URLSearchParams(
          new TextDecoder().decode(await request.arrayBuffer())
        )
        expect(form.get('grant_type')).toBe(
          'urn:ietf:params:oauth:grant-type:jwt-bearer'
        )
        const assertion = form.get('assertion')!
        const [headerPart, claimsPart, signaturePart] = assertion.split('.')
        expect(
          JSON.parse(new TextDecoder().decode(base64UrlBytes(headerPart)))
        ).toEqual({ alg: 'RS256', typ: 'JWT' })
        expect(
          JSON.parse(new TextDecoder().decode(base64UrlBytes(claimsPart)))
        ).toEqual({
          iss: 'play-payments@cloud-weasel.iam.gserviceaccount.com',
          scope: 'https://www.googleapis.com/auth/androidpublisher',
          aud: 'https://oauth2.googleapis.com/token',
          iat: Math.floor(NOW.getTime() / 1_000),
          exp: Math.floor(NOW.getTime() / 1_000) + 3_600
        })
        expect(
          await crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5',
            publicKey,
            base64UrlBytes(signaturePart),
            new TextEncoder().encode(`${headerPart}.${claimsPart}`)
          )
        ).toBe(true)
        return Response.json({
          access_token: 'android-publisher-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      }
      expect(url.origin).toBe('https://androidpublisher.googleapis.com')
      expect(decodeURIComponent(url.pathname)).toBe(
        `/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${PRODUCT_ID}/tokens/${PURCHASE_TOKEN}`
      )
      expect(request.headers.get('Authorization')).toBe(
        'Bearer android-publisher-access-token'
      )
      return Response.json(productPurchase())
    })
    const repository = new MobileStoreVerificationRepository(
      env.AUTH_DB,
      configuredEnv(),
      storeFetch
    )

    await repository.verifyGoogle(userId, providerResponse, NOW)
    await repository.verifyGoogle(userId, providerResponse, NOW)

    expect(await ticketBalance()).toBe(14)
    expect(storeFetch).toHaveBeenCalledTimes(4)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT provider, product_code, verification_sha256, status
         FROM mobile_store_payments WHERE external_transaction_id = ?`
      )
        .bind(ORDER_ID)
        .first()
    ).toMatchObject({
      provider: 'GOOGLE_PLAY',
      product_code: PRODUCT_ID,
      verification_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      status: 'SUCCEEDED'
    })
  })

  it('rejects pending, canceled, and mismatched Google purchases', async () => {
    for (const override of [
      { purchaseState: 1 },
      { purchaseState: 2 },
      { orderId: 'GPA.different' },
      { productId: 'conquest_tickets_0024' },
      { purchaseToken: 'different-token' }
    ]) {
      const repository = new MobileStoreVerificationRepository(
        env.AUTH_DB,
        configuredEnv(),
        async request =>
          new URL(request.url).pathname === '/token'
            ? Response.json({ access_token: 'token', token_type: 'Bearer' })
            : Response.json(productPurchase(override))
      )
      await expect(
        repository.verifyGoogle(userId, providerResponse, NOW)
      ).rejects.toThrow()
    }
    expect(await ticketBalance()).toBeNull()
  })

  it('fails closed before network access without separate Play configuration', async () => {
    const storeFetch = vi.fn<MobileStoreFetch>()
    await expect(
      new MobileStoreVerificationRepository(
        env.AUTH_DB,
        baseEnv,
        storeFetch
      ).verifyGoogle(userId, providerResponse, NOW)
    ).rejects.toThrow('payments are disabled')
    expect(storeFetch).not.toHaveBeenCalled()

    await expect(
      new MobileStoreVerificationRepository(
        env.AUTH_DB,
        configuredEnv(),
        storeFetch
      ).verifyGoogle(
        userId,
        { ...providerResponse, packageNameAndroid: 'com.attacker.game' },
        NOW
      )
    ).rejects.toThrow('package does not match')
    expect(storeFetch).not.toHaveBeenCalled()
  })

  it('exposes the source RPC only to an authenticated Google identity', async () => {
    const mobileStoreFetch: MobileStoreFetch = async request =>
      new URL(request.url).pathname === '/token'
        ? Response.json({ access_token: 'token', token_type: 'Bearer' })
        : Response.json(productPurchase())
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
          'https://opensky.example/api/rpc/SkyWeaverAPI/VerifyGooglePlayPayment',
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

    expect((await rpc(false)).status).toBe(401)
    const authenticated = await rpc(true)
    expect(authenticated.status).toBe(200)
    expect(await authenticated.json()).toEqual({ status: true })
    expect(await ticketBalance()).toBe(14)
  })
})
