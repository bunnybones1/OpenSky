import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const USER_ID = 'account-compat-user'

const rpc = async (method: string, signedIn = true) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      USER_ID,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers,
      body: '{}'
    }),
    testEnv
  )
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Invite Seeker', 'invite-seeker@example.com', ?, ?)`
  )
    .bind(USER_ID, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
})

describe('source account compatibility endpoints', () => {
  it('persists an authenticated request for more invites idempotently', async () => {
    expect(
      await env.AUTH_DB.prepare(
        'SELECT request_more_invites FROM player_account_settings WHERE user_id = ?'
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ request_more_invites: 0 })

    expect((await rpc('RequestMoreInvites', false)).status).toBe(401)
    const first = await rpc('RequestMoreInvites')
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ status: true })
    expect(await (await rpc('RequestMoreInvites')).json()).toEqual({
      status: true
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT request_more_invites FROM player_account_settings WHERE user_id = ?'
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ request_more_invites: 1 })
  })

  it('preserves the source-deprecated SignIn response', async () => {
    const response = await rpc('SignIn', false)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'webrpc.internal',
      msg: 'deprecated method, use GetAuthToken + RegisterAccount',
      status: 500
    })
  })
})
