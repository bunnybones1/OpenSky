import { env } from 'cloudflare:workers'
import { FeedEventType, ItemType } from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import {
  deliverDueConquestGold,
  pendingConquestCards
} from '../src/conquest-delivery'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'

const testEnv = env as unknown as Env
const USER_ID = 'conquest-delivery-player'
const CREATED_AT = '2026-08-12T12:00:00.000Z'
const DUE_AT = '2026-08-13T12:00:00.000Z'

const rpc = async (method: string, signedIn = true) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      USER_ID,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
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

const setupDelivery = async (
  cardIds = [136],
  tokenIds = cardIds.map(cardId => (2 << 16) + cardId)
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquests
       (entry_key, user_id, status, nonce, mode, hero, deck_class,
        match_progress, created_at, ended_at)
     VALUES ('delivery-conquest', ?, 'COMPLETED', 1,
             'CONQUEST_CONSTRUCTED', 'ADA', 'STR',
             '{"1":"WIN","2":"WIN","3":"WIN"}', ?, ?)`
  )
    .bind(USER_ID, CREATED_AT, CREATED_AT)
    .run()
  const conquest = await env.AUTH_DB.prepare(
    `SELECT id FROM player_conquests WHERE entry_key = 'delivery-conquest'`
  ).first<{ id: number }>()
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquest_gold_deliveries
       (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
        status, attempt_count, created_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 0, ?)`
  )
    .bind(
      conquest!.id,
      USER_ID,
      JSON.stringify(cardIds),
      JSON.stringify(tokenIds),
      DUE_AT,
      CREATED_AT
    )
    .run()
  return conquest!.id
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DROP TRIGGER IF EXISTS reject_gold_delivery').run()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM player_conquest_gold_deliveries'),
    env.AUTH_DB.prepare('DELETE FROM player_conquest_feed_events'),
    env.AUTH_DB.prepare('DELETE FROM player_items'),
    env.AUTH_DB.prepare('DELETE FROM player_conquests'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Gold Weasel', 'gold@example.com', ?, ?)`
  )
    .bind(USER_ID, CREATED_AT, CREATED_AT)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
})

describe('delayed Conquest Gold delivery', () => {
  it('exposes source-shaped pending cards and ownership counters only to the player', async () => {
    await setupDelivery()

    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toMatchObject([
      {
        cards: [{ id: 136, itemType: ItemType.SW_GOLD_CARDS, isNew: true }],
        tokenIDs: [131_208],
        mintAt: DUE_AT
      }
    ])
    expect(await (await rpc('GetPendingCards')).json()).toMatchObject({
      res: [
        {
          cards: [{ id: 136, itemType: ItemType.SW_GOLD_CARDS }],
          tokenIDs: [131_208],
          mintAt: DUE_AT
        }
      ]
    })
    expect((await rpc('GetPendingCards', false)).status).toBe(401)

    const ownership = await new PlayerRpcRepository(env.AUTH_DB).cardOwnership(
      USER_ID
    )
    expect(ownership).toMatchObject({
      pendingCards: 1,
      pendingCardsByClass: { STR: 1 },
      pendingCardsByFrame: { SW_GOLD_CARDS: 1 },
      pendingCardsByClassAndFrame: { STR: { SW_GOLD_CARDS: 1 } }
    })
    expect(ownership.cardBalances[136].SW_GOLD_CARDS.balance).toBe('0')
  })

  it('delivers only when due and makes retries idempotent', async () => {
    const conquestId = await setupDelivery()
    expect(
      await deliverDueConquestGold(
        env.AUTH_DB,
        new Date('2026-08-13T11:59:59.999Z')
      )
    ).toEqual({ delivered: 0, failed: 0, remaining: 0 })

    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 1, failed: 0, remaining: 0 })
    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 0, failed: 0, remaining: 0 })

    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, balance, is_new, unlock_source
         FROM player_items WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS'`
      )
        .bind(USER_ID)
        .first()
    ).toEqual({
      item_type: ItemType.SW_GOLD_CARDS,
      token_id: 136,
      balance: 1,
      is_new: 1,
      unlock_source: `conquest:${conquestId}:gold`
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, delivery_key, delivered_at
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first<{ status: string; delivery_key: string | null }>()
    ).toMatchObject({
      status: 'DELIVERED',
      attempt_count: 1,
      delivered_at: DUE_AT,
      delivery_key: expect.any(String)
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT event_type, token_ids_json FROM player_conquest_feed_events
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      event_type: 'DELAYED_REWARD_MINTED',
      token_ids_json: '[131208]'
    })
    expect(
      await new PlayerRpcRepository(env.AUTH_DB).feed(
        `identity:${USER_ID}`,
        undefined,
        [FeedEventType.DELAYED_REWARD_MINTED]
      )
    ).toMatchObject({
      res: [{ type: 'DELAYED_REWARD_MINTED', tokenIds: [131_208] }]
    })
    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toEqual([])
  })

  it('allows only one concurrent cron run to claim and grant a delivery', async () => {
    await setupDelivery()
    const runs = await Promise.all([
      deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT)),
      deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ])
    expect(runs.reduce((sum, run) => sum + run.delivered, 0)).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS' AND token_id = 136`
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ balance: 1 })
  })

  it('rolls back an injected grant failure and dead-letters after five tries', async () => {
    const conquestId = await setupDelivery()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_gold_delivery
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'conquest:%:gold'
       BEGIN
         SELECT RAISE(ABORT, 'injected delayed Gold failure');
       END`
    ).run()

    for (let attempt = 1; attempt <= 5; attempt++) {
      const run = await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
      expect(run.delivered).toBe(0)
      expect(run.failed).toBe(1)
      expect(
        await env.AUTH_DB.prepare(
          `SELECT status, attempt_count, delivery_key, delivered_at
           FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
        )
          .bind(conquestId)
          .first()
      ).toEqual({
        status: attempt === 5 ? 'FAILED' : 'PENDING',
        attempt_count: attempt,
        delivery_key: null,
        delivered_at: null
      })
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_items
            WHERE item_type = 'SW_GOLD_CARDS') AS items,
           (SELECT COUNT(*) FROM player_conquest_feed_events
            WHERE event_type = 'DELAYED_REWARD_MINTED') AS events`
      ).first()
    ).toEqual({ items: 0, events: 0 })
    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toEqual([])
  })

  it('fails malformed persisted card mappings closed without granting', async () => {
    const conquestId = await setupDelivery([999_999])
    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 0, failed: 1, remaining: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, last_error
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      status: 'PENDING',
      attempt_count: 1,
      last_error: 'Conquest Gold delivery contains invalid cards'
    })
  })
})
