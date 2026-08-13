import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_silver_exchange_completion'
  ).run()
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_hero_exchange_completion'
  ).run()
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

afterEach(async () => {
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_silver_exchange_completion'
  ).run()
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_hero_exchange_completion'
  ).run()
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

  it('atomically exchanges source-priced Silver cards for off-chain tickets', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_SILVER_CARDS', 42, 2, 1, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_SILVER_CARDS', 43, 1, 1, 'test', ?, ?)`
      ).bind(userId, now, now)
    ])
    const input = {
      requestKey: 'silver-exchange-request-0001',
      cards: [
        { tokenId: 43, quantity: 1 },
        { tokenId: 42, quantity: 2 }
      ]
    }
    const exchange = () =>
      request('/api/player/exchanges/silver-tickets', {
        method: 'POST',
        headers: {
          Origin: 'https://opensky.example',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })

    const [first, simultaneousRetry] = await Promise.all([
      exchange(),
      exchange()
    ])
    expect([first.status, simultaneousRetry.status]).toEqual([200, 200])
    expect(await first.json()).toMatchObject({
      exchange: {
        cards: [
          { tokenId: 42, quantity: 2 },
          { tokenId: 43, quantity: 1 }
        ],
        tickets: 3
      }
    })
    const retry = await exchange()
    expect(retry.status).toBe(200)

    const inventory = await env.AUTH_DB.prepare(
      `SELECT item_type, token_id, balance FROM player_items
       WHERE user_id = ? AND (
         item_type = 'SW_CONQUEST_TICKET' OR
         (item_type = 'SW_SILVER_CARDS' AND token_id IN (42, 43))
       ) ORDER BY item_type, token_id`
    )
      .bind(userId)
      .all<{ item_type: string; token_id: number; balance: number }>()
    expect(inventory.results).toEqual([
      { item_type: 'SW_CONQUEST_TICKET', token_id: 2, balance: 3 },
      { item_type: 'SW_SILVER_CARDS', token_id: 42, balance: 0 },
      { item_type: 'SW_SILVER_CARDS', token_id: 43, balance: 0 }
    ])
    const receipt = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count, COUNT(DISTINCT delivery_key) AS keys,
              MIN(application_status) AS application_status,
              MIN(completed_at) AS completed_at
       FROM player_silver_ticket_exchanges WHERE user_id = ?`
    )
      .bind(userId)
      .first<{
        count: number
        keys: number
        application_status: string
        completed_at: string
      }>()
    expect(receipt).toMatchObject({
      count: 1,
      keys: 1,
      application_status: 'APPLIED',
      completed_at: expect.any(String)
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, change_amount, before_balance,
                after_balance
         FROM player_silver_ticket_exchange_inventory_changes
         ORDER BY item_type, token_id`
      ).all()
    ).toMatchObject({
      results: [
        {
          item_type: 'SW_CONQUEST_TICKET',
          token_id: 2,
          change_amount: 3,
          before_balance: 0,
          after_balance: 3
        },
        {
          item_type: 'SW_SILVER_CARDS',
          token_id: 42,
          change_amount: -2,
          before_balance: 2,
          after_balance: 0
        },
        {
          item_type: 'SW_SILVER_CARDS',
          token_id: 43,
          change_amount: -1,
          before_balance: 1,
          after_balance: 0
        }
      ]
    })
  })

  it('rolls back and retries a Silver exchange if receipt completion fails', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_SILVER_CARDS', 77, 2, 1, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_silver_exchange_completion
       BEFORE UPDATE OF application_status ON player_silver_ticket_exchanges
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected Silver receipt failure');
       END`
    ).run()
    const input = {
      requestKey: 'silver-exchange-rollback-0001',
      cards: [{ tokenId: 77, quantity: 2 }]
    }
    const exchange = () =>
      request('/api/player/exchanges/silver-tickets', {
        method: 'POST',
        headers: {
          Origin: 'https://opensky.example',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })

    expect((await exchange()).status).toBe(500)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_silver_ticket_exchanges) AS exchanges,
           (SELECT COUNT(*)
            FROM player_silver_ticket_exchange_inventory_changes) AS changes,
           (SELECT balance FROM player_items WHERE user_id = ?
            AND item_type = 'SW_SILVER_CARDS' AND token_id = 77) AS silver,
           (SELECT COUNT(*) FROM player_items WHERE user_id = ?
            AND item_type = 'SW_CONQUEST_TICKET') AS tickets`
      )
        .bind(userId, userId)
        .first()
    ).toEqual({ exchanges: 0, changes: 0, silver: 2, tickets: 0 })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_silver_exchange_completion'
    ).run()
    expect((await exchange()).status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, balance FROM player_items
         WHERE user_id = ? AND (
           (item_type = 'SW_SILVER_CARDS' AND token_id = 77)
           OR item_type = 'SW_CONQUEST_TICKET'
         ) ORDER BY item_type`
      )
        .bind(userId)
        .all()
    ).toMatchObject({
      results: [
        { item_type: 'SW_CONQUEST_TICKET', token_id: 2, balance: 2 },
        { item_type: 'SW_SILVER_CARDS', token_id: 77, balance: 0 }
      ]
    })
  })

  it('rejects tampering with applied Silver exchange evidence', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_SILVER_CARDS', 88, 1, 1, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()
    const response = await request('/api/player/exchanges/silver-tickets', {
      method: 'POST',
      headers: {
        Origin: 'https://opensky.example',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestKey: 'silver-exchange-tamper-0001',
        cards: [{ tokenId: 88, quantity: 1 }]
      })
    })
    expect(response.status).toBe(200)

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_silver_ticket_exchanges SET ticket_amount = 2`
      ).run()
    ).rejects.toThrow('Silver exchange receipt completion is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_silver_ticket_exchange_inventory_changes
         SET after_balance = after_balance + 1`
      ).run()
    ).rejects.toThrow('Silver exchange inventory receipts are immutable')
  })

  it('rejects insufficient, reused, cross-origin, and concurrent exchanges safely', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_SILVER_CARDS', 99, 1, 1, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()
    const exchange = (requestKey: string, quantity = 1, origin = 'https://opensky.example') =>
      request('/api/player/exchanges/silver-tickets', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestKey,
          cards: [{ tokenId: 99, quantity }]
        })
      })

    expect((await exchange('silver-cross-origin-0001', 1, 'https://evil.example')).status).toBe(403)
    expect((await exchange('silver-insufficient-0001', 2)).status).toBe(400)

    const concurrent = await Promise.all([
      exchange('silver-concurrent-0001'),
      exchange('silver-concurrent-0002')
    ])
    expect(concurrent.map(response => response.status).sort()).toEqual([200, 400])
    const ticket = await env.AUTH_DB.prepare(
      `SELECT balance FROM player_items WHERE user_id = ?
       AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
    )
      .bind(userId)
      .first<{ balance: number }>()
    expect(ticket?.balance).toBe(1)

    const winningRequest =
      concurrent[0].status === 200
        ? 'silver-concurrent-0001'
        : 'silver-concurrent-0002'
    expect((await exchange(winningRequest, 2)).status).toBe(400)
    const receipts = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_silver_ticket_exchanges
       WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(receipts?.count).toBe(1)
  })

  it('replaces the source Hero mint with an atomic off-chain Gold exchange', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_GOLD_CARDS', 42, 12, 1, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_GOLD_CARDS', 43, 8, 1, 'test', ?, ?)`
      ).bind(userId, now, now)
    ])
    const input = {
      requestKey: 'hero-exchange-request-0001',
      goldCards: [
        { tokenId: 43, quantity: 8 },
        { tokenId: 42, quantity: 12 }
      ],
      heroSkins: [
        { tokenId: 2, quantity: 1 },
        { tokenId: 1, quantity: 1 }
      ]
    }
    const exchange = () =>
      request('/api/player/exchanges/gold-hero-skins', {
        method: 'POST',
        headers: {
          Origin: 'https://opensky.example',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })

    const [first, simultaneousRetry] = await Promise.all([
      exchange(),
      exchange()
    ])
    expect([first.status, simultaneousRetry.status]).toEqual([200, 200])
    expect(await first.json()).toMatchObject({
      exchange: {
        goldCards: [
          { tokenId: 42, quantity: 12 },
          { tokenId: 43, quantity: 8 }
        ],
        heroSkins: [
          { tokenId: 1, quantity: 1 },
          { tokenId: 2, quantity: 1 }
        ],
        goldCardsSpent: 20,
        heroSkinsGranted: 2
      }
    })
    expect((await exchange()).status).toBe(200)

    const inventory = await env.AUTH_DB.prepare(
      `SELECT item_type, token_id, balance FROM player_items
       WHERE user_id = ? AND (
         item_type = 'SW_HERO_SKINS' OR
         (item_type = 'SW_GOLD_CARDS' AND token_id IN (42, 43))
       ) ORDER BY item_type, token_id`
    )
      .bind(userId)
      .all<{ item_type: string; token_id: number; balance: number }>()
    expect(inventory.results).toEqual([
      { item_type: 'SW_GOLD_CARDS', token_id: 42, balance: 0 },
      { item_type: 'SW_GOLD_CARDS', token_id: 43, balance: 0 },
      { item_type: 'SW_HERO_SKINS', token_id: 1, balance: 1 },
      { item_type: 'SW_HERO_SKINS', token_id: 2, balance: 1 }
    ])
    const receipt = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count, COUNT(DISTINCT delivery_key) AS keys,
              MIN(application_status) AS application_status,
              MIN(completed_at) AS completed_at
       FROM player_hero_skin_exchanges WHERE user_id = ?`
    )
      .bind(userId)
      .first<{
        count: number
        keys: number
        application_status: string
        completed_at: string
      }>()
    expect(receipt).toMatchObject({
      count: 1,
      keys: 1,
      application_status: 'APPLIED',
      completed_at: expect.any(String)
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, change_amount, before_balance,
                after_balance
         FROM player_hero_skin_exchange_inventory_changes
         ORDER BY item_type, token_id`
      ).all()
    ).toMatchObject({
      results: [
        {
          item_type: 'SW_GOLD_CARDS',
          token_id: 42,
          change_amount: -12,
          before_balance: 12,
          after_balance: 0
        },
        {
          item_type: 'SW_GOLD_CARDS',
          token_id: 43,
          change_amount: -8,
          before_balance: 8,
          after_balance: 0
        },
        {
          item_type: 'SW_HERO_SKINS',
          token_id: 1,
          change_amount: 1,
          before_balance: 0,
          after_balance: 1
        },
        {
          item_type: 'SW_HERO_SKINS',
          token_id: 2,
          change_amount: 1,
          before_balance: 0,
          after_balance: 1
        }
      ]
    })
  })

  it('rolls back and retries a Hero exchange if receipt completion fails', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_GOLD_CARDS', 77, 10, 1, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_hero_exchange_completion
       BEFORE UPDATE OF application_status ON player_hero_skin_exchanges
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected Hero receipt failure');
       END`
    ).run()
    const input = {
      requestKey: 'hero-exchange-rollback-0001',
      goldCards: [{ tokenId: 77, quantity: 10 }],
      heroSkins: [{ tokenId: 1, quantity: 1 }]
    }
    const exchange = () =>
      request('/api/player/exchanges/gold-hero-skins', {
        method: 'POST',
        headers: {
          Origin: 'https://opensky.example',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })

    expect((await exchange()).status).toBe(500)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_hero_skin_exchanges) AS exchanges,
           (SELECT COUNT(*)
            FROM player_hero_skin_exchange_inventory_changes) AS changes,
           (SELECT balance FROM player_items WHERE user_id = ?
            AND item_type = 'SW_GOLD_CARDS' AND token_id = 77) AS gold,
           (SELECT COUNT(*) FROM player_items WHERE user_id = ?
            AND item_type = 'SW_HERO_SKINS') AS skins`
      )
        .bind(userId, userId)
        .first()
    ).toEqual({ exchanges: 0, changes: 0, gold: 10, skins: 0 })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_hero_exchange_completion'
    ).run()
    expect((await exchange()).status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, balance FROM player_items
         WHERE user_id = ? AND (
           (item_type = 'SW_GOLD_CARDS' AND token_id = 77)
           OR (item_type = 'SW_HERO_SKINS' AND token_id = 1)
         ) ORDER BY item_type`
      )
        .bind(userId)
        .all()
    ).toMatchObject({
      results: [
        { item_type: 'SW_GOLD_CARDS', token_id: 77, balance: 0 },
        { item_type: 'SW_HERO_SKINS', token_id: 1, balance: 1 }
      ]
    })
  })

  it('rejects tampering with applied Hero exchange evidence', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_GOLD_CARDS', 88, 10, 1, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()
    const response = await request('/api/player/exchanges/gold-hero-skins', {
      method: 'POST',
      headers: {
        Origin: 'https://opensky.example',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestKey: 'hero-exchange-tamper-0001',
        goldCards: [{ tokenId: 88, quantity: 10 }],
        heroSkins: [{ tokenId: 1, quantity: 1 }]
      })
    })
    expect(response.status).toBe(200)

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_hero_skin_exchanges SET hero_skin_amount = 2`
      ).run()
    ).rejects.toThrow('Hero skin exchange receipt completion is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_hero_skin_exchange_inventory_changes
         SET after_balance = after_balance + 1`
      ).run()
    ).rejects.toThrow('Hero skin exchange inventory receipts are immutable')
  })

  it('rejects invalid Hero rewards and concurrent Gold spends safely', async () => {
    await request('/api/player/bootstrap', {
      method: 'POST',
      headers: { Origin: 'https://opensky.example' }
    })
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_GOLD_CARDS', 99, 10, 1, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()
    const exchange = (
      requestKey: string,
      heroTokenId = 1,
      goldQuantity = 10,
      origin = 'https://opensky.example'
    ) =>
      request('/api/player/exchanges/gold-hero-skins', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestKey,
          goldCards: [{ tokenId: 99, quantity: goldQuantity }],
          heroSkins: [{ tokenId: heroTokenId, quantity: 1 }]
        })
      })

    expect(
      (
        await exchange(
          'hero-cross-origin-0001',
          1,
          10,
          'https://evil.example'
        )
      ).status
    ).toBe(403)
    expect((await exchange('hero-invalid-id-0001', 999999)).status).toBe(400)
    expect((await exchange('hero-wrong-price-0001', 1, 9)).status).toBe(400)

    const concurrent = await Promise.all([
      exchange('hero-concurrent-0001'),
      exchange('hero-concurrent-0002')
    ])
    expect(concurrent.map(response => response.status).sort()).toEqual([200, 400])
    const skins = await env.AUTH_DB.prepare(
      `SELECT COALESCE(SUM(balance), 0) AS balance FROM player_items
       WHERE user_id = ? AND item_type = 'SW_HERO_SKINS'`
    )
      .bind(userId)
      .first<{ balance: number }>()
    expect(skins?.balance).toBe(1)
    const winningRequest =
      concurrent[0].status === 200
        ? 'hero-concurrent-0001'
        : 'hero-concurrent-0002'
    expect((await exchange(winningRequest, 2)).status).toBe(400)
    const receipts = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_hero_skin_exchanges
       WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(receipts?.count).toBe(1)
  })
})
