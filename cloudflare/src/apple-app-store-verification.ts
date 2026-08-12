import 'reflect-metadata'

import type { AppleAppStorePaymentResponse } from '@opensky/proto'
import {
  BasicConstraintsExtension,
  Extension,
  KeyUsageFlags,
  KeyUsagesExtension,
  X509Certificate
} from '@peculiar/x509'

import { APPLE_ROOT_CERTIFICATES } from './apple-root-certificates'
import type { Env } from './env'
import { invalidArgument, unavailable } from './errors'

const APPLE_API_ORIGIN = 'https://api.storekit.apple.com'
const APPLE_TRANSACTION_SIGNER_OID = '1.2.840.113635.100.6.11.1'
const APPLE_INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1'
const MAX_JWS_BYTES = 64 * 1024
const MAX_CLOCK_SKEW_MS = 60_000

interface AppleConfig {
  bundleId: string
  issuerId: string
  keyId: string
  privateKey: string
}

interface AppleJwsHeader {
  alg?: unknown
  x5c?: unknown
}

export interface AppleTransaction {
  transactionId?: unknown
  originalTransactionId?: unknown
  bundleId?: unknown
  productId?: unknown
  purchaseDate?: unknown
  originalPurchaseDate?: unknown
  quantity?: unknown
  type?: unknown
  inAppOwnershipType?: unknown
  signedDate?: unknown
  revocationDate?: unknown
  revocationReason?: unknown
  environment?: unknown
  currency?: unknown
  price?: unknown
  appAccountToken?: unknown
}

export type AppleStoreFetch = (request: Request) => Promise<Response>
export type AppleTrustAnchors = readonly {
  sha256: string
  derBase64: string
}[]

const base64Bytes = (value: string): Uint8Array<ArrayBuffer> => {
  if (!value || value.length > MAX_JWS_BYTES) throw new Error('invalid base64')
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const base64UrlBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  return base64Bytes(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  )
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

const parseJsonPart = <T>(part: string): T => {
  const bytes = base64UrlBytes(part)
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

const pkcs8Bytes = (pem: string): ArrayBuffer => {
  const encoded = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\s/g, '')
  return base64Bytes(encoded).buffer
}

const sha256Hex = async (value: ArrayBuffer): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', value))]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')

const configuredString = (
  value: string | undefined,
  pattern: RegExp
): string | null => {
  const trimmed = value?.trim()
  return trimmed && pattern.test(trimmed) ? trimmed : null
}

export const appleConfiguration = (env: Env): AppleConfig => {
  const bundleId = configuredString(
    env.APPLE_APP_STORE_BUNDLE_ID,
    /^[A-Za-z0-9][A-Za-z0-9.-]{2,254}$/
  )
  const issuerId = configuredString(
    env.APPLE_APP_STORE_ISSUER_ID,
    /^[0-9a-fA-F-]{32,64}$/
  )
  const keyId = configuredString(env.APPLE_APP_STORE_KEY_ID, /^[A-Z0-9]{8,32}$/)
  const privateKey = env.APPLE_APP_STORE_PRIVATE_KEY?.trim()
  if (
    !bundleId ||
    !issuerId ||
    !keyId ||
    !privateKey?.includes('-----BEGIN PRIVATE KEY-----') ||
    !privateKey.includes('-----END PRIVATE KEY-----')
  ) {
    throw unavailable('Apple App Store payments are disabled')
  }
  return { bundleId, issuerId, keyId, privateKey }
}

export const createAppleApiToken = async (
  config: AppleConfig,
  now: Date
): Promise<string> => {
  const issuedAt = Math.floor(now.getTime() / 1_000)
  const unsigned = `${encodedJson({
    alg: 'ES256',
    kid: config.keyId,
    typ: 'JWT'
  })}.${encodedJson({
    iss: config.issuerId,
    iat: issuedAt,
    exp: issuedAt + 300,
    aud: 'appstoreconnect-v1',
    bid: config.bundleId
  })}`
  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Bytes(config.privateKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsigned)
    )
    return `${unsigned}.${base64Url(new Uint8Array(signature))}`
  } catch {
    throw unavailable('Apple App Store payments are disabled')
  }
}

const certificateDateValid = (certificate: X509Certificate, now: Date) =>
  certificate.notBefore.getTime() <= now.getTime() + MAX_CLOCK_SKEW_MS &&
  certificate.notAfter.getTime() >= now.getTime() - MAX_CLOCK_SKEW_MS

const hasOid = (certificate: X509Certificate, oid: string): boolean =>
  certificate.getExtension(oid) instanceof Extension

const certificateAuthority = (certificate: X509Certificate): boolean => {
  const constraints = certificate.getExtension(BasicConstraintsExtension)
  const usages = certificate.getExtension(KeyUsagesExtension)
  return (
    constraints?.ca === true &&
    (usages === null || (usages.usages & KeyUsageFlags.keyCertSign) !== 0)
  )
}

const transactionSigner = (certificate: X509Certificate): boolean => {
  const constraints = certificate.getExtension(BasicConstraintsExtension)
  const usages = certificate.getExtension(KeyUsagesExtension)
  return (
    constraints?.ca !== true &&
    usages !== null &&
    (usages.usages & KeyUsageFlags.digitalSignature) !== 0
  )
}

const trustedRoots = async (
  trustAnchors: AppleTrustAnchors
): Promise<X509Certificate[]> => {
  const roots: X509Certificate[] = []
  for (const pinned of trustAnchors) {
    const bytes = base64Bytes(pinned.derBase64)
    if ((await sha256Hex(bytes.buffer)) !== pinned.sha256) {
      throw unavailable('Apple trust anchors are invalid')
    }
    roots.push(new X509Certificate(bytes))
  }
  return roots
}

const verifyCertificateChain = async (
  chain: string[],
  now: Date,
  trustAnchors: AppleTrustAnchors
): Promise<X509Certificate> => {
  if (chain.length !== 3) throw new Error('invalid chain length')
  const leaf = new X509Certificate(base64Bytes(chain[0]))
  const intermediate = new X509Certificate(base64Bytes(chain[1]))
  const headerRoot = new X509Certificate(base64Bytes(chain[2]))
  const roots = await trustedRoots(trustAnchors)
  const root = roots.find(
    trusted =>
      trusted.subject === headerRoot.subject &&
      trusted.toString('base64') === headerRoot.toString('base64')
  )
  if (!root) throw new Error('untrusted root')
  if (
    !certificateDateValid(leaf, now) ||
    !certificateDateValid(intermediate, now) ||
    !certificateDateValid(root, now) ||
    leaf.issuer !== intermediate.subject ||
    intermediate.issuer !== root.subject ||
    !certificateAuthority(intermediate) ||
    !certificateAuthority(root) ||
    !transactionSigner(leaf) ||
    !hasOid(leaf, APPLE_TRANSACTION_SIGNER_OID) ||
    !hasOid(intermediate, APPLE_INTERMEDIATE_OID) ||
    !(await leaf.verify({ publicKey: intermediate.publicKey })) ||
    !(await intermediate.verify({ publicKey: root.publicKey })) ||
    !(await root.isSelfSigned())
  ) {
    throw new Error('invalid certificate chain')
  }
  return leaf
}

export const verifyAppleSignedTransaction = async (
  signedTransaction: string,
  bundleId: string,
  now: Date,
  trustAnchors: AppleTrustAnchors = APPLE_ROOT_CERTIFICATES
): Promise<AppleTransaction> => {
  if (
    typeof signedTransaction !== 'string' ||
    signedTransaction.length < 1 ||
    signedTransaction.length > MAX_JWS_BYTES
  ) {
    throw invalidArgument('Apple signed transaction is invalid')
  }
  try {
    const parts = signedTransaction.split('.')
    if (parts.length !== 3 || parts.some(part => !part)) throw new Error()
    const header = parseJsonPart<AppleJwsHeader>(parts[0])
    if (
      header.alg !== 'ES256' ||
      !Array.isArray(header.x5c) ||
      !header.x5c.every(value => typeof value === 'string')
    ) {
      throw new Error()
    }
    const payload = parseJsonPart<AppleTransaction>(parts[1])
    const signedDate = Number(payload.signedDate)
    if (
      !Number.isFinite(signedDate) ||
      signedDate > now.getTime() + MAX_CLOCK_SKEW_MS
    ) {
      throw new Error()
    }
    const leaf = await verifyCertificateChain(
      header.x5c as string[],
      now,
      trustAnchors
    )
    const publicKey = await leaf.publicKey.export(
      { name: 'ECDSA', namedCurve: 'P-256' },
      ['verify']
    )
    if (
      !(await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        base64UrlBytes(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      )) ||
      payload.bundleId !== bundleId ||
      payload.environment !== 'Production'
    ) {
      throw new Error()
    }
    return payload
  } catch {
    throw invalidArgument('Apple signed transaction is invalid')
  }
}

export const fetchAppleTransaction = async (
  env: Env,
  providerResponse: AppleAppStorePaymentResponse,
  storeFetch: AppleStoreFetch,
  now: Date,
  trustAnchors: AppleTrustAnchors = APPLE_ROOT_CERTIFICATES
): Promise<AppleTransaction> => {
  const config = appleConfiguration(env)
  if (!providerResponse || typeof providerResponse !== 'object') {
    throw invalidArgument('providerResponse is required')
  }
  const transactionId = providerResponse.transactionId
  if (
    typeof transactionId !== 'string' ||
    !/^[A-Za-z0-9.-]{1,256}$/.test(transactionId)
  ) {
    throw invalidArgument('transactionId is invalid')
  }
  const token = await createAppleApiToken(config, now)
  let response: Response
  try {
    response = await storeFetch(
      new Request(
        `${APPLE_API_ORIGIN}/inApps/v1/transactions/${encodeURIComponent(
          transactionId
        )}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      )
    )
  } catch {
    throw unavailable('Apple purchase verification is unavailable')
  }
  if (response.status === 400 || response.status === 404) {
    throw invalidArgument('Apple purchase is invalid')
  }
  if (!response.ok || response.redirected) {
    throw unavailable('Apple purchase verification is unavailable')
  }
  const declaredLength = Number(response.headers.get('Content-Length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JWS_BYTES) {
    throw invalidArgument('Apple verification response is invalid')
  }
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_JWS_BYTES) {
    throw invalidArgument('Apple verification response is invalid')
  }
  let body: { signedTransactionInfo?: unknown }
  try {
    body = JSON.parse(new TextDecoder().decode(bytes)) as typeof body
  } catch {
    throw invalidArgument('Apple verification response is invalid')
  }
  if (typeof body.signedTransactionInfo !== 'string') {
    throw invalidArgument('Apple verification response is invalid')
  }
  return verifyAppleSignedTransaction(
    body.signedTransactionInfo,
    config.bundleId,
    now,
    trustAnchors
  )
}
