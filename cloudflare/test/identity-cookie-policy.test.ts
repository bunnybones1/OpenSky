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
const USER_ID = 'identity-cookie-policy-user'
const REFERENCE = `identity:${USER_ID}`

const rpc = async (method: string, body: object) => {
  const token = await createIdentitySession(
    USER_ID,
    testEnv.SESSION_SIGNING_KEY
  )
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${IDENTITY_SESSION_COOKIE}=${token}`
      },
      body: JSON.stringify(body)
    }),
    testEnv
  )
}

beforeEach(async () => {
  await testEnv.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await testEnv.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Cookie Tester', 'cookie-tester@example.com', ?, ?)`
  )
    .bind(USER_ID, now, now)
    .run()
  await new PlayerRepository(testEnv.AUTH_DB).bootstrap(USER_ID)
})

describe('identity cookie policy', () => {
  it('stores only essential authentication and optional analytics consent', async () => {
    const save = await rpc('SaveCookiePolicy', {
      cookieOptions: {
        AUTHENTICATION: false,
        GEO_BLOCKING: true,
        MARKETPLACE: true,
        PRODUCT_ANALYTICS: true
      }
    })
    expect(save.status).toBe(200)

    const read = await rpc('GetCookiePolicy', {})
    expect(await read.json()).toEqual({
      res: {
        AUTHENTICATION: true,
        PRODUCT_ANALYTICS: true
      }
    })
  })

  it('prevents retired identity categories from bypassing the repository', async () => {
    await rpc('SaveCookiePolicy', {
      cookieOptions: { PRODUCT_ANALYTICS: false }
    })

    await expect(
      testEnv.AUTH_DB.prepare(
        `UPDATE cookie_policies SET policy = ? WHERE account_address = ?`
      )
        .bind(
          JSON.stringify({
            AUTHENTICATION: true,
            MARKETPLACE: true,
            PRODUCT_ANALYTICS: false
          }),
          REFERENCE
        )
        .run()
    ).rejects.toThrow('identity cookie policy contains a retired category')

    const read = await rpc('GetCookiePolicy', {})
    expect(await read.json()).toEqual({
      res: {
        AUTHENTICATION: true,
        PRODUCT_ANALYTICS: false
      }
    })
  })

  it('removes identity policy when its owning user is deleted', async () => {
    await rpc('SaveCookiePolicy', {
      cookieOptions: { PRODUCT_ANALYTICS: false }
    })

    await testEnv.AUTH_DB.prepare('DELETE FROM users WHERE id = ?')
      .bind(USER_ID)
      .run()

    const policy = await testEnv.AUTH_DB.prepare(
      'SELECT policy FROM cookie_policies WHERE account_address = ?'
    )
      .bind(REFERENCE)
      .first()
    expect(policy).toBeNull()
  })
})
