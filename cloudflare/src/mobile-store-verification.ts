import {
  PaymentProvider,
  type SamsungGalaxyStorePaymentResponse
} from '@opensky/proto'

import type { Env } from './env'
import { invalidArgument, unavailable } from './errors'
import { MobileStoreFulfillmentRepository } from './mobile-store-fulfillment'

const SAMSUNG_RECEIPT_URL = 'https://iap.samsungapps.com/iap/v6/receipt'
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

const responseJson = async (response: Response): Promise<unknown> => {
  const declaredLength = Number(response.headers.get('Content-Length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PROVIDER_RESPONSE_BYTES
  ) {
    throw invalidArgument('Samsung verification response is invalid')
  }
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw invalidArgument('Samsung verification response is invalid')
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw invalidArgument('Samsung verification response is invalid')
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
    const receipt = (await responseJson(response)) as SamsungReceipt
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
