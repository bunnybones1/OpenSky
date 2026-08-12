import {
  PaymentProvider,
  type GooglePlayPaymentResponse,
  type SamsungGalaxyStorePaymentResponse
} from '@opensky/proto'

import type { Env } from './env'
import { invalidArgument, unavailable } from './errors'
import { MobileStoreFulfillmentRepository } from './mobile-store-fulfillment'

const SAMSUNG_RECEIPT_URL = 'https://iap.samsungapps.com/iap/v6/receipt'
const GOOGLE_OAUTH_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_PUBLISHER_ORIGIN = 'https://androidpublisher.googleapis.com'
const GOOGLE_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher'
const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024
const MAX_FIELD_LENGTH = 256

export type MobileStoreFetch = (request: Request) => Promise<Response>

interface SamsungReceipt {
  itemId?: unknown
  paymentId?: unknown
  orderId?: unknown
  packageName?: unknown
  paymentAmount?: unknown
  status?: unknown
  mode?: unknown
  currencyCode?: unknown
}

interface GoogleServiceAccount {
  client_email?: unknown
  private_key?: unknown
}

interface GoogleOAuthResponse {
  access_token?: unknown
  token_type?: unknown
  expires_in?: unknown
}

interface GoogleProductPurchase {
  orderId?: unknown
  purchaseState?: unknown
  productId?: unknown
  purchaseToken?: unknown
  purchaseTimeMillis?: unknown
  quantity?: unknown
  regionCode?: unknown
  obfuscatedExternalAccountId?: unknown
  obfuscatedExternalProfileId?: unknown
}

const configured = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0

const requiredField = (
  value: unknown,
  name: string,
  maxLength = MAX_FIELD_LENGTH
): string => {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > maxLength
  ) {
    throw invalidArgument(`${name} is invalid`)
  }
  return value
}

const sha256 = async (value: string): Promise<string> => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  )
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const base64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

const encodedJson = (value: object): string =>
  base64Url(new TextEncoder().encode(JSON.stringify(value)))

const privateKeyBytes = (pem: string): ArrayBuffer => {
  const encoded = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\s/g, '')
  if (!encoded) throw unavailable('Google Play payments are disabled')
  try {
    const binary = atob(encoded)
    return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer
  } catch {
    throw unavailable('Google Play payments are disabled')
  }
}

const responseJson = async (
  response: Response,
  responseName: string
): Promise<unknown> => {
  const declaredLength = Number(response.headers.get('Content-Length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PROVIDER_RESPONSE_BYTES
  ) {
    throw invalidArgument(`${responseName} is invalid`)
  }
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw invalidArgument(`${responseName} is invalid`)
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw invalidArgument(`${responseName} is invalid`)
  }
}

export class MobileStoreVerificationRepository {
  private readonly fulfillment: MobileStoreFulfillmentRepository

  constructor(
    database: D1Database,
    private readonly env: Env,
    private readonly storeFetch: MobileStoreFetch = request => fetch(request)
  ) {
    this.fulfillment = new MobileStoreFulfillmentRepository(database)
  }

  private googleServiceAccount(): {
    clientEmail: string
    privateKey: string
  } {
    const raw = this.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
    if (!configured(raw)) {
      throw unavailable('Google Play payments are disabled')
    }
    let account: GoogleServiceAccount
    try {
      account = JSON.parse(raw) as GoogleServiceAccount
    } catch {
      throw unavailable('Google Play payments are disabled')
    }
    const clientEmail = account.client_email
    const privateKey = account.private_key
    if (
      typeof clientEmail !== 'string' ||
      !/^[^\s@]+@[^\s@]+$/.test(clientEmail) ||
      typeof privateKey !== 'string' ||
      !privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
      !privateKey.includes('-----END PRIVATE KEY-----')
    ) {
      throw unavailable('Google Play payments are disabled')
    }
    return { clientEmail, privateKey }
  }

  private async googleAccessToken(now: Date): Promise<string> {
    const account = this.googleServiceAccount()
    const issuedAt = Math.floor(now.getTime() / 1_000)
    const unsigned = `${encodedJson({ alg: 'RS256', typ: 'JWT' })}.${encodedJson(
      {
        iss: account.clientEmail,
        scope: GOOGLE_PUBLISHER_SCOPE,
        aud: GOOGLE_OAUTH_URL,
        iat: issuedAt,
        exp: issuedAt + 3_600
      }
    )}`
    let assertion: string
    try {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBytes(account.privateKey),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(unsigned)
      )
      assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`
    } catch {
      throw unavailable('Google Play payments are disabled')
    }

    let response: Response
    try {
      response = await this.storeFetch(
        new Request(GOOGLE_OAUTH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion
          }).toString()
        })
      )
    } catch {
      throw unavailable('Google Play authentication is unavailable')
    }
    if (!response.ok || response.redirected) {
      throw unavailable('Google Play authentication is unavailable')
    }
    const token = (await responseJson(
      response,
      'Google Play authentication response'
    )) as GoogleOAuthResponse
    if (
      !token ||
      typeof token !== 'object' ||
      typeof token.access_token !== 'string' ||
      token.access_token.length < 1 ||
      token.access_token.length > 4_096 ||
      (token.token_type !== undefined && token.token_type !== 'Bearer')
    ) {
      throw unavailable('Google Play authentication is unavailable')
    }
    return token.access_token
  }

  async verifyGoogle(
    userId: string,
    providerResponse: GooglePlayPaymentResponse,
    now = new Date()
  ): Promise<void> {
    const packageName = this.env.GOOGLE_PLAY_PACKAGE_NAME?.trim()
    if (!configured(packageName)) {
      throw unavailable('Google Play payments are disabled')
    }
    if (!providerResponse || typeof providerResponse !== 'object') {
      throw invalidArgument('providerResponse is required')
    }
    const requestPackage = requiredField(
      providerResponse.packageNameAndroid,
      'packageNameAndroid'
    )
    if (requestPackage !== packageName) {
      throw invalidArgument('Google Play purchase package does not match')
    }
    const productId = requiredField(
      providerResponse.productId,
      'productId',
      128
    )
    const transactionId = requiredField(
      providerResponse.transactionId,
      'transactionId'
    )
    const purchaseToken = requiredField(
      providerResponse.purchaseToken,
      'purchaseToken',
      4_096
    )
    const accessToken = await this.googleAccessToken(now)
    let response: Response
    try {
      response = await this.storeFetch(
        new Request(
          `${GOOGLE_PUBLISHER_ORIGIN}/androidpublisher/v3/applications/${encodeURIComponent(
            packageName
          )}/purchases/products/${encodeURIComponent(
            productId
          )}/tokens/${encodeURIComponent(purchaseToken)}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${accessToken}`
            }
          }
        )
      )
    } catch {
      throw unavailable('Google Play purchase verification is unavailable')
    }
    if (response.status === 400 || response.status === 404) {
      throw invalidArgument('Google Play purchase is invalid')
    }
    if (!response.ok || response.redirected) {
      throw unavailable('Google Play purchase verification is unavailable')
    }
    const purchase = (await responseJson(
      response,
      'Google Play verification response'
    )) as GoogleProductPurchase
    if (!purchase || typeof purchase !== 'object') {
      throw invalidArgument('Google Play verification response is invalid')
    }
    if (purchase.orderId !== transactionId) {
      throw invalidArgument('Google Play order ID does not match')
    }
    if (purchase.purchaseState !== 0) {
      throw invalidArgument('Google Play purchase is not purchased')
    }
    if (purchase.productId !== undefined && purchase.productId !== productId) {
      throw invalidArgument('Google Play product ID does not match')
    }
    if (
      purchase.purchaseToken !== undefined &&
      purchase.purchaseToken !== purchaseToken
    ) {
      throw invalidArgument('Google Play purchase token does not match')
    }
    const verificationSha256 = await sha256(
      JSON.stringify({
        provider: PaymentProvider.GOOGLE_PLAY,
        packageName,
        productId,
        orderId: purchase.orderId,
        purchaseState: purchase.purchaseState,
        purchaseTimeMillis: purchase.purchaseTimeMillis ?? null,
        quantity: purchase.quantity ?? null,
        regionCode: purchase.regionCode ?? null,
        obfuscatedExternalAccountId:
          purchase.obfuscatedExternalAccountId ?? null,
        obfuscatedExternalProfileId:
          purchase.obfuscatedExternalProfileId ?? null
      })
    )
    await this.fulfillment.fulfill(
      userId,
      {
        provider: PaymentProvider.GOOGLE_PLAY,
        externalTransactionId: transactionId,
        productCode: productId,
        verificationSha256
      },
      now
    )
  }

  async verifySamsung(
    userId: string,
    providerResponse: SamsungGalaxyStorePaymentResponse,
    now = new Date()
  ): Promise<void> {
    const packageName = this.env.SAMSUNG_IAP_PACKAGE_NAME?.trim()
    if (!configured(packageName)) {
      throw unavailable('Samsung Galaxy Store payments are disabled')
    }
    if (!providerResponse || typeof providerResponse !== 'object') {
      throw invalidArgument('providerResponse is required')
    }
    const purchaseId = requiredField(providerResponse.purchaseId, 'purchaseId')
    const paymentId = requiredField(providerResponse.paymentId, 'paymentId')
    const itemId = requiredField(providerResponse.itemId, 'itemId', 128)

    let response: Response
    try {
      const url = new URL(SAMSUNG_RECEIPT_URL)
      url.searchParams.set('purchaseID', purchaseId)
      response = await this.storeFetch(
        new Request(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' }
        })
      )
    } catch {
      throw unavailable('Samsung purchase verification is unavailable')
    }
    if (!response.ok || response.redirected) {
      throw unavailable('Samsung purchase verification is unavailable')
    }
    const receipt = (await responseJson(
      response,
      'Samsung verification response'
    )) as SamsungReceipt
    if (!receipt || typeof receipt !== 'object') {
      throw invalidArgument('Samsung verification response is invalid')
    }
    if (receipt.status !== 'success') {
      throw invalidArgument('Samsung purchase is not successful')
    }
    // Samsung's developer test mode can return a synthetic success. It must
    // never become production inventory authority.
    if (receipt.mode !== 'PRODUCTION') {
      throw invalidArgument('Samsung purchase is not from production')
    }
    if (receipt.packageName !== packageName) {
      throw invalidArgument('Samsung purchase package does not match')
    }
    if (receipt.paymentId !== paymentId) {
      throw invalidArgument('Samsung payment ID does not match')
    }
    if (receipt.itemId !== itemId) {
      throw invalidArgument('Samsung item ID does not match')
    }
    const orderId = requiredField(receipt.orderId, 'Samsung order ID')
    const currency = requiredField(
      receipt.currencyCode,
      'Samsung currency',
      3
    ).toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw invalidArgument('Samsung currency is invalid')
    }
    const totalPrice = Number(receipt.paymentAmount)
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      throw invalidArgument('Samsung payment amount is invalid')
    }
    const verificationSha256 = await sha256(
      JSON.stringify({
        provider: PaymentProvider.SAMSUNG_GALAXY_STORE,
        itemId,
        paymentId,
        orderId,
        packageName,
        currency,
        totalPrice,
        status: receipt.status,
        mode: receipt.mode
      })
    )

    await this.fulfillment.fulfill(
      userId,
      {
        provider: PaymentProvider.SAMSUNG_GALAXY_STORE,
        externalTransactionId: paymentId,
        productCode: itemId,
        verificationSha256,
        currency,
        totalPrice
      },
      now
    )
  }
}
