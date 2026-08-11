import { base64UrlEncode } from './encoding'
import type { GoogleIdentityProfile } from './identities'

export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export interface GoogleCodeExchange {
  code: string
  clientId: string
  clientSecret: string
  codeVerifier: string
  redirectUri: string
}

export interface GoogleAuthServices {
  exchangeCode(input: GoogleCodeExchange): Promise<GoogleIdentityProfile>
}

interface TokenResponse {
  access_token?: string
  error?: string
}

interface UserInfoResponse {
  sub?: string
  name?: string
  email?: string
  email_verified?: boolean
  picture?: string
}

export const randomToken = (byteLength = 32): string => {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export const pkceChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}

const exchangeCode = async (input: GoogleCodeExchange): Promise<GoogleIdentityProfile> => {
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code'
    })
  })
  const token = (await tokenResponse.json()) as TokenResponse
  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(`Google token exchange failed (${token.error || tokenResponse.status})`)
  }

  const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  })
  const userInfo = (await userInfoResponse.json()) as UserInfoResponse
  if (
    !userInfoResponse.ok ||
    !userInfo.sub ||
    !userInfo.email ||
    userInfo.email_verified !== true
  ) {
    throw new Error('Google user profile is missing a verified identity')
  }

  return {
    subject: userInfo.sub,
    displayName: userInfo.name || userInfo.email.split('@')[0],
    email: userInfo.email,
    emailVerified: true,
    ...(userInfo.picture ? { avatarUrl: userInfo.picture } : {})
  }
}

export const defaultGoogleAuthServices: GoogleAuthServices = { exchangeCode }
