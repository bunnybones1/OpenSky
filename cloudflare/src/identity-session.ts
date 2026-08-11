import { base64UrlDecode, base64UrlDecodeText, base64UrlEncode, utf8 } from './encoding'

export const IDENTITY_SESSION_COOKIE = 'opensky_identity_session'
export const IDENTITY_SESSION_SECONDS = 60 * 60 * 24 * 7

interface IdentitySessionClaims {
  typ: 'opensky.identity'
  sub: string
  iat: number
  exp: number
}

const algorithm = { name: 'HMAC', hash: 'SHA-256' }

const importKey = (secret: string, usages: KeyUsage[]) =>
  crypto.subtle.importKey('raw', utf8(secret), algorithm, false, usages)

export const createIdentitySession = async (
  userId: string,
  secret: string,
  now = Math.floor(Date.now() / 1000)
): Promise<string> => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const claims: IdentitySessionClaims = {
    typ: 'opensky.identity',
    sub: userId,
    iat: now,
    exp: now + IDENTITY_SESSION_SECONDS
  }
  const payload = base64UrlEncode(JSON.stringify(claims))
  const unsigned = `${header}.${payload}`
  const key = await importKey(secret, ['sign'])
  const signature = await crypto.subtle.sign(algorithm, key, utf8(unsigned))
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`
}

export const verifyIdentitySession = async (
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000)
): Promise<string | undefined> => {
  const parts = token.split('.')
  if (parts.length !== 3) return

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  let header: { alg?: string }
  let claims: IdentitySessionClaims
  try {
    header = JSON.parse(base64UrlDecodeText(encodedHeader))
    claims = JSON.parse(base64UrlDecodeText(encodedPayload))
  } catch {
    return
  }
  if (header.alg !== 'HS256' || claims.typ !== 'opensky.identity' || !claims.sub) return
  if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp)) return
  if (claims.exp < now - 300 || claims.iat > now + 300) return

  const key = await importKey(secret, ['verify'])
  const valid = await crypto.subtle.verify(
    algorithm,
    key,
    base64UrlDecode(encodedSignature).buffer as ArrayBuffer,
    utf8(`${encodedHeader}.${encodedPayload}`)
  )
  return valid ? claims.sub : undefined
}
