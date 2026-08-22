import { env } from 'cloudflare:workers'
import {
  BasicConstraintsExtension,
  Extension,
  KeyUsageFlags,
  KeyUsagesExtension,
  X509Certificate,
  X509CertificateGenerator
} from '@peculiar/x509'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { handleApiRequest, type AuthServices } from '../src/api'
import type { AppleTrustAnchors } from '../src/apple-app-store-verification'
import { APPLE_ROOT_CERTIFICATES } from '../src/apple-root-certificates'
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
const userId = 'apple-payment-user'
const NOW = new Date('2026-08-12T12:00:00.000Z')
const BUNDLE_ID = 'com.cloudweasel.game'
const PRODUCT_ID = 'conquest_tickets_0005'
const TRANSACTION_ID = 'apple-transaction-20260812'
const APPLE_TRANSACTION_SIGNER_OID = '1.2.840.113635.100.6.11.1'
const APPLE_INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1'

let apiPrivateKey: CryptoKey
let apiPublicKey: CryptoKey
let leafPrivateKey: CryptoKey
let x5c: string[]
let trustAnchors: AppleTrustAnchors

const base64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const base64Url = (bytes: Uint8Array): string =>
  base64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')

const base64UrlBytes = (value: string): ArrayBuffer => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  )
  return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer
}

const sha256Hex = async (value: ArrayBuffer): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', value))]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')

const pem = (bytes: Uint8Array, label: string): string =>
  `-----BEGIN ${label}-----\n${base64(bytes)
    .match(/.{1,64}/g)
    ?.join('\n')}\n-----END ${label}-----\n`

const configuredEnv = async (): Promise<Env> =>
  ({
    ...baseEnv,
    APPLE_APP_STORE_BUNDLE_ID: BUNDLE_ID,
    APPLE_APP_STORE_ISSUER_ID: '57246542-96fe-1a63-e053-0824d011072a',
    APPLE_APP_STORE_KEY_ID: 'APPLEKEY01',
    APPLE_APP_STORE_PRIVATE_KEY: pem(
      new Uint8Array(await crypto.subtle.exportKey('pkcs8', apiPrivateKey)),
      'PRIVATE KEY'
    )
  }) as Env

const providerResponse = {
  productId: PRODUCT_ID,
  transactionId: TRANSACTION_ID,
  transactionDate: NOW.getTime(),
  transactionReceipt: 'legacy-receipt-is-not-authority',
  currency: 'CAD',
  totalPrice: 6.49
}

const signedTransaction = async (
  overrides: Record<string, unknown> = {},
  signingKey = leafPrivateKey,
  chain = x5c
): Promise<string> => {
  const header = base64Url(
    new TextEncoder().encode(JSON.stringify({ alg: 'ES256', x5c: chain }))
  )
  const payload = base64Url(
    new TextEncoder().encode(
      JSON.stringify({
        originalTransactionId: TRANSACTION_ID,
        transactionId: TRANSACTION_ID,
        bundleId: BUNDLE_ID,
        productId: PRODUCT_ID,
        purchaseDate: NOW.getTime() - 5_000,
        originalPurchaseDate: NOW.getTime() - 5_000,
        quantity: 1,
        type: 'Consumable',
        inAppOwnershipType: 'PURCHASED',
        signedDate: NOW.getTime(),
        environment: 'Production',
        currency: 'CAD',
        price: 6490,
        ...overrides
      })
    )
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(`${header}.${payload}`)
  )
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`
}

const makeStoreFetch = (
  overrides: Record<string, unknown> = {}
): MobileStoreFetch =>
  vi.fn(async request => {
    const url = new URL(request.url)
    expect(url.origin + url.pathname).toBe(
      `https://api.storekit.apple.com/inApps/v1/transactions/${TRANSACTION_ID}`
    )
    const authorization = request.headers.get('Authorization') ?? ''
    expect(authorization.startsWith('Bearer ')).toBe(true)
    const token = authorization.slice('Bearer '.length)
    const [header, payload, signature] = token.split('.')
    expect(
      JSON.parse(new TextDecoder().decode(base64UrlBytes(header)))
    ).toEqual({ alg: 'ES256', kid: 'APPLEKEY01', typ: 'JWT' })
    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlBytes(payload))
    ) as Record<string, unknown>
    expect(claims).toMatchObject({
      iss: '57246542-96fe-1a63-e053-0824d011072a',
      aud: 'appstoreconnect-v1',
      bid: BUNDLE_ID
    })
    expect(Number(claims.exp) - Number(claims.iat)).toBe(300)
    expect(
      await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        apiPublicKey,
        base64UrlBytes(signature),
        new TextEncoder().encode(`${header}.${payload}`)
      )
    ).toBe(true)
    return Response.json({
      signedTransactionInfo: await signedTransaction(overrides)
    })
  })

const ticketBalance = () =>
  env.AUTH_DB.prepare(
    `SELECT balance FROM player_items
     WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
  )
    .bind(userId)
    .first<number>('balance')

beforeAll(async () => {
  const validFrom = new Date(NOW.getTime() - 24 * 60 * 60 * 1_000)
  const validTo = new Date(NOW.getTime() + 365 * 24 * 60 * 60 * 1_000)
  const rootKeys = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  const intermediateKeys = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  const leafKeys = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  const apiKeys = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  apiPrivateKey = apiKeys.privateKey
  apiPublicKey = apiKeys.publicKey
  leafPrivateKey = leafKeys.privateKey

  const root = await X509CertificateGenerator.createSelfSigned({
    name: 'CN=Test Apple Root CA',
    serialNumber: '01',
    notBefore: validFrom,
    notAfter: validTo,
    signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
    keys: rootKeys,
    extensions: [
      new BasicConstraintsExtension(true, 1, true),
      new KeyUsagesExtension(
        KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign,
        true
      )
    ]
  })
  const intermediate = await X509CertificateGenerator.create({
    subject: 'CN=Test Apple Intermediate',
    issuer: root.subject,
    serialNumber: '02',
    notBefore: validFrom,
    notAfter: validTo,
    publicKey: intermediateKeys.publicKey,
    signingKey: rootKeys.privateKey,
    signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
    extensions: [
      new BasicConstraintsExtension(true, 0, true),
      new KeyUsagesExtension(
        KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign,
        true
      ),
      new Extension(APPLE_INTERMEDIATE_OID, false, new Uint8Array([5, 0]))
    ]
  })
  const leaf = await X509CertificateGenerator.create({
    subject: 'CN=Test Apple Transaction Signer',
    issuer: intermediate.subject,
    serialNumber: '03',
    notBefore: validFrom,
    notAfter: validTo,
    publicKey: leafKeys.publicKey,
    signingKey: intermediateKeys.privateKey,
    signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
    extensions: [
      new BasicConstraintsExtension(false, undefined, true),
      new KeyUsagesExtension(KeyUsageFlags.digitalSignature, true),
      new Extension(APPLE_TRANSACTION_SIGNER_OID, false, new Uint8Array([5, 0]))
    ]
  })
  x5c = [leaf, intermediate, root].map(certificate =>
    base64(new Uint8Array(certificate.rawData))
  )
  trustAnchors = [
    {
      sha256: await sha256Hex(root.rawData),
      derBase64: x5c[2]
    }
  ]
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
  const timestamp = NOW.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'AppleWeasel', 'apple@example.com', ?, ?)`
  )
    .bind(userId, timestamp, timestamp)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('Apple App Store Server API verification', () => {
  it('ships the official self-signed Apple roots under their SHA-256 pins', async () => {
    expect(APPLE_ROOT_CERTIFICATES).toHaveLength(3)
    for (const anchor of APPLE_ROOT_CERTIFICATES) {
      const der = base64UrlBytes(anchor.derBase64)
      expect(await sha256Hex(der)).toBe(anchor.sha256)
      const certificate = new X509Certificate(der)
      expect(certificate.subject).toContain('Apple')
      expect(await certificate.isSelfSigned()).toBe(true)
    }
  })

  it('verifies API JWT, certificate chain, JWS, and delivers off-chain once', async () => {
    const repository = new MobileStoreVerificationRepository(
      env.AUTH_DB,
      await configuredEnv(),
      makeStoreFetch(),
      trustAnchors
    )

    await repository.verifyApple(userId, providerResponse, NOW)
    await repository.verifyApple(userId, providerResponse, NOW)

    expect(await ticketBalance()).toBe(5)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT provider, product_code, currency, total_price,
                verification_sha256, status
         FROM mobile_store_payments WHERE external_transaction_id = ?`
      )
        .bind(TRANSACTION_ID)
        .first()
    ).toMatchObject({
      provider: 'APPLE_APP_STORE',
      product_code: PRODUCT_ID,
      currency: 'CAD',
      total_price: 6.49,
      verification_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      status: 'SUCCEEDED'
    })
  })

  it('rejects sandbox, revoked, mismatched, and untrusted transactions', async () => {
    for (const override of [
      { environment: 'Sandbox' },
      { revocationDate: NOW.getTime() },
      { bundleId: 'com.attacker.game' },
      { transactionId: 'different-transaction' },
      { productId: 'conquest_tickets_0024' },
      { quantity: 2 },
      { inAppOwnershipType: 'FAMILY_SHARED' },
      { price: 9999 },
      { signedDate: NOW.getTime() + 2 * 60_000 }
    ]) {
      const repository = new MobileStoreVerificationRepository(
        env.AUTH_DB,
        await configuredEnv(),
        makeStoreFetch(override),
        trustAnchors
      )
      await expect(
        repository.verifyApple(userId, providerResponse, NOW)
      ).rejects.toThrow()
    }
    const untrusted = new MobileStoreVerificationRepository(
      env.AUTH_DB,
      await configuredEnv(),
      makeStoreFetch(),
      []
    )
    await expect(
      untrusted.verifyApple(userId, providerResponse, NOW)
    ).rejects.toThrow('signed transaction is invalid')
    const wrongSignature = new MobileStoreVerificationRepository(
      env.AUTH_DB,
      await configuredEnv(),
      async () =>
        Response.json({
          signedTransactionInfo: await signedTransaction({}, apiPrivateKey)
        }),
      trustAnchors
    )
    await expect(
      wrongSignature.verifyApple(userId, providerResponse, NOW)
    ).rejects.toThrow('signed transaction is invalid')
    expect(await ticketBalance()).toBeNull()
  })

  it('fails closed before network access without App Store configuration', async () => {
    const storeFetch = vi.fn<MobileStoreFetch>()
    await expect(
      new MobileStoreVerificationRepository(
        env.AUTH_DB,
        baseEnv,
        storeFetch,
        trustAnchors
      ).verifyApple(userId, providerResponse, NOW)
    ).rejects.toThrow('payments are disabled')
    expect(storeFetch).not.toHaveBeenCalled()
    expect(await ticketBalance()).toBeNull()
  })

  it('exposes the source RPC only to the signed-in Google identity', async () => {
    const services: AuthServices = {
      verifyProof: async () => {
        throw new Error('not expected')
      },
      mobileStoreFetch: makeStoreFetch(),
      appleTrustAnchors: trustAnchors
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
          'https://opensky.example/api/rpc/SkyWeaverAPI/VerifyAppleAppStorePayment',
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ providerResponse })
          }
        ),
        await configuredEnv(),
        services
      )
    }

    expect((await rpc(false)).status).toBe(401)
    const authenticated = await rpc(true)
    expect(authenticated.status).toBe(200)
    expect(await authenticated.json()).toEqual({ status: true })
    expect(await ticketBalance()).toBe(5)
  })
})
