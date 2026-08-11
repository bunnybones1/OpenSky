import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'

const testEnv = env as unknown as Env
const USER_ID = 'storage-user-1'
const OTHER_USER_ID = 'storage-user-2'

const rpc = async (method: string, body: object, userId = USER_ID) => {
  const token = await createIdentitySession(userId, testEnv.SESSION_SIGNING_KEY)
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
  await env.AUTH_DB.prepare('DELETE FROM user_storage').run()
})

describe('legacy user-storage RPC compatibility', () => {
  it('fetches, upserts, filters, and deletes account-scoped JSON values', async () => {
    const missing = await rpc('UserStorageFetch', { key: 'game_info' })
    expect(await missing.json()).toEqual({ object: null })

    const firstSave = await rpc('UserStorageSave', {
      key: 'GAME_INFO',
      object: { mode: 'PRACTICE_BOT', deck: 1 }
    })
    expect(await firstSave.json()).toEqual({ ok: true })
    expect(
      await (await rpc('UserStorageFetch', { key: 'game_info' })).json()
    ).toEqual({ object: { mode: 'PRACTICE_BOT', deck: 1 } })

    await rpc('UserStorageSave', {
      key: 'game_info',
      object: { mode: 'PRACTICE_BOT', deck: 2 }
    })
    await rpc('UserStorageSave', {
      key: 'sound_settings',
      object: { music: 0.5 }
    })
    expect(
      await (await rpc('UserStorageFetchAll', { keys: ['GAME_INFO'] })).json()
    ).toEqual({ objects: { game_info: { mode: 'PRACTICE_BOT', deck: 2 } } })
    expect(await (await rpc('UserStorageFetchAll', {})).json()).toEqual({
      objects: {
        game_info: { mode: 'PRACTICE_BOT', deck: 2 },
        sound_settings: { music: 0.5 }
      }
    })

    expect(
      await (
        await rpc('UserStorageFetch', { key: 'game_info' }, OTHER_USER_ID)
      ).json()
    ).toEqual({ object: null })

    expect(
      await (await rpc('UserStorageDelete', { key: 'GAME_INFO' })).json()
    ).toEqual({ ok: true })
    expect(
      await (await rpc('UserStorageDelete', { key: 'game_info' })).json()
    ).toEqual({ ok: true })
    expect(
      await (await rpc('UserStorageFetch', { key: 'game_info' })).json()
    ).toEqual({ object: null })
  })

  it('bounds keys, key lists, and serialized object size', async () => {
    expect((await rpc('UserStorageFetch', { key: '' })).status).toBe(400)
    expect(
      (await rpc('UserStorageFetchAll', { keys: Array(129).fill('x') })).status
    ).toBe(400)
    expect(
      (
        await rpc('UserStorageSave', {
          key: 'too_large',
          object: 'x'.repeat(256 * 1024)
        })
      ).status
    ).toBe(400)
  })
})
