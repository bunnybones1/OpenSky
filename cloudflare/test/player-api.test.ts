import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { handlePlayerRequest } from '../src/player-api'

const testEnv = env as unknown as Env
const userId = 'player-user-id'

const request = async (path: string, init?: RequestInit, signedIn = true) => {
  const headers = new Headers(init?.headers)
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handlePlayerRequest(
    new Request(`https://opensky.example${path}`, { ...init, headers }),
    testEnv
  )
}

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM wallet_connections'),
    env.AUTH_DB.prepare('DELETE FROM auth_identities'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Cloud Weasel Player', 'player@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
})

describe('Cloudflare player API', () => {
  it('provisions a wallet-free starter player', async () => {
    const response = await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    expect(response.status).toBe(200)
    const body = await response.json<{
      created: boolean
      player: {
        profile: { level: number }
        basicSkyPass: { level: number }
        quests: unknown[]
        collection: { basicCardCount: number }
        decks: Array<{ name: string; cardCount: number }>
      }
    }>()
    expect(body.created).toBe(true)
    expect(body.player.profile.level).toBe(1)
    expect(body.player.basicSkyPass.level).toBe(1)
    expect(body.player.quests).toHaveLength(3)
    expect(body.player.collection.basicCardCount).toBe(30)
    expect(body.player.decks).toEqual([
      expect.objectContaining({ name: 'Ada Starter', cardCount: 30 })
    ])

    const wallets = await env.AUTH_DB.prepare(
      'SELECT COUNT(*) AS count FROM wallet_connections WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(wallets?.count).toBe(0)
  })

  it('is idempotent when the player returns', async () => {
    const init = {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    }
    const first = await request('/api/player/bootstrap', init)
    const second = await request('/api/player/bootstrap', init)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await first.json()).toMatchObject({ created: true })
    expect(await second.json()).toMatchObject({ created: false })

    const [profiles, cards, decks, items] = await Promise.all([
      env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_profiles WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ count: number }>(),
      env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_card_unlocks WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ count: number }>(),
      env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_decks WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ count: number }>(),
      env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_items WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ count: number }>()
    ])
    expect(profiles?.count).toBe(1)
    expect(cards?.count).toBe(30)
    expect(decks?.count).toBe(5)
    expect(items?.count).toBe(31)
  })

  it('requires an identity session', async () => {
    const response = await request('/api/player/state', undefined, false)
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 'player.unauthorized' })
  })

  it('rejects a cross-origin bootstrap', async () => {
    const response = await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example' }
    })
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: 'player.forbidden' })
  })
})
