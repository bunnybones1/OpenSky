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
import { AccountActionsRepository } from './account-actions'
import { AccountDeletionRepository } from './account-deletion'
import { RpcError } from './errors'
import { WalletLinkError, WalletLinksRepository } from './wallet-links'
import {
  WalletContentsError,
  WalletContentsRepository
} from './wallet-contents'

const OAUTH_STATE_COOKIE = 'opensky_google_state'
const OAUTH_VERIFIER_COOKIE = 'opensky_google_verifier'
const OAUTH_RETURN_COOKIE = 'opensky_google_return'
const OAUTH_PURPOSE_COOKIE = 'opensky_google_purpose'
const OAUTH_COOKIE_PATH = '/api/auth/google/callback'
const OAUTH_COOKIE_SECONDS = 10 * 60
const ACCOUNT_DELETION_PURPOSE = 'account-deletion'
const MAX_WALLET_REQUEST_BYTES = 12 * 1024

const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) => {
  const headers = new Headers(extraHeaders)
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(body), { status, headers })
}

const isGoogleConfigured = (env: Env) =>
  Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim())

const safeReturnTo = (candidate: string | null, origin: string): string => {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//'))
    return '/'
  try {
    const url = new URL(candidate, origin)
    if (url.origin !== origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`.slice(0, 1024)
  } catch {
    return '/'
  }
}

const secureRequest = (request: Request) =>
  new URL(request.url).protocol === 'https:'

const oauthCookie = (request: Request, name: string, value: string) =>
  serializeCookie(name, value, {
    maxAge: OAUTH_COOKIE_SECONDS,
    path: OAUTH_COOKIE_PATH,
    secure: secureRequest(request)
  })

const clearOAuthCookies = (request: Request, headers: Headers) => {
  for (const name of [
    OAUTH_STATE_COOKIE,
    OAUTH_VERIFIER_COOKIE,
    OAUTH_RETURN_COOKIE,
    OAUTH_PURPOSE_COOKIE
  ]) {
    headers.append(
      'Set-Cookie',
      clearCookie(name, {
        path: OAUTH_COOKIE_PATH,
        secure: secureRequest(request)
      })
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
  const headers = new Headers({
    Location: url.toString(),
    'Cache-Control': 'no-store'
  })
  clearOAuthCookies(request, headers)
  return {
    headers,
    response: () => new Response(null, { status: 302, headers })
  }
}

const accountDeletionRedirect = (
  request: Request,
  returnTo: string,
  result: 'scheduled' | 'cancelled' | 'failed'
) => {
  const url = new URL(
    result === 'scheduled' ? '/deleted-account' : returnTo,
    new URL(request.url).origin
  )
  if (result === 'scheduled') url.searchParams.set('deletion', 'scheduled')
  else url.searchParams.set('deletion_error', result)
  const headers = new Headers({
    Location: url.toString(),
    'Cache-Control': 'no-store'
  })
  clearOAuthCookies(request, headers)
  if (result === 'scheduled') {
    headers.append(
      'Set-Cookie',
      clearCookie(IDENTITY_SESSION_COOKIE, { secure: secureRequest(request) })
    )
  }
  return new Response(null, { status: 302, headers })
}

const requestUserId = async (
  request: Request,
  env: Env
): Promise<string | undefined> => {
  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  if (!token) return
  return verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
}

const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('Origin')
  return origin === new URL(request.url).origin
}

const walletErrorResponse = (error: unknown): Response | undefined => {
  if (error instanceof WalletLinkError) {
    return json({ code: error.code, message: error.message }, error.status)
  }
  if (error instanceof RpcError) {
    return json({ code: error.code, message: error.message }, error.status)
  }
  return undefined
}

const walletRequestBody = async (
  request: Request
): Promise<Record<string, unknown>> => {
  const contentLength = Number(request.headers.get('Content-Length') || '0')
  if (contentLength > MAX_WALLET_REQUEST_BYTES) {
    throw new WalletLinkError(
      413,
      'wallet.request_too_large',
      'Wallet link request is too large.'
    )
  }
  let text: string
  try {
    text = await request.text()
  } catch {
    throw new WalletLinkError(
      400,
      'wallet.invalid_request',
      'A JSON body is required.'
    )
  }
  if (text.length > MAX_WALLET_REQUEST_BYTES) {
    throw new WalletLinkError(
      413,
      'wallet.request_too_large',
      'Wallet link request is too large.'
    )
  }
  try {
    const body = JSON.parse(text) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error()
    return body as Record<string, unknown>
  } catch {
    throw new WalletLinkError(
      400,
      'wallet.invalid_request',
      'A JSON body is required.'
    )
  }
}

const walletLinkRequest = async (
  request: Request,
  env: Env,
  action: 'challenge' | 'verify' | 'unlink'
): Promise<Response> => {
  if (!sameOrigin(request)) {
    return json(
      {
        code: 'wallet.forbidden',
        message: 'Cross-origin wallet requests are not allowed.'
      },
      403
    )
  }
  const userId = await requestUserId(request, env)
  if (!userId) {
    return json(
      { code: 'wallet.unauthenticated', message: 'Sign in is required.' },
      401
    )
  }
  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
    const body = await walletRequestBody(request)
    const wallets = new WalletLinksRepository(env.AUTH_DB, {
      rpcUrls: env.WALLET_RPC_URL_137
        ? new Map([[137, env.WALLET_RPC_URL_137]])
        : undefined
    })
    if (action === 'challenge') {
      return json({
        challenge: await wallets.createChallenge(
          userId,
          new URL(request.url).origin,
          { address: body.address, chainId: body.chainId }
        )
      })
    }
    if (action === 'verify') {
      return json({
        wallets: await wallets.verifyChallenge(
          userId,
          new URL(request.url).origin,
          {
            challengeId: body.challengeId,
            signature: body.signature,
            label: body.label
          }
        )
      })
    }
    return json(await wallets.unlink(userId, body.address))
  } catch (error) {
    const response = walletErrorResponse(error)
    if (response) return response
    console.error('Wallet link request failed', error)
    return json(
      { code: 'wallet.internal', message: 'Unable to update wallet links.' },
      500
    )
  }
}

const walletContentsRequest = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const userId = await requestUserId(request, env)
  if (!userId) {
    return json(
      { code: 'wallet.unauthenticated', message: 'Sign in is required.' },
      401
    )
  }
  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
    return json(
      await new WalletContentsRepository(env.AUTH_DB, {
        indexerUrl: env.WALLET_INDEXER_URL_137,
        accessKey: env.WALLET_INDEXER_ACCESS_KEY,
        contractAddress: env.WALLET_ASSET_CONTRACT_137
      }).read(userId)
    )
  } catch (error) {
    if (error instanceof WalletContentsError) {
      return json(
        { code: error.code, message: error.message },
        error.status
      )
    }
    if (error instanceof RpcError) {
      return json({ code: error.code, message: error.message }, error.status)
    }
    console.error('Wallet contents request failed', error)
    return json(
      {
        code: 'wallet.contents_unavailable',
        message: 'Wallet contents are temporarily unavailable.'
      },
      503
    )
  }
}

const beginAccountDeletion = async (
  request: Request,
  env: Env
): Promise<Response> => {
  if (!sameOrigin(request)) {
    return json(
      {
        code: 'auth.forbidden',
        message: 'Cross-origin account deletion is not allowed.'
      },
      403
    )
  }
  if (!isGoogleConfigured(env)) {
    return json(
      {
        code: 'auth.provider_not_configured',
        message: 'Google sign-in is not configured yet.'
      },
      503
    )
  }
  const userId = await requestUserId(request, env)
  if (!userId) {
    return json(
      { code: 'auth.unauthenticated', message: 'Sign in is required.' },
      401
    )
  }
  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
  } catch (error) {
    if (error instanceof RpcError) {
      return json({ code: error.code, message: error.message }, error.status)
    }
    throw error
  }
  let body: { accountName?: unknown; returnTo?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json(
      { code: 'auth.invalid_request', message: 'A JSON body is required.' },
      400
    )
  }
  const accountName =
    typeof body.accountName === 'string' ? body.accountName : ''
  try {
    await new AccountDeletionRepository(
      env.AUTH_DB,
      env.CLIENT_FEEDBACK
    ).confirmAccountName(userId, accountName)
  } catch (error) {
    if (error instanceof RpcError) {
      return json({ code: error.code, message: error.message }, error.status)
    }
    throw error
  }
  const identities = new IdentitiesRepository(env.AUTH_DB)
  if (!(await identities.findProviderSubject(userId, 'google'))) {
    return json(
      {
        code: 'auth.identity_not_linked',
        message: 'This account does not have a Google identity.'
      },
      409
    )
  }

  const requestUrl = new URL(request.url)
  const redirectUri = new URL(OAUTH_COOKIE_PATH, requestUrl.origin).toString()
  const state = randomToken()
  const verifier = randomToken(48)
  const returnTo = safeReturnTo(
    typeof body.returnTo === 'string' ? body.returnTo : '/',
    requestUrl.origin
  )
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
    prompt: 'select_account',
    max_age: '0'
  }).toString()
  const headers = new Headers()
  headers.append('Set-Cookie', oauthCookie(request, OAUTH_STATE_COOKIE, state))
  headers.append(
    'Set-Cookie',
    oauthCookie(request, OAUTH_VERIFIER_COOKIE, verifier)
  )
  headers.append(
    'Set-Cookie',
    oauthCookie(request, OAUTH_RETURN_COOKIE, base64UrlEncode(returnTo))
  )
  headers.append(
    'Set-Cookie',
    oauthCookie(request, OAUTH_PURPOSE_COOKIE, ACCOUNT_DELETION_PURPOSE)
  )
  return json({ authorizationUrl: authorizationUrl.toString() }, 200, headers)
}

const sessionResponse = async (
  request: Request,
  env: Env
): Promise<Response> => {
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
    return json(
      { authenticated: false, providers: { google: configured } },
      200,
      headers
    )
  }

  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
  } catch (error) {
    if (!(error instanceof RpcError) || error.status !== 403) throw error
    return json(
      {
        authenticated: true,
        code:
          error.message === 'account flagged for deletion' ||
          error.message === 'account deleted'
            ? 'auth.account_deleted'
            : 'auth.account_banned',
        message: error instanceof Error ? error.message : 'account banned'
      },
      403
    )
  }

  const identities = new IdentitiesRepository(env.AUTH_DB)
  const user = await identities.findUserById(userId)
  if (!user)
    return json({ authenticated: false, providers: { google: configured } })

  return json({
    authenticated: true,
    user,
    gamePrincipal: await deriveGamePrincipal(user.id),
    wallets: await identities.listWallets(user.id),
    providers: { google: configured }
  })
}

const beginGoogleLogin = async (
  request: Request,
  env: Env
): Promise<Response> => {
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
  const returnTo = safeReturnTo(
    requestUrl.searchParams.get('returnTo'),
    requestUrl.origin
  )
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

  const headers = new Headers({
    Location: authorizationUrl.toString(),
    'Cache-Control': 'no-store'
  })
  headers.append('Set-Cookie', oauthCookie(request, OAUTH_STATE_COOKIE, state))
  headers.append(
    'Set-Cookie',
    oauthCookie(request, OAUTH_VERIFIER_COOKIE, verifier)
  )
  headers.append(
    'Set-Cookie',
    oauthCookie(request, OAUTH_RETURN_COOKIE, base64UrlEncode(returnTo))
  )
  headers.append(
    'Set-Cookie',
    clearCookie(OAUTH_PURPOSE_COOKIE, {
      path: OAUTH_COOKIE_PATH,
      secure: secureRequest(request)
    })
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
  const deletionFlow =
    cookies.get(OAUTH_PURPOSE_COOKIE) === ACCOUNT_DELETION_PURPOSE
  let returnTo = '/'
  try {
    const encodedReturnTo = cookies.get(OAUTH_RETURN_COOKIE)
    if (encodedReturnTo) {
      returnTo = safeReturnTo(
        base64UrlDecodeText(encodedReturnTo),
        requestUrl.origin
      )
    }
  } catch {
    returnTo = '/'
  }

  if (requestUrl.searchParams.has('error')) {
    return deletionFlow
      ? accountDeletionRedirect(request, returnTo, 'cancelled')
      : callbackRedirect(request, returnTo, 'cancelled').response()
  }

  const state = requestUrl.searchParams.get('state')
  const code = requestUrl.searchParams.get('code')
  const expectedState = cookies.get(OAUTH_STATE_COOKIE)
  const verifier = cookies.get(OAUTH_VERIFIER_COOKIE)
  if (
    !state ||
    !code ||
    !expectedState ||
    state !== expectedState ||
    !verifier
  ) {
    return deletionFlow
      ? accountDeletionRedirect(request, returnTo, 'failed')
      : callbackRedirect(request, returnTo, 'failed').response()
  }
  if (!isGoogleConfigured(env)) {
    return deletionFlow
      ? accountDeletionRedirect(request, returnTo, 'failed')
      : callbackRedirect(request, returnTo, 'failed').response()
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
    if (deletionFlow) {
      const userId = await requestUserId(request, env)
      const linkedSubject = userId
        ? await identities.findProviderSubject(userId, 'google')
        : undefined
      if (!userId || !linkedSubject || linkedSubject !== profile.subject) {
        return accountDeletionRedirect(request, returnTo, 'failed')
      }
      await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(
        userId
      )
      await new AccountDeletionRepository(
        env.AUTH_DB,
        env.CLIENT_FEEDBACK
      ).request(userId)
      return accountDeletionRedirect(request, returnTo, 'scheduled')
    }
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
    return deletionFlow
      ? accountDeletionRedirect(request, returnTo, 'failed')
      : callbackRedirect(request, returnTo, 'failed').response()
  }
}

const logout = (request: Request): Response => {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('Origin')
  if (origin && origin !== requestUrl.origin) {
    return json(
      {
        code: 'auth.forbidden',
        message: 'Cross-origin logout is not allowed.'
      },
      403
    )
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
  if (
    url.pathname === '/api/auth/account-deletion/start' &&
    request.method === 'POST'
  ) {
    return beginAccountDeletion(request, env)
  }
  if (
    url.pathname === '/api/auth/wallet/challenge' &&
    request.method === 'POST'
  ) {
    return walletLinkRequest(request, env, 'challenge')
  }
  if (url.pathname === '/api/auth/wallet/verify' && request.method === 'POST') {
    return walletLinkRequest(request, env, 'verify')
  }
  if (url.pathname === '/api/auth/wallet' && request.method === 'DELETE') {
    return walletLinkRequest(request, env, 'unlink')
  }
  if (
    url.pathname === '/api/auth/wallet/contents' &&
    request.method === 'GET'
  ) {
    return walletContentsRequest(request, env)
  }
  if (url.pathname === '/api/auth/google/start' && request.method === 'GET') {
    return beginGoogleLogin(request, env)
  }
  if (
    url.pathname === '/api/auth/google/callback' &&
    request.method === 'GET'
  ) {
    return finishGoogleLogin(request, env, services)
  }
  return json(
    { code: 'auth.not_found', message: 'Authentication route not found.' },
    404
  )
}
