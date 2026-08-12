import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountDeletionRepository } from '../src/account-deletion'
import { AccountActionsRepository } from '../src/account-actions'
import type { Env } from '../src/env'
import type { GoogleAuthServices } from '../src/google-auth'
import { handleIdentityRequest } from '../src/identity-api'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { IdentitiesRepository } from '../src/identities'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
let testSequence = 0
let userId = ''
let profile = {
  subject: '',
  displayName: '',
  email: '',
  emailVerified: true,
  avatarUrl: 'https://example.com/delete-me.png'
}
const exchangeCode = vi.fn<GoogleAuthServices['exchangeCode']>(
  async () => profile
)
const services: GoogleAuthServices = { exchangeCode }

const setCookies = (response: Response): string[] => {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
  }
  return headers.getSetCookie?.() || [response.headers.get('Set-Cookie') || '']
}

const cookieJar = (response: Response): string =>
  setCookies(response)
    .filter(Boolean)
    .map(cookie => cookie.split(';', 1)[0])
    .join('; ')

const sessionCookie = async () => {
  const token = await createIdentitySession(userId, testEnv.SESSION_SIGNING_KEY)
  return `${IDENTITY_SESSION_COOKIE}=${token}`
}

const request = (
  path: string,
  init?: RequestInit,
  cookie?: string
): Promise<Response> => {
  const headers = new Headers(init?.headers)
  if (cookie) headers.set('Cookie', cookie)
  return handleIdentityRequest(
    new Request(`https://opensky.example${path}`, { ...init, headers }),
    testEnv,
    services
  )
}

const begin = async (accountName = profile.displayName) =>
  request(
    '/api/auth/account-deletion/start',
    {
      method: 'POST',
      headers: {
        Origin: 'https://opensky.example',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountName, returnTo: '/account/settings' })
    },
    await sessionCookie()
  )

beforeEach(async () => {
  exchangeCode.mockClear()
  testSequence += 1
  userId = `deletion-player-${testSequence}`
  profile = {
    subject: `google-delete-subject-${testSequence}`,
    displayName: `Delete Me ${testSequence}`,
    email: `delete-me-${testSequence}@example.com`,
    emailVerified: true,
    avatarUrl: 'https://example.com/delete-me.png'
  }
  const now = new Date('2026-08-12T00:00:00.000Z').toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      profile.displayName,
      profile.email,
      profile.avatarUrl,
      now,
      now
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO auth_identities
         (provider, provider_subject, user_id, email, email_verified,
          created_at, updated_at)
       VALUES ('google', ?, ?, ?, 1, ?, ?)`
    ).bind(profile.subject, userId, profile.email, now, now)
  ])
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('identity-native account deletion', () => {
  it('requires a same-origin session and exact account name before step-up', async () => {
    expect(
      (
        await request('/api/auth/account-deletion/start', {
          method: 'POST',
          headers: {
            Origin: 'https://opensky.example',
            'Content-Type': 'application/json'
          },
          body: '{}'
        })
      ).status
    ).toBe(401)
    expect(
      (
        await request(
          '/api/auth/account-deletion/start',
          {
            method: 'POST',
            headers: {
              Origin: 'https://attacker.example',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accountName: 'Delete Me' })
          },
          await sessionCookie()
        )
      ).status
    ).toBe(403)
    const wrongName = await begin(profile.displayName.toLowerCase())
    expect(wrongName.status).toBe(400)
    expect(await wrongName.json()).toMatchObject({
      message: 'account name does not match'
    })

    const response = await begin()
    expect(response.status).toBe(200)
    const body = await response.json<{ authorizationUrl: string }>()
    const authorizationUrl = new URL(body.authorizationUrl)
    expect(authorizationUrl.origin).toBe('https://accounts.google.com')
    expect(authorizationUrl.searchParams.get('prompt')).toBe('select_account')
    expect(authorizationUrl.searchParams.get('max_age')).toBe('0')
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe(
      'S256'
    )
    expect(
      setCookies(response).find(cookie =>
        cookie.startsWith('opensky_google_purpose=account-deletion')
      )
    ).toBeTruthy()
  })

  it('rejects a different Google subject without changing account state', async () => {
    const start = await begin()
    exchangeCode.mockResolvedValueOnce({
      ...profile,
      subject: 'different-google-subject'
    })
    const authorizationUrl = new URL(
      (await start.json<{ authorizationUrl: string }>()).authorizationUrl
    )
    const callback = await request(
      `/api/auth/google/callback?state=${encodeURIComponent(
        authorizationUrl.searchParams.get('state')!
      )}&code=wrong-account-code`,
      undefined,
      `${await sessionCookie()}; ${cookieJar(start)}`
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get('Location')).toBe(
      'https://opensky.example/account/settings?deletion_error=failed'
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT account_status FROM player_account_settings WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ account_status: 'ACTIVE' })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM account_deletion_requests`
      ).first()
    ).toEqual({ count: 0 })
  })

  it('does not let an account sanction race the Google confirmation', async () => {
    const start = await begin()
    const authorizationUrl = new URL(
      (await start.json<{ authorizationUrl: string }>()).authorizationUrl
    )
    const now = new Date('2026-08-12T00:00:00.000Z').toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_account_settings
         SET account_status = 'BANNED' WHERE user_id = ?`
      ).bind(userId),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_actions
           (action_key, account_user_id, account_address, action_type,
            created_by_user_id, created_by_account_id, expires_at, created_at,
            updated_at)
         VALUES (?, ?, ?, 'MOD_BAN', 'moderator', 1, ?, ?, ?)`
      ).bind(
        `deletion-race-${testSequence}`,
        userId,
        `identity:${userId}`,
        '2026-08-13T00:00:00.000Z',
        now,
        now
      )
    ])
    const callback = await request(
      `/api/auth/google/callback?state=${encodeURIComponent(
        authorizationUrl.searchParams.get('state')!
      )}&code=fresh-google-code`,
      undefined,
      `${await sessionCookie()}; ${cookieJar(start)}`
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get('Location')).toBe(
      'https://opensky.example/account/settings?deletion_error=failed'
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM account_deletion_requests
         WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ count: 0 })
  })

  it('schedules once, clears the session, and blocks every stale-session boundary', async () => {
    const start = await begin()
    const authorizationUrl = new URL(
      (await start.json<{ authorizationUrl: string }>()).authorizationUrl
    )
    const cookie = await sessionCookie()
    const callback = await request(
      `/api/auth/google/callback?state=${encodeURIComponent(
        authorizationUrl.searchParams.get('state')!
      )}&code=fresh-google-code`,
      undefined,
      `${cookie}; ${cookieJar(start)}`
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get('Location')).toBe(
      'https://opensky.example/deleted-account?deletion=scheduled'
    )
    expect(setCookies(callback)).toContainEqual(
      expect.stringContaining(`${IDENTITY_SESSION_COOKIE}=; Max-Age=0`)
    )

    const deletion = await env.AUTH_DB.prepare(
      `SELECT status, requested_at, execute_at, completed_at
       FROM account_deletion_requests WHERE user_id = ?`
    )
      .bind(userId)
      .first<{
        status: string
        requested_at: string
        execute_at: string
        completed_at: string | null
      }>()
    expect(deletion).toMatchObject({ status: 'PENDING', completed_at: null })
    expect(
      new Date(deletion!.execute_at).getTime() -
        new Date(deletion!.requested_at).getTime()
    ).toBe((30 * 24 - 1) * 60 * 60 * 1_000)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT account_status, leaderboard_eligible
         FROM player_account_settings WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ account_status: 'TO_DELETE', leaderboard_eligible: 0 })
    await expect(
      new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
    ).rejects.toThrow('account flagged for deletion')

    const staleSession = await request('/api/auth/session', undefined, cookie)
    expect(staleSession.status).toBe(403)
    expect(await staleSession.json()).toMatchObject({
      code: 'auth.account_deleted'
    })

    const retry = await new AccountDeletionRepository(env.AUTH_DB).request(
      userId,
      new Date('2026-08-13T00:00:00.000Z')
    )
    expect(retry).toMatchObject({
      status: 'PENDING',
      requestedAt: deletion!.requested_at,
      executeAt: deletion!.execute_at
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM account_deletion_requests`
      ).first()
    ).toEqual({ count: 1 })
  })

  it('soft-deletes due identities, preserves game state, and prevents recreation', async () => {
    const requestedAt = new Date('2026-07-01T00:00:00.000Z')
    await new AccountDeletionRepository(env.AUTH_DB).request(
      userId,
      requestedAt
    )
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO wallet_link_challenges
           (id, user_id, namespace, address, chain_id, nonce, origin, message,
            status, created_at, expires_at)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ?, 'eip155',
                 '0x0000000000000000000000000000000000000abc', 137,
                 '1234567890abcdef', 'https://opensky.example',
                 'pending wallet proof', 'PENDING', ?, ?)`
      ).bind(
        userId,
        requestedAt.toISOString(),
        new Date(requestedAt.getTime() + 10 * 60 * 1_000).toISOString()
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO wallet_connections
           (user_id, namespace, address, source, verified_at, last_seen_at)
         VALUES (?, 'eip155', '0xabc', 'walletconnect', ?, ?)`
      ).bind(userId, requestedAt.toISOString(), requestedAt.toISOString()),
      env.AUTH_DB.prepare(
        `INSERT INTO user_storage (owner, key, object_json, created_at, updated_at)
         VALUES (?, 'private', '{"email":"personal"}', ?, ?)`
      ).bind(
        `identity:${userId}`,
        requestedAt.toISOString(),
        requestedAt.toISOString()
      )
    ])

    const repository = new AccountDeletionRepository(env.AUTH_DB)
    expect(
      await repository.finalizeDue(new Date('2026-07-30T22:59:59.999Z'))
    ).toEqual({ completed: 0 })
    expect(
      await repository.finalizeDue(new Date('2026-07-30T23:00:00.000Z'))
    ).toEqual({ completed: 1 })
    expect(
      await repository.finalizeDue(new Date('2026-07-31T00:00:00.000Z'))
    ).toEqual({ completed: 0 })

    const user = await env.AUTH_DB.prepare(
      `SELECT display_name, primary_email, avatar_url FROM users WHERE id = ?`
    )
      .bind(userId)
      .first<{
        display_name: string
        primary_email: string
        avatar_url: string | null
      }>()
    expect(user!.display_name).toMatch(/^Deleted-/)
    expect(user!.primary_email).toMatch(/^deleted-.*@users\.invalid$/)
    expect(user!.avatar_url).toBeNull()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT name, locale, region, tag_art_id, account_status,
                leaderboard_eligible
         FROM player_account_settings WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({
      name: user!.display_name,
      locale: 'en',
      region: null,
      tag_art_id: null,
      account_status: 'DELETED',
      leaderboard_eligible: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, completed_at FROM account_deletion_requests
         WHERE user_id = ?`
      )
        .bind(userId)
        .first<{ status: string; completed_at: string | null }>()
    ).toMatchObject({ status: 'COMPLETED' })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM auth_identities WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM wallet_connections WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM wallet_link_challenges WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM user_storage WHERE owner = ?`
      )
        .bind(`identity:${userId}`)
        .first()
    ).toEqual({ count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_decks WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ count: 5 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT provider, length(provider_subject_hash) AS hash_length
         FROM identity_provider_tombstones WHERE deleted_user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ provider: 'google', hash_length: 64 })

    await expect(
      new IdentitiesRepository(env.AUTH_DB).upsertGoogle(profile)
    ).rejects.toThrow('Google identity was deleted')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM account_deletion_requests WHERE user_id = ?`
      )
        .bind(userId)
        .run()
    ).rejects.toThrow(/immutable/i)
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM identity_provider_tombstones WHERE deleted_user_id = ?`
      )
        .bind(userId)
        .run()
    ).rejects.toThrow(/immutable/i)
  })
})
