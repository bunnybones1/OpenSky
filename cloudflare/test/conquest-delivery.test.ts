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
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_gold_receipt_completion'
  ).run()
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

  it('keeps moderated Gold visible while blocking a read-to-claim race', async () => {
    const conquestId = await setupDelivery()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED', updated_at = ? WHERE user_id = ?`
    )
      .bind(CREATED_AT, USER_ID)
      .run()

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_deliveries
         SET application_status = 'PREPARING',
             application_key = '00000000-0000-4000-8000-000000000001'
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('Conquest Gold delivery is blocked by account status')

    await env.AUTH_DB.prepare(
      `UPDATE player_conquest_gold_deliveries SET status = 'DISABLED'
       WHERE conquest_id = ?`
    )
      .bind(conquestId)
      .run()
    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toMatchObject([
      { tokenIDs: [131_208], mintAt: DUE_AT }
    ])
    expect(await (await rpc('GetPendingCards')).json()).toMatchObject({
      res: [{ tokenIDs: [131_208], mintAt: DUE_AT }]
    })
    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 0, failed: 0, remaining: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items
         WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS'`
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ count: 0 })

    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_account_settings
         SET account_status = 'ACTIVE', updated_at = ? WHERE user_id = ?`
      ).bind(DUE_AT, USER_ID),
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_deliveries SET status = 'PENDING'
         WHERE conquest_id = ?`
      ).bind(conquestId)
    ])
    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 1, failed: 0, remaining: 0 })
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
        `SELECT status, attempt_count, delivery_key, delivered_at,
                application_status, application_key,
                application_completed_at
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first<{ status: string; delivery_key: string | null }>()
    ).toMatchObject({
      status: 'DELIVERED',
      attempt_count: 1,
      delivered_at: DUE_AT,
      delivery_key: expect.any(String),
      application_status: 'APPLIED',
      application_key: expect.any(String),
      application_completed_at: DUE_AT
    })
    const deliveryReceipt = await env.AUTH_DB.prepare(
      `SELECT delivery_key, application_key
       FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
    )
      .bind(conquestId)
      .first<{ delivery_key: string; application_key: string }>()
    expect(deliveryReceipt!.delivery_key).toBe(deliveryReceipt!.application_key)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, card_id, quantity, before_balance, after_balance
         FROM player_conquest_gold_delivery_inventory_grants
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      item_type: ItemType.SW_GOLD_CARDS,
      card_id: 136,
      quantity: 1,
      before_balance: 0,
      after_balance: 1
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

  it('records the serialized Gold balance transition over existing inventory', async () => {
    const conquestId = await setupDelivery()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_GOLD_CARDS', 136, 3, 0, 'prior-reward', ?, ?)`
    )
      .bind(USER_ID, CREATED_AT, CREATED_AT)
      .run()

    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 1, failed: 0, remaining: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT quantity, before_balance, after_balance
         FROM player_conquest_gold_delivery_inventory_grants
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({ quantity: 1, before_balance: 3, after_balance: 4 })
  })

  it('keeps applied delivery and grant receipts immutable', async () => {
    const conquestId = await setupDelivery()
    await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_deliveries
         SET attempt_count = attempt_count + 1 WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('Conquest Gold delivery transition is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_delivery_inventory_grants
         SET after_balance = after_balance + 1 WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('Conquest Gold grant receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_feed_events SET token_ids_json = '[131209]'
         WHERE conquest_id = ? AND event_type = 'DELAYED_REWARD_MINTED'`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('Conquest Gold delivery feed receipts are immutable')
  })

  it('rolls back inventory and feed when final receipt validation fails, then retries', async () => {
    const conquestId = await setupDelivery()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_gold_receipt_completion
       BEFORE UPDATE OF application_status ON player_conquest_gold_deliveries
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected Gold receipt failure');
       END`
    ).run()

    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 0, failed: 1, remaining: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, application_status, application_key
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      status: 'PENDING',
      attempt_count: 1,
      application_status: 'READY',
      application_key: null
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_items
            WHERE item_type = 'SW_GOLD_CARDS') AS items,
           (SELECT COUNT(*)
            FROM player_conquest_gold_delivery_inventory_grants) AS grants,
           (SELECT COUNT(*) FROM player_conquest_feed_events
            WHERE event_type = 'DELAYED_REWARD_MINTED') AS events`
      ).first()
    ).toEqual({ items: 0, grants: 0, events: 0 })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_gold_receipt_completion'
    ).run()
    expect(
      await deliverDueConquestGold(env.AUTH_DB, new Date(DUE_AT))
    ).toEqual({ delivered: 1, failed: 0, remaining: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, application_status
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      status: 'DELIVERED',
      attempt_count: 2,
      application_status: 'APPLIED'
    })
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
