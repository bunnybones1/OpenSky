import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const userId = 'retired-rpc-user'

beforeAll(async () => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT OR IGNORE INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'RetiredRpcWeasel', 'retired-rpc@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

const rpc = async (method: string, signedIn: boolean) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    headers.set(
      'Cookie',
      `${IDENTITY_SESSION_COOKIE}=${await createIdentitySession(
        userId,
        testEnv.SESSION_SIGNING_KEY
      )}`
    )
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

describe('zero-user Cloud Weasel retirement boundaries', () => {
  for (const method of [
    'IAPVerifyGoogleProducts2',
    'IAPVerifyAppleProducts2'
  ]) {
    it(`${method} rejects anonymous calls and points identities to the modern verifier`, async () => {
      expect((await rpc(method, false)).status).toBe(401)
      const response = await rpc(method, true)
      expect(response.status).toBe(501)
      expect(await response.json()).toMatchObject({
        code: 'webrpc.unimplemented',
        msg: expect.stringContaining('signed-in identity')
      })
    })
  }

  it('retires the obsolete public early-access list without storing an email', async () => {
    const response = await rpc('JoinEarlyAccessList', false)
    expect(response.status).toBe(501)
    expect(await response.json()).toEqual({
      code: 'webrpc.unimplemented',
      msg: 'Cloud Weasel early access is retired',
      status: 501
    })
  })
})
