import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { ConquestV2EconomyRepository } from '../src/conquest-v2-economy'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const ADMIN = 'conquest-economy-admin'
const PLAYER = 'conquest-economy-player'

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

const grantAdmin = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_roles
       (user_id, role, granted_by_user_id, reason, created_at)
     VALUES (?, 'ADMIN', NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

const grantConfigWrite = async () => {
  await env.AUTH_DB.prepare(
    `INSERT INTO staff_conquest_config_permissions
       (user_id, granted_by_user_id, reason, created_at)
     VALUES (?, NULL, 'test bootstrap', ?)`
  )
    .bind(ADMIN, new Date().toISOString())
    .run()
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM conquest_v2_pool_cache'),
    env.AUTH_DB.prepare('DELETE FROM users'),
    env.AUTH_DB.prepare(
      `UPDATE conquest_v2_pool_settings
       SET pool_ceiling = 0, pool_floor = 0,
           top_weight_unit_price = 0, bottom_weight_unit_price = 0,
           weight_per_silver_card = 0, version = version + 1,
           mutation_id = ?, updated_by_user_id = 'system:test-reset',
           updated_at = ?
       WHERE singleton = 1`
    ).bind(crypto.randomUUID(), new Date().toISOString())
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Economy Admin', 'economy-admin@example.com', ?, ?),
            (?, 'Economy Player', 'economy-player@example.com', ?, ?)`
  )
    .bind(ADMIN, now, now, PLAYER, now, now)
    .run()
  const players = new PlayerRepository(env.AUTH_DB)
  await players.bootstrap(ADMIN)
  await players.bootstrap(PLAYER)
})

describe('Conquest V2 economy preview', () => {
  it('keeps reads admin-only and writes behind a dormant capability', async () => {
    expect(
      (await rpcAs(ADMIN, 'GMGetConquestV2PoolConfig', {}, false)).status
    ).toBe(401)
    expect((await rpcAs(PLAYER, 'GMGetConquestV2PoolConfig')).status).toBe(403)
    await grantAdmin()
    expect((await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig')).status).toBe(403)
    await grantConfigWrite()
    expect((await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig')).status).toBe(200)
  })

  it('composes source defaults, settings, and final zero fallback exactly', async () => {
    await grantAdmin()
    expect(
      await (await rpcAs(ADMIN, 'GMGetConquestV2PoolConfig')).json()
    ).toEqual({
      config: {
        default: {
          maxPoolCeiling: 5_000,
          poolCeiling: 2_500,
          poolFloor: 100,
          topWeightUnitPrice: 1,
          bottomWeightUnitPrice: 0.9,
          weightPerSilverCard: 0
        },
        settings: {
          poolCeiling: 0,
          poolFloor: 0,
          topWeightUnitPrice: 0,
          bottomWeightUnitPrice: 0,
          weightPerSilverCard: 0
        },
        final: {
          maxPoolCeiling: 5_000,
          poolCeiling: 2_500,
          poolFloor: 100,
          topWeightUnitPrice: 1,
          bottomWeightUnitPrice: 0.9,
          weightPerSilverCard: 0
        }
      }
    })
  })

  it('preserves partial, negative-ignore, zero-reset, and float32 behavior', async () => {
    await grantAdmin()
    await grantConfigWrite()
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig', {
          poolCeiling: 800,
          poolFloor: 4,
          topWeightUnitPrice: 2,
          bottomWeightUnitPrice: 1.8,
          weightPerSilverCard: 0.05
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig', {
          poolCeiling: -1,
          poolFloor: 0,
          topWeightUnitPrice: -3
        })
      ).json()
    ).toEqual({ ok: true })
    const response = await (
      await rpcAs(ADMIN, 'GMGetConquestV2PoolConfig')
    ).json<{
      config: {
        settings: Record<string, number>
        final: Record<string, number>
      }
    }>()
    expect(response.config.settings).toMatchObject({
      poolCeiling: 800,
      poolFloor: 0,
      topWeightUnitPrice: 2,
      bottomWeightUnitPrice: 1.8,
      weightPerSilverCard: 0.05
    })
    expect(response.config.final.poolFloor).toBe(100)
    expect(
      (await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig', { poolCeiling: 1.5 }))
        .status
    ).toBe(400)
    expect(
      await (
        await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig', {
          topWeightUnitPrice: null
        })
      ).json()
    ).toEqual({ ok: true })
  })

  it('recreates all source treasure bands and the rounded pool summary', async () => {
    await grantAdmin()
    await grantConfigWrite()
    await rpcAs(ADMIN, 'GMSetConquestV2PoolConfig', { poolFloor: 1 })
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquest_points
           (user_id, event_id, current_points, total_points, updated_at)
         VALUES (?, 2, 500, 500, ?)`
      ).bind(ADMIN, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquest_points
           (user_id, event_id, current_points, total_points, updated_at)
         VALUES (?, 2, 1000, 1000, ?)`
      ).bind(PLAYER, now)
    ])
    const body = await (
      await rpcAs(ADMIN, 'GMGetConquestV2Summary')
    ).json<{
      summary: {
        pool: number
        totalWeight: number
        weightUnitPrice: number
        treasureLevels: Array<{
          level: number
          numberOfPlayers: number
          totalWeight: number
        }>
      }
    }>()
    expect(body.summary.pool).toBe(1)
    expect(body.summary.totalWeight).toBe(4.19)
    expect(body.summary.weightUnitPrice).toBe(0.2387)
    expect(body.summary.treasureLevels).toHaveLength(10)
    expect(body.summary.treasureLevels.slice(0, 2)).toEqual([
      { level: 1, numberOfPlayers: 1, totalWeight: 1 },
      { level: 2, numberOfPlayers: 1, totalWeight: 3.19 }
    ])
    expect(body.summary.treasureLevels.slice(2)).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        level: index + 3,
        numberOfPlayers: 0,
        totalWeight: 0
      }))
    )
  })

  it('serializes concurrent partial updates and writes immutable audits', async () => {
    const economy = new ConquestV2EconomyRepository(env.AUTH_DB)
    const beforeCount =
      (await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_conquest_config_audit
         WHERE actor_user_id = ?`
      )
        .bind(ADMIN)
        .first<number>('count')) ?? 0
    await Promise.all([
      economy.setConfig(ADMIN, { poolCeiling: 700 }),
      economy.setConfig(ADMIN, { poolFloor: 70 })
    ])
    expect((await economy.config()).settings).toMatchObject({
      poolCeiling: 700,
      poolFloor: 70
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_conquest_config_audit
         WHERE actor_user_id = ?`
      )
        .bind(ADMIN)
        .first('count')
    ).toBe(beforeCount + 2)
    const auditId = await env.AUTH_DB.prepare(
      `SELECT id FROM staff_conquest_config_audit
       WHERE actor_user_id = ? ORDER BY id LIMIT 1`
    )
      .bind(ADMIN)
      .first<number>('id')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE staff_conquest_config_audit SET actor_user_id = ? WHERE id = ?`
      )
        .bind(PLAYER, auditId)
        .run()
    ).rejects.toThrow('immutable')
    await expect(
      env.AUTH_DB.prepare(
        'DELETE FROM staff_conquest_config_audit WHERE id = ?'
      )
        .bind(auditId)
        .run()
    ).rejects.toThrow('immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_v2_pool_settings SET pool_floor = 1
         WHERE singleton = 1`
      ).run()
    ).rejects.toThrow('Invalid Conquest V2 settings transition')
    await expect(
      env.AUTH_DB.prepare(
        'DELETE FROM conquest_v2_pool_settings WHERE singleton = 1'
      ).run()
    ).rejects.toThrow('cannot be deleted')
  })

  it('does not activate the public legacy USDC surface', async () => {
    const economy = new ConquestV2EconomyRepository(env.AUTH_DB)
    await economy.setConfig(ADMIN, { poolFloor: 900, weightPerSilverCard: 3 })
    expect(
      await (await rpcAs(PLAYER, 'ConquestV2Pool', {}, false)).json()
    ).toEqual({ pool: { amount: 0, totalWeight: 0 } })
    const treasures = await (
      await rpcAs(PLAYER, 'ConquestTreasuresInfo', {}, false)
    ).json<{
      treasures: Record<string, { amountSilver: number; amountUSDC: number }>
    }>()
    // Pool settings alone are not an activation switch. Without an immutable
    // reward schedule, even Silver projections remain disabled.
    expect(Object.values(treasures.treasures)).toEqual(
      Array.from({ length: 11 }, () => ({ amountSilver: 0, amountUSDC: 0 }))
    )
  })
})
