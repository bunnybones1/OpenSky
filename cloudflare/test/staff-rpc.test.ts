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
const ADMIN = 'staff-admin'
const PLAYER = 'staff-player'

const rpcAs = async (
  userId: string,
  method: string,
  body: object = {},
  signedIn = true
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
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

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Staff Admin', 'staff-admin@example.com', ?, ?),
            (?, 'Staff Player', 'staff-player@example.com', ?, ?)`
  )
    .bind(ADMIN, now, now, PLAYER, now, now)
    .run()
  const players = new PlayerRepository(env.AUTH_DB)
  await players.bootstrap(ADMIN)
  await players.bootstrap(PLAYER)
})

const grantAdmin = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

describe('fail-closed Google identity staff authorization', () => {
  it('distinguishes missing authentication from a signed-in non-admin', async () => {
    expect((await rpcAs(PLAYER, 'GMStats', {}, false)).status).toBe(401)
    const response = await rpcAs(PLAYER, 'GMStats')
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      code: 'webrpc.permission_denied',
      msg: 'admin access required',
      status: 403
    })
  })

  it('lets only an explicitly seeded admin read source account counts', async () => {
    await grantAdmin()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED' WHERE user_id = ?`
    )
      .bind(PLAYER)
      .run()

    const response = await rpcAs(ADMIN, 'GMStats')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      stats: {
        total_active_users: 1,
        total_suspended_users: 0,
        total_banned_users: 0,
        total_vip_users: 0,
        total_flagged_users: 1,
        total_to_delete_users: 0
      }
    })
  })

  it('supports the original admin UI authorization probe without exposing actions', async () => {
    await grantAdmin()
    const response = await rpcAs(ADMIN, 'GMIsAccountBanned', {
      account: `identity:${PLAYER}`
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      banned: false,
      status: 'ACTIVE',
      accountActions: []
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMIsAccountBanned', {
          account: 'identity:missing'
        })
      ).status
    ).toBe(404)
  })

  it('keeps source-unimplemented admin account RPCs behind the role check', async () => {
    expect((await rpcAs(PLAYER, 'AdminListAccounts')).status).toBe(403)
    await grantAdmin()
    expect((await rpcAs(ADMIN, 'AdminListAccounts')).status).toBe(501)
    expect((await rpcAs(ADMIN, 'AdminSearchAccounts')).status).toBe(501)
  })

  it('finds accounts by source name, address field, and preserved identity route', async () => {
    expect(
      (
        await rpcAs(PLAYER, 'GMFindAccount', {
          name: 'Staff Player'
        })
      ).status
    ).toBe(403)
    await grantAdmin()
    for (const body of [
      { name: 'Staff Player' },
      { accountAddress: `identity:${PLAYER}` },
      { name: `identity:${PLAYER}` }
    ]) {
      const response = await rpcAs(ADMIN, 'GMFindAccount', body)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        account: {
          address: `identity:${PLAYER}`,
          name: 'Staff Player',
          settings: { requestMoreInvites: false }
        }
      })
    }
    expect((await rpcAs(ADMIN, 'GMFindAccount')).status).toBe(400)
    expect(
      (await rpcAs(ADMIN, 'GMFindAccount', { name: 'Missing Player' })).status
    ).toBe(404)
  })

  it('lists filtered staff account rows with source-shaped cursor metadata', async () => {
    expect((await rpcAs(PLAYER, 'GMListAccounts')).status).toBe(403)
    await grantAdmin()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED' WHERE user_id = ?`
    )
      .bind(PLAYER)
      .run()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I'
       WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'`
    )
      .bind(PLAYER)
      .run()

    const filtered = await rpcAs(ADMIN, 'GMListAccounts', {
      page: {
        pageSize: 1,
        sort: [{ column: 'created_at', order: 'DESC' }]
      },
      accountStatus: ['FLAGGED'],
      conquestsUnlocked: true
    })
    expect(filtered.status).toBe(200)
    const body = (await filtered.json()) as {
      page: { pageSize: number; hasBefore: boolean; hasAfter: boolean }
      accounts: Array<{
        account: { address: string }
        conquestsUnlocked: boolean
        accountActions: unknown[]
        ipHistory: unknown[]
      }>
    }
    expect(body.page).toMatchObject({
      pageSize: 1,
      hasBefore: false,
      hasAfter: false
    })
    expect(body.accounts).toEqual([
      expect.objectContaining({
        account: expect.objectContaining({ address: `identity:${PLAYER}` }),
        conquestsUnlocked: true,
        accountActions: [],
        ipHistory: []
      })
    ])

    expect(
      await (
        await rpcAs(ADMIN, 'GMListAccounts', {
          accountActions: ['BANNED']
        })
      ).json()
    ).toMatchObject({ accounts: [] })
  })

  it('paginates account rows and rejects unsafe filters and sort columns', async () => {
    await grantAdmin()
    const first = (await (
      await rpcAs(ADMIN, 'GMListAccounts', { page: { pageSize: 1 } })
    ).json()) as { page: { after: string; hasBefore: boolean } }
    expect(first.page.hasBefore).toBe(true)
    const second = await rpcAs(ADMIN, 'GMListAccounts', {
      page: { pageSize: 1, before: first.page.after }
    })
    expect(await second.json()).toMatchObject({
      page: { hasBefore: false, hasAfter: true }
    })
    expect(
      (
        await rpcAs(ADMIN, 'GMListAccounts', {
          page: { sort: [{ column: 'primary_email', order: 'ASC' }] }
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpcAs(ADMIN, 'GMListAccounts', {
          createdBefore: 'not-a-date'
        })
      ).status
    ).toBe(400)
  })
})
