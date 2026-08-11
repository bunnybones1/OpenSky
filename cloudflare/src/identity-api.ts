import { deriveGamePrincipal } from '@opensky/shared/game-principal'

import { base64UrlDecodeText, base64UrlEncode } from './encoding'
import { clearCookie, readCookies, serializeCookie } from './cookies'
import type { Env } from './env'
import {
  defaultGoogleAuthServices,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  type GoogleAuthServices,
  pkceChallenge,
  randomToken
} from './google-auth'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE,
  IDENTITY_SESSION_SECONDS,
  verifyIdentitySession
} from './identity-session'
import { IdentitiesRepository } from './identities'

const OAUTH_STATE_COOKIE = 'opensky_google_state'
const OAUTH_VERIFIER_COOKIE = 'opensky_google_verifier'
const OAUTH_RETURN_COOKIE = 'opensky_google_return'
const OAUTH_COOKIE_PATH = '/api/auth/google/callback'
const OAUTH_COOKIE_SECONDS = 10 * 60

const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) => {
  const headers = new Headers(extraHeaders)
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(body), { status, headers })
}

const isGoogleConfigured = (env: Env) =>
  Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim())

const safeReturnTo = (candidate: string | null, origin: string): string => {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/'
  try {
    const url = new URL(candidate, origin)
    if (url.origin !== origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`.slice(0, 1024)
  } catch {
    return '/'
  }
}

const secureRequest = (request: Request) => new URL(request.url).protocol === 'https:'

const oauthCookie = (request: Request, name: string, value: string) =>
  serializeCookie(name, value, {
    maxAge: OAUTH_COOKIE_SECONDS,
    path: OAUTH_COOKIE_PATH,
    secure: secureRequest(request)
  })

const clearOAuthCookies = (request: Request, headers: Headers) => {
  for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_RETURN_COOKIE]) {
    headers.append(
      'Set-Cookie',
      clearCookie(name, { path: OAUTH_COOKIE_PATH, secure: secureRequest(request) })
    )
  }
}

const callbackRedirect = (
  request: Request,
  returnTo: string,
  result: 'success' | 'cancelled' | 'failed'
) => {
  const url = new URL(returnTo, new URL(request.url).origin)
  if (result === 'success') url.searchParams.set('auth', 'success')
  else url.searchParams.set('auth_error', result)
  const headers = new Headers({ Location: url.toString(), 'Cache-Control': 'no-store' })
  clearOAuthCookies(request, headers)
  return { headers, response: () => new Response(null, { status: 302, headers }) }
}

const sessionResponse = async (request: Request, env: Env): Promise<Response> => {
  const configured = isGoogleConfigured(env)
  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  if (!token) {
    return json({ authenticated: false, providers: { google: configured } })
  }

  const userId = await verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
  if (!userId) {
    const headers = new Headers()
    headers.append(
      'Set-Cookie',
      clearCookie(IDENTITY_SESSION_COOKIE, { secure: secureRequest(request) })
    )
    return json({ authenticated: false, providers: { google: configured } }, 200, headers)
  }

  const identities = new IdentitiesRepository(env.AUTH_DB)
  const user = await identities.findUserById(userId)
  if (!user) return json({ authenticated: false, providers: { google: configured } })

  return json({
    authenticated: true,
    user,
    gamePrincipal: await deriveGamePrincipal(user.id),
    wallets: await identities.listWallets(user.id),
    providers: { google: configured }
  })
}

const beginGoogleLogin = async (request: Request, env: Env): Promise<Response> => {
  if (!isGoogleConfigured(env)) {
    return json(
      {
        code: 'auth.provider_not_configured',
        message: 'Google sign-in is not configured yet.'
      },
      503
    )
  }

  const requestUrl = new URL(request.url)
  const redirectUri = new URL(OAUTH_COOKIE_PATH, requestUrl.origin).toString()
  const state = randomToken()
  const verifier = randomToken(48)
  const returnTo = safeReturnTo(requestUrl.searchParams.get('returnTo'), requestUrl.origin)
  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  authorizationUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account'
  }).toString()

  const headers = new Headers({ Location: authorizationUrl.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', oauthCookie(request, OAUTH_STATE_COOKIE, state))
  headers.append('Set-Cookie', oauthCookie(request, OAUTH_VERIFIER_COOKIE, verifier))
  headers.append(
    'Set-Cookie',
    oauthCookie(request, OAUTH_RETURN_COOKIE, base64UrlEncode(returnTo))
  )
  return new Response(null, { status: 302, headers })
}

const finishGoogleLogin = async (
  request: Request,
  env: Env,
  services: GoogleAuthServices
): Promise<Response> => {
  const requestUrl = new URL(request.url)
  const cookies = readCookies(request)
  let returnTo = '/'
  try {
    const encodedReturnTo = cookies.get(OAUTH_RETURN_COOKIE)
    if (encodedReturnTo) {
      returnTo = safeReturnTo(base64UrlDecodeText(encodedReturnTo), requestUrl.origin)
    }
  } catch {
    returnTo = '/'
  }

  if (requestUrl.searchParams.has('error')) {
    return callbackRedirect(request, returnTo, 'cancelled').response()
  }

  const state = requestUrl.searchParams.get('state')
  const code = requestUrl.searchParams.get('code')
  const expectedState = cookies.get(OAUTH_STATE_COOKIE)
  const verifier = cookies.get(OAUTH_VERIFIER_COOKIE)
  if (!state || !code || !expectedState || state !== expectedState || !verifier) {
    return callbackRedirect(request, returnTo, 'failed').response()
  }
  if (!isGoogleConfigured(env)) {
    return callbackRedirect(request, returnTo, 'failed').response()
  }

  try {
    const profile = await services.exchangeCode({
      code,
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      codeVerifier: verifier,
      redirectUri: new URL(OAUTH_COOKIE_PATH, requestUrl.origin).toString()
    })
    const identities = new IdentitiesRepository(env.AUTH_DB)
    const user = await identities.upsertGoogle(profile)
    const token = await createIdentitySession(user.id, env.SESSION_SIGNING_KEY)
    const redirect = callbackRedirect(request, returnTo, 'success')
    redirect.headers.append(
      'Set-Cookie',
      serializeCookie(IDENTITY_SESSION_COOKIE, token, {
        maxAge: IDENTITY_SESSION_SECONDS,
        secure: secureRequest(request)
      })
    )
    return redirect.response()
  } catch (error) {
    console.error('Google authentication failed', error)
    return callbackRedirect(request, returnTo, 'failed').response()
  }
}

const logout = (request: Request): Response => {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('Origin')
  if (origin && origin !== requestUrl.origin) {
    return json({ code: 'auth.forbidden', message: 'Cross-origin logout is not allowed.' }, 403)
  }
  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    clearCookie(IDENTITY_SESSION_COOKIE, { secure: secureRequest(request) })
  )
  return json({ authenticated: false }, 200, headers)
}

export const handleIdentityRequest = async (
  request: Request,
  env: Env,
  services: GoogleAuthServices = defaultGoogleAuthServices
): Promise<Response> => {
  const url = new URL(request.url)
  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    return sessionResponse(request, env)
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    return logout(request)
  }
  if (url.pathname === '/api/auth/google/start' && request.method === 'GET') {
    return beginGoogleLogin(request, env)
  }
  if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') {
    return finishGoogleLogin(request, env, services)
  }
  return json({ code: 'auth.not_found', message: 'Authentication route not found.' }, 404)
}
