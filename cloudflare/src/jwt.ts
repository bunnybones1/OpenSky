import type { AppDevKey } from '@opensky/proto'

import {
  base64UrlDecode,
  base64UrlDecodeText,
  base64UrlEncode,
  utf8
} from './encoding'
import { unauthenticated } from './errors'

export interface SessionClaims {
  account: string
  app: string
  iat: number
  exp: number
  ogn?: string
}

const algorithm = { name: 'HMAC', hash: 'SHA-256' }

const importKey = (secret: string, usages: KeyUsage[]) =>
  crypto.subtle.importKey('raw', utf8(secret), algorithm, false, usages)

export const signSession = async (
  claims: SessionClaims,
  secret: string
): Promise<string> => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(JSON.stringify(claims))
  const unsigned = `${header}.${payload}`
  const key = await importKey(secret, ['sign'])
  const signature = await crypto.subtle.sign(algorithm, key, utf8(unsigned))

  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`
}

export const APP_DEV_SESSION_SECONDS = 365 * 24 * 60 * 60

export const signAppDevSession = async (
  appDevKey: AppDevKey,
  secret: string,
  now = Math.floor(Date.now() / 1_000)
): Promise<string> => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  // Preserve the source wire claim, including the full AppDevKey object and a
  // one-year expiry from token issuance. The source iat is key creation time.
  const claims = {
    app: appDevKey,
    iat: Math.floor(new Date(appDevKey.createdAt).getTime() / 1_000),
    exp: now + APP_DEV_SESSION_SECONDS
  }
  const payload = base64UrlEncode(JSON.stringify(claims))
  const unsigned = `${header}.${payload}`
  const key = await importKey(secret, ['sign'])
  const signature = await crypto.subtle.sign(algorithm, key, utf8(unsigned))
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`
}

export const verifySession = async (
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000)
): Promise<SessionClaims> => {
  const parts = token.split('.')
  if (parts.length !== 3) throw unauthenticated()

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  let header: { alg?: string }
  let claims: SessionClaims

  try {
    if (
      base64UrlEncode(base64UrlDecode(encodedHeader)) !== encodedHeader ||
      base64UrlEncode(base64UrlDecode(encodedPayload)) !== encodedPayload ||
      base64UrlEncode(base64UrlDecode(encodedSignature)) !== encodedSignature
    ) {
      throw unauthenticated()
    }
    header = JSON.parse(base64UrlDecodeText(encodedHeader))
    claims = JSON.parse(base64UrlDecodeText(encodedPayload))
  } catch {
    throw unauthenticated()
  }

  if (header.alg !== 'HS256') throw unauthenticated()

  const key = await importKey(secret, ['verify'])
  const valid = await crypto.subtle.verify(
    algorithm,
    key,
    base64UrlDecode(encodedSignature).buffer as ArrayBuffer,
    utf8(`${encodedHeader}.${encodedPayload}`)
  )

  if (!valid) throw unauthenticated()
  if (!claims.account || !claims.app || !Number.isFinite(claims.exp)) {
    throw unauthenticated()
  }
  if (claims.exp < now - 300 || claims.iat > now + 300) throw unauthenticated()

  return claims
}

export const bearerToken = (request: Request): string => {
  const authorization = request.headers.get('Authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) throw unauthenticated()
  return match[1]
}
