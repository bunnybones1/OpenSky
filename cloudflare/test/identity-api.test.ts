import { env } from 'cloudflare:workers'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Env } from '../src/env'
import type { GoogleAuthServices } from '../src/google-auth'
import { handleIdentityRequest } from '../src/identity-api'

const profile = {
  subject: 'google-subject-123',
  displayName: 'Open Sky Player',
  email: 'player@example.com',
  emailVerified: true,
  avatarUrl: 'https://example.com/avatar.png'
}

const exchangeCode = vi.fn<GoogleAuthServices['exchangeCode']>(async () => profile)
const services: GoogleAuthServices = { exchangeCode }

const request = (path: string, init?: RequestInit, cookie?: string) => {
  const headers = new Headers(init?.headers)
  if (cookie) headers.set('Cookie', cookie)
  return handleIdentityRequest(
    new Request(`https://opensky.example${path}`, { ...init, headers }),
    env as unknown as Env,
    services
  )
}

const setCookies = (response: Response): string[] => {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  return headers.getSetCookie?.() || [response.headers.get('Set-Cookie') || '']
}

const cookieJar = (response: Response): string =>
  setCookies(response)
    .filter(Boolean)
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ')

const cookieValue = (response: Response, name: string): string | undefined => {
  const cookie = setCookies(response).find((candidate) => candidate.startsWith(`${name}=`))
  return cookie?.split(';', 1)[0]
}

beforeEach(async () => {
  exchangeCode.mockClear()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM wallet_connections'),
    env.AUTH_DB.prepare('DELETE FROM auth_identities'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
})

describe('Cloudflare identity API', () => {
  it('reports provider availability without requiring a session', async () => {
    const response = await request('/api/auth/session')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      authenticated: false,
      providers: { google: true }
    })
  })

  it('completes Google OIDC and restores an HttpOnly identity session', async () => {
    const start = await request('/api/auth/google/start?returnTo=%2Fwelcome')
    expect(start.status).toBe(302)
    const authorizationUrl = new URL(start.headers.get('Location')!)
    expect(authorizationUrl.origin).toBe('https://accounts.google.com')
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256')
    const state = authorizationUrl.searchParams.get('state')
    expect(state).toBeTruthy()

    const callback = await request(
      `/api/auth/google/callback?state=${encodeURIComponent(state!)}&code=google-code`,
      undefined,
      cookieJar(start)
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get('Location')).toBe('https://opensky.example/welcome?auth=success')
    expect(exchangeCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'google-code',
        clientId: 'google-client-id.apps.googleusercontent.com',
        redirectUri: 'https://opensky.example/api/auth/google/callback'
      })
    )

    const sessionCookie = cookieValue(callback, 'opensky_identity_session')
    expect(sessionCookie).toBeTruthy()
    expect(
      setCookies(callback).find((cookie) =>
        cookie.startsWith('opensky_identity_session=')
      )
    ).toMatch(/; HttpOnly; Secure; SameSite=Lax$/)
    const session = await request('/api/auth/session', undefined, sessionCookie)
    const sessionBody = (await session.json()) as {
      gamePrincipal: string
      user: { id: string }
    }
    expect(sessionBody).toMatchObject({
      authenticated: true,
      user: {
        displayName: 'Open Sky Player',
        email: 'player@example.com',
        avatarUrl: 'https://example.com/avatar.png'
      },
      wallets: [],
      providers: { google: true }
    })
    expect(sessionBody.gamePrincipal).toBe(
      await deriveGamePrincipal(sessionBody.user.id)
    )

    const identities = await env.AUTH_DB.prepare(
      "SELECT COUNT(*) AS count FROM auth_identities WHERE provider = 'google'"
    ).first<{ count: number }>()
    expect(identities?.count).toBe(1)
  })

  it('updates an existing Google identity instead of creating a duplicate user', async () => {
    const signIn = async () => {
      const start = await request('/api/auth/google/start')
      const authorizationUrl = new URL(start.headers.get('Location')!)
      const state = authorizationUrl.searchParams.get('state')
      return request(
        `/api/auth/google/callback?state=${encodeURIComponent(state!)}&code=google-code`,
        undefined,
        cookieJar(start)
      )
    }

    await signIn()
    await signIn()

    const users = await env.AUTH_DB.prepare('SELECT COUNT(*) AS count FROM users').first<{
      count: number
    }>()
    expect(users?.count).toBe(1)
  })

  it('rejects a callback whose anti-forgery state does not match', async () => {
    const start = await request('/api/auth/google/start')
    const callback = await request(
      '/api/auth/google/callback?state=attacker&code=google-code',
      undefined,
      cookieJar(start)
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get('Location')).toBe(
      'https://opensky.example/?auth_error=failed'
    )
    expect(exchangeCode).not.toHaveBeenCalled()
  })

  it('clears the identity session on same-origin logout', async () => {
    const response = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    expect(response.status).toBe(200)
    expect(setCookies(response)).toContainEqual(
      expect.stringContaining('opensky_identity_session=; Max-Age=0')
    )
  })

  it('returns a recoverable error when Google credentials are absent', async () => {
    const disabledEnv = {
      ...(env as unknown as Env),
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: ''
    }
    const response = await handleIdentityRequest(
      new Request('https://opensky.example/api/auth/google/start'),
      disabledEnv,
      services
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'auth.provider_not_configured' })
  })

  it('does not preserve an external post-login redirect', async () => {
    const start = await request(
      '/api/auth/google/start?returnTo=https%3A%2F%2Fevil.example%2Fsteal'
    )
    const authorizationUrl = new URL(start.headers.get('Location')!)
    const state = authorizationUrl.searchParams.get('state')
    const callback = await request(
      `/api/auth/google/callback?state=${encodeURIComponent(state!)}&code=google-code`,
      undefined,
      cookieJar(start)
    )
    expect(callback.headers.get('Location')).toBe('https://opensky.example/?auth=success')
  })
})
