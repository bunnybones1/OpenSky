import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { AppDevKeyRepository } from '../src/app-dev-keys'
import { base64UrlDecodeText } from '../src/encoding'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { APP_DEV_SESSION_SECONDS } from '../src/jwt'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const ADMIN = 'app-dev-key-admin'
const PLAYER = 'app-dev-key-player'

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  signedIn = true,
  bearer?: string
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (bearer) headers.set('authorization', `Bearer ${bearer}`)
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    testEnv
  )
}

const grantAdmin = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantKeyWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_app_dev_key_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const enableAdmin = async () => {
  await grantAdmin()
  await grantKeyWrite()
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Key Admin', 'key-admin@example.com', ?, ?),
            (?, 'Key Player', 'key-player@example.com', ?, ?)`
  )
    .bind(ADMIN, now, now, PLAYER, now, now)
    .run()
  const players = new PlayerRepository(env.AUTH_DB)
  await players.bootstrap(ADMIN)
  await players.bootstrap(PLAYER)
})

describe('app developer key management', () => {
  it('keeps every secret-management RPC behind the dormant capability', async () => {
    expect((await rpcAs(ADMIN, 'GMListAppDevKeys', {}, false)).status).toBe(401)
    expect((await rpcAs(PLAYER, 'GMListAppDevKeys')).status).toBe(403)
    await grantAdmin()
    for (const [method, body] of [
      ['GMCreateAppDevKey', { req: { name: 'a', email: 'a@example.com' } }],
      ['GMListAppDevKeys', {}],
      ['GMDisableAppDevKey', { appDevKeyId: 1 }],
      ['GMEnableAppDevKey', { appDevKeyId: 1 }],
      ['GMGetAppDevKeyToken', { appDevKeyId: 1 }]
    ] as const) {
      expect((await rpcAs(ADMIN, method, body)).status).toBe(403)
    }
  })

  it('creates the exact source-shaped key and validates source fields', async () => {
    await enableAdmin()
    expect((await rpcAs(ADMIN, 'GMCreateAppDevKey', {})).status).toBe(400)
    expect(
      (
        await rpcAs(ADMIN, 'GMCreateAppDevKey', {
          req: { name: '', email: 'shape@example.com' }
        })
      ).status
    ).toBe(400)
    const body = await (
      await rpcAs(ADMIN, 'GMCreateAppDevKey', {
        req: { name: 'shape-key', email: 'shape@example.com' }
      })
    ).json<{ appDevKey: Record<string, unknown> }>()
    expect(body.appDevKey).toMatchObject({
      name: 'shape-key',
      email: 'shape@example.com',
      disabled: false
    })
    expect(body.appDevKey.id).toEqual(expect.any(Number))
    expect(body.appDevKey.createdBy).toEqual(expect.any(Number))
    expect(body.appDevKey.updatedBy).toBeNull()
    expect(body.appDevKey.createdAt).toEqual(expect.any(String))
    expect(body.appDevKey.updatedAt).toBe(body.appDevKey.createdAt)
    expect(body.appDevKey.appKey).toMatch(/^SW01[0-9a-f]{28}$/)
    expect(body.appDevKey.appKey as string).toHaveLength(32)
  })

  it('serializes duplicate name and email creation races', async () => {
    const repo = new AppDevKeyRepository(env.AUTH_DB)
    const nameRace = await Promise.allSettled([
      repo.create(ADMIN, { name: 'race-name', email: 'race-a@example.com' }),
      repo.create(ADMIN, { name: 'race-name', email: 'race-b@example.com' })
    ])
    expect(
      nameRace.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      nameRace.filter(result => result.status === 'rejected')
    ).toHaveLength(1)
    const emailRace = await Promise.allSettled([
      repo.create(ADMIN, { name: 'race-email-a', email: 'race@example.com' }),
      repo.create(ADMIN, { name: 'race-email-b', email: 'race@example.com' })
    ])
    expect(
      emailRace.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      emailRace.filter(result => result.status === 'rejected')
    ).toHaveLength(1)
  })

  it('preserves disable/re-enable semantics and closes concurrent enable races', async () => {
    const repo = new AppDevKeyRepository(env.AUTH_DB)
    const first = await repo.create(ADMIN, {
      name: 'enable-race',
      email: 'enable-race@example.com'
    })
    await expect(repo.setDisabled(ADMIN, first.id, true)).resolves.toBe(true)
    const second = await repo.create(ADMIN, {
      name: 'enable-race',
      email: 'enable-race@example.com'
    })
    await expect(repo.setDisabled(ADMIN, second.id, true)).resolves.toBe(true)

    const results = await Promise.allSettled([
      repo.setDisabled(ADMIN, first.id, false),
      repo.setDisabled(ADMIN, second.id, false)
    ])
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(
      1
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM app_dev_keys
         WHERE disabled = 0 AND name = 'enable-race'`
      ).first('count')
    ).toBe(1)
  })

  it('lists bounded source-shaped pages with stable cursors', async () => {
    await enableAdmin()
    const repo = new AppDevKeyRepository(env.AUTH_DB)
    await repo.create(ADMIN, {
      name: '000-list-b',
      email: '000-list-b@example.com'
    })
    await repo.create(ADMIN, {
      name: '000-list-c',
      email: '000-list-c@example.com'
    })
    const first = await (
      await rpcAs(ADMIN, 'GMListAppDevKeys', { page: { pageSize: 1 } })
    ).json<{
      page: {
        before?: string
        after?: string
        hasBefore: boolean
        hasAfter: boolean
        sort: Array<{ column: string; order: string }>
      }
      data: Array<{ id: number; name: string }>
    }>()
    expect(first.data.map(item => item.name)).toEqual(['000-list-b'])
    expect(first.page.hasBefore).toBe(true)
    expect(first.page.hasAfter).toBe(false)
    expect(first.page.sort).toEqual([{ column: 'name', order: 'ASC' }])
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      String(first.data[0].id),
      '000-list-b'
    ])
    expect(first.page.after).toBe(first.page.before)

    // An insertion ahead of the keyset cursor must not shift the next page.
    await repo.create(ADMIN, {
      name: '000-list-a',
      email: '000-list-a@example.com'
    })
    const second = await (
      await rpcAs(ADMIN, 'GMListAppDevKeys', {
        page: { pageSize: 1, before: first.page.after }
      })
    ).json<{
      page: { before?: string; hasBefore: boolean; hasAfter: boolean }
      data: Array<{ id: number; name: string }>
    }>()
    expect(second.data.map(item => item.name)).toEqual(['000-list-c'])
    expect(second.page.hasAfter).toBe(true)

    const previous = await (
      await rpcAs(ADMIN, 'GMListAppDevKeys', {
        page: { pageSize: 1, after: second.page.before }
      })
    ).json<{ data: Array<{ name: string }> }>()
    expect(previous.data.map(item => item.name)).toEqual(['000-list-b'])

    expect(
      (
        await rpcAs(ADMIN, 'GMListAppDevKeys', {
          page: { before: first.page.after, after: first.page.before }
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(ADMIN, 'GMListAppDevKeys', {
          page: { before: 'not-a-cursor' }
        })
      ).status
    ).toBe(400)

    const idDescending = await (
      await rpcAs(ADMIN, 'GMListAppDevKeys', {
        page: {
          pageSize: 500,
          sort: [{ column: 'id', order: 'DESC' }]
        }
      })
    ).json<{
      page: { pageSize: number; before?: string; sort: unknown[] }
      data: Array<{ id: number }>
    }>()
    expect(idDescending.page.pageSize).toBe(200)
    expect(idDescending.page.sort).toEqual([])
    expect(JSON.parse(atob(idDescending.page.before!))).toEqual([
      String(idDescending.data[0].id)
    ])

    expect(
      (
        await rpcAs(ADMIN, 'GMListAppDevKeys', {
          page: { sort: [{ column: 'unknown', order: 'ASC' }] }
        })
      ).status
    ).toBe(400)
  })

  it('issues a source-shaped one-year token and refuses disabled keys', async () => {
    await enableAdmin()
    const created = await (
      await rpcAs(ADMIN, 'GMCreateAppDevKey', {
        req: { name: 'token-key', email: 'token@example.com' }
      })
    ).json<{ appDevKey: { id: number; appKey: string; createdAt: string } }>()
    const response = await (
      await rpcAs(ADMIN, 'GMGetAppDevKeyToken', {
        appDevKeyId: created.appDevKey.id
      })
    ).json<{
      appDevKey: { id: number; appKey: string }
      token: string
    }>()
    expect(response.appDevKey).toMatchObject(created.appDevKey)
    const parts = response.token.split('.')
    expect(parts).toHaveLength(3)
    const claims = JSON.parse(base64UrlDecodeText(parts[1])) as {
      app: { id: number; appKey: string }
      iat: number
      exp: number
    }
    expect(claims.app).toMatchObject(created.appDevKey)
    expect(claims.iat).toBe(
      Math.floor(new Date(created.appDevKey.createdAt).getTime() / 1_000)
    )
    expect(claims.exp - Math.floor(Date.now() / 1_000)).toBeCloseTo(
      APP_DEV_SESSION_SECONDS,
      -1
    )
    // Token management is ported, but partner method scopes remain dormant.
    expect(
      (
        await rpcAs(
          PLAYER,
          'GetAccount',
          { address: 'identity:anyone' },
          false,
          response.token
        )
      ).status
    ).toBe(401)
    expect(
      (
        await rpcAs(ADMIN, 'GMDisableAppDevKey', {
          appDevKeyId: created.appDevKey.id
        })
      ).status
    ).toBe(200)
    expect(
      (
        await rpcAs(ADMIN, 'GMGetAppDevKeyToken', {
          appDevKeyId: created.appDevKey.id
        })
      ).status
    ).toBe(400)
  })

  it('makes key material and audit history immutable', async () => {
    const repo = new AppDevKeyRepository(env.AUTH_DB)
    const key = await repo.create(ADMIN, {
      name: 'immutable-key',
      email: 'immutable@example.com'
    })
    await repo.setDisabled(ADMIN, key.id, true)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_app_dev_key_audit
         WHERE app_dev_key_id = ?`
      )
        .bind(key.id)
        .first('count')
    ).toBe(2)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_app_dev_key_audit
         WHERE app_dev_key_id = ?
           AND (before_json LIKE '%SW01%' OR after_json LIKE '%SW01%')`
      )
        .bind(key.id)
        .first('count')
    ).toBe(0)
    await expect(
      env.AUTH_DB.prepare('UPDATE app_dev_keys SET app_key = ? WHERE id = ?')
        .bind('SW010000000000000000000000000000', key.id)
        .run()
    ).rejects.toThrow('Invalid app developer key transition')
    await expect(
      env.AUTH_DB.prepare('DELETE FROM app_dev_keys WHERE id = ?')
        .bind(key.id)
        .run()
    ).rejects.toThrow('cannot be deleted')
    const auditId = await env.AUTH_DB.prepare(
      `SELECT id FROM staff_app_dev_key_audit
       WHERE app_dev_key_id = ? ORDER BY id LIMIT 1`
    )
      .bind(key.id)
      .first<number>('id')
    await expect(
      env.AUTH_DB.prepare(
        'UPDATE staff_app_dev_key_audit SET actor_user_id = ? WHERE id = ?'
      )
        .bind(PLAYER, auditId)
        .run()
    ).rejects.toThrow('immutable')
    await expect(
      env.AUTH_DB.prepare('DELETE FROM staff_app_dev_key_audit WHERE id = ?')
        .bind(auditId)
        .run()
    ).rejects.toThrow('immutable')
  })
})
