import { env } from 'cloudflare:workers'
import { FeedEventType, ItemType } from '@opensky/proto'
import type { ConquestGoldDeliveryQueueMessage } from '@opensky/shared/conquest-gold-delivery'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import {
  applyConquestGoldDeliveryQueueMessage,
  dispatchDueConquestGoldDeliveries,
  handleConquestGoldDeliveryQueue,
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

const deliveryBody = (
  conquestId: number
): ConquestGoldDeliveryQueueMessage => ({
  kind: 'CONQUEST_GOLD',
  version: 1,
  conquestId
})

const applyDelivery = (conquestId: number, now = new Date(DUE_AT)) =>
  applyConquestGoldDeliveryQueueMessage(
    env.AUTH_DB,
    deliveryBody(conquestId),
    now
  )

const queueMessage = (
  body: ConquestGoldDeliveryQueueMessage,
  id: string,
  attempts: number
) => {
  const outcome: {
    acked: boolean
    retried: boolean
    delaySeconds?: number
  } = { acked: false, retried: false }
  const message = {
    id,
    timestamp: new Date(DUE_AT),
    body,
    attempts,
    ack: () => {
      outcome.acked = true
    },
    retry: (options?: { delaySeconds?: number }) => {
      outcome.retried = true
      outcome.delaySeconds = options?.delaySeconds
    }
  } as Message<ConquestGoldDeliveryQueueMessage>
  return { message, outcome }
}

const messageBatch = (messages: Message<ConquestGoldDeliveryQueueMessage>[]) =>
  ({
    messages,
    queue: 'cloud-weasel-conquest-gold-delivery',
    metadata: {
      metrics: { backlogCount: messages.length, backlogBytes: 0 }
    },
    ackAll: () => undefined,
    retryAll: () => undefined
  }) as MessageBatch<ConquestGoldDeliveryQueueMessage>

beforeEach(async () => {
  await env.AUTH_DB.prepare('DROP TRIGGER IF EXISTS reject_gold_delivery').run()
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_one_gold_queue_player'
  ).run()
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
        cards: [{ id: 136, itemType: ItemType.UNKNOWN, isNew: null }],
        tokenIDs: [131_208],
        mintAt: DUE_AT
      }
    ])
    const response = await (
      await rpc('GetPendingCards')
    ).json<{
      res: Array<{ cards: Array<Record<string, unknown>> }>
    }>()
    expect(response).toMatchObject({
      res: [
        {
          cards: [{ id: 136, itemType: ItemType.UNKNOWN, isNew: null }],
          tokenIDs: [131_208],
          mintAt: DUE_AT
        }
      ]
    })
    expect(Object.keys(response.res[0].cards[0])).toEqual([
      'id',
      'name',
      'description',
      'asset',
      'class',
      'element',
      'type',
      'manaCost',
      'power',
      'health',
      'attachedSpellID',
      'keywords',
      'status',
      'set',
      'imageURL',
      'itemType',
      'isNew',
      'silverCardTokenId',
      'goldCardTokenId'
    ])
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

  it('preserves the source nil result when no delayed task exists', async () => {
    expect(await (await rpc('GetPendingCards')).json()).toStrictEqual({
      res: null
    })
  })

  it('returns every source task token while skipping invalid card projections', async () => {
    const silverCard = (1 << 16) + 136
    const heroSkin = (3 << 16) + 136
    const missingGoldCard = (2 << 16) + 65_535
    const conquestId = await setupDelivery(
      [136, 136, 65_535],
      [silverCard, heroSkin, missingGoldCard]
    )

    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toMatchObject([
      {
        cards: [{ id: 136, itemType: ItemType.UNKNOWN, isNew: null }],
        tokenIDs: [silverCard, heroSkin, missingGoldCard],
        mintAt: DUE_AT
      }
    ])
    expect(await (await rpc('GetPendingCards')).json()).toMatchObject({
      res: [
        {
          cards: [{ id: 136, itemType: ItemType.UNKNOWN, isNew: null }],
          tokenIDs: [silverCard, heroSkin, missingGoldCard],
          mintAt: DUE_AT
        }
      ]
    })

    const ownership = await new PlayerRpcRepository(env.AUTH_DB).cardOwnership(
      USER_ID
    )
    expect(ownership).toMatchObject({
      pendingCards: 1,
      pendingCardsByClass: { STR: 1 },
      pendingCardsByFrame: {
        SW_SILVER_CARDS: 1,
        SW_GOLD_CARDS: 0
      },
      pendingCardsByClassAndFrame: {
        STR: { SW_SILVER_CARDS: 1, SW_GOLD_CARDS: 0 }
      }
    })

    // Read compatibility must not weaken the off-chain grant boundary. The
    // malformed Gold row remains retryable but grants no inventory.
    const malformed = queueMessage(
      deliveryBody(conquestId),
      'malformed-projection',
      1
    )
    await handleConquestGoldDeliveryQueue(
      messageBatch([malformed.message]),
      env.AUTH_DB,
      new Date(DUE_AT)
    )
    expect(malformed.outcome).toEqual({
      acked: false,
      retried: true,
      delaySeconds: undefined
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count FROM player_conquest_gold_deliveries
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({ status: 'PENDING', attempt_count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items
         WHERE user_id = ? AND item_type IN ('SW_SILVER_CARDS', 'SW_GOLD_CARDS')`
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ count: 0 })
  })

  it('keeps moderated Gold visible while blocking a read-to-claim race', async () => {
    const conquestId = await setupDelivery()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'FLAGGED', updated_at = ? WHERE user_id = ?`
    )
      .bind(CREATED_AT, USER_ID)
      .run()

    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_conquest_gold_deliveries
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({ status: 'DISABLED' })

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
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_deliveries SET status = 'PENDING'
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('Conquest Gold moderation state is invalid')
    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toMatchObject([
      { tokenIDs: [131_208], mintAt: DUE_AT }
    ])
    expect(await (await rpc('GetPendingCards')).json()).toMatchObject({
      res: [{ tokenIDs: [131_208], mintAt: DUE_AT }]
    })
    expect(await applyDelivery(conquestId)).toBe('disabled')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items
         WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS'`
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ count: 0 })

    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings
       SET account_status = 'ACTIVE', updated_at = ? WHERE user_id = ?`
    )
      .bind(DUE_AT, USER_ID)
      .run()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_conquest_gold_deliveries
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({ status: 'PENDING' })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_deliveries SET status = 'DISABLED'
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('Conquest Gold moderation state is invalid')
    expect(await applyDelivery(conquestId)).toBe('applied')
  })

  it('delivers only when due and makes retries idempotent', async () => {
    const conquestId = await setupDelivery()
    const early = queueMessage(deliveryBody(conquestId), 'early', 1)
    await handleConquestGoldDeliveryQueue(
      messageBatch([early.message]),
      env.AUTH_DB,
      new Date('2026-08-13T11:59:59.999Z')
    )
    expect(early.outcome).toEqual({
      acked: false,
      retried: true,
      delaySeconds: 1
    })

    expect(await applyDelivery(conquestId)).toBe('applied')
    expect(await applyDelivery(conquestId)).toBe('duplicate')

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

  it('allows only one concurrent Queue message to claim and grant a delivery', async () => {
    const conquestId = await setupDelivery()
    const runs = await Promise.all([
      applyDelivery(conquestId),
      applyDelivery(conquestId)
    ])
    expect(runs.sort()).toEqual(['applied', 'duplicate'])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS' AND token_id = 136`
      )
        .bind(USER_ID)
        .first()
    ).toEqual({ balance: 1 })
  })

  it('rejects message authority and isolates one faulted player in a batch', async () => {
    const faultConquestId = await setupDelivery()
    const successUser = 'conquest-delivery-success'
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Gold Success', 'gold-success@example.com', ?, ?)`
    )
      .bind(successUser, CREATED_AT, CREATED_AT)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(successUser)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at)
       VALUES ('delivery-conquest-success', ?, 'COMPLETED', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR',
               '{"1":"WIN","2":"WIN","3":"WIN"}', ?, ?)`
    )
      .bind(successUser, CREATED_AT, CREATED_AT)
      .run()
    const successConquest = await env.AUTH_DB.prepare(
      `SELECT id FROM player_conquests
       WHERE entry_key = 'delivery-conquest-success'`
    ).first<{ id: number }>()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquest_gold_deliveries
         (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
          status, attempt_count, created_at)
       VALUES (?, ?, '[136]', '[131208]', ?, 'PENDING', 0, ?)`
    )
      .bind(successConquest!.id, successUser, DUE_AT, CREATED_AT)
      .run()

    await expect(
      applyConquestGoldDeliveryQueueMessage(
        env.AUTH_DB,
        { ...deliveryBody(faultConquestId), cardId: 136 },
        new Date(DUE_AT)
      )
    ).rejects.toThrow('Queue message is invalid')
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_one_gold_queue_player
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'conquest:%:gold'
         AND NEW.user_id = 'conquest-delivery-player'
       BEGIN SELECT RAISE(ABORT, 'injected one-player failure'); END`
    ).run()

    const fault = queueMessage(
      deliveryBody(faultConquestId),
      'isolated-fault',
      1
    )
    const success = queueMessage(
      deliveryBody(successConquest!.id),
      'isolated-success',
      1
    )
    await handleConquestGoldDeliveryQueue(
      messageBatch([fault.message, success.message]),
      env.AUTH_DB,
      new Date(DUE_AT)
    )
    expect(fault.outcome).toEqual({
      acked: false,
      retried: true,
      delaySeconds: undefined
    })
    expect(success.outcome).toEqual({ acked: true, retried: false })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT user_id, balance FROM player_items
         WHERE item_type = 'SW_GOLD_CARDS' ORDER BY user_id`
      ).all()
    ).toMatchObject({
      results: [{ user_id: successUser, balance: 1 }]
    })
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

    expect(await applyDelivery(conquestId)).toBe('applied')
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
    await applyDelivery(conquestId)

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

    const failed = queueMessage(deliveryBody(conquestId), 'receipt-failure', 1)
    await handleConquestGoldDeliveryQueue(
      messageBatch([failed.message]),
      env.AUTH_DB,
      new Date(DUE_AT)
    )
    expect(failed.outcome).toEqual({
      acked: false,
      retried: true,
      delaySeconds: undefined
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, application_status, application_key
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      status: 'PENDING',
      attempt_count: 0,
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
    expect(await applyDelivery(conquestId)).toBe('applied')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, application_status
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      status: 'DELIVERED',
      attempt_count: 1,
      application_status: 'APPLIED'
    })
  })

  it('keeps the entitlement visible through six failures and recovers on attempt seven', async () => {
    const conquestId = await setupDelivery()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_gold_delivery
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'conquest:%:gold'
       BEGIN
         SELECT RAISE(ABORT, 'injected delayed Gold failure');
       END`
    ).run()

    for (let attempt = 1; attempt <= 6; attempt++) {
      const failed = queueMessage(
        deliveryBody(conquestId),
        'persistent-failure',
        attempt
      )
      await handleConquestGoldDeliveryQueue(
        messageBatch([failed.message]),
        env.AUTH_DB,
        new Date(DUE_AT)
      )
      expect(failed.outcome).toEqual({
        acked: false,
        retried: true,
        delaySeconds: undefined
      })
      expect(
        await env.AUTH_DB.prepare(
          `SELECT status, attempt_count, delivery_key, delivered_at
           FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
        )
          .bind(conquestId)
          .first()
      ).toEqual({
        status: 'PENDING',
        attempt_count: 0,
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
    expect(await pendingConquestCards(env.AUTH_DB, USER_ID)).toMatchObject([
      { tokenIDs: [131_208], mintAt: DUE_AT }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM player_conquest_gold_delivery_failures
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first('count')
    ).toBe(6)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_gold_delivery_failures
         SET error = 'rewritten' WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .run()
    ).rejects.toThrow('delivery failures are immutable')

    await env.AUTH_DB.prepare('DROP TRIGGER reject_gold_delivery').run()
    const recovered = queueMessage(
      deliveryBody(conquestId),
      'persistent-failure',
      7
    )
    await handleConquestGoldDeliveryQueue(
      messageBatch([recovered.message]),
      env.AUTH_DB,
      new Date(DUE_AT)
    )
    expect(recovered.outcome).toEqual({ acked: true, retried: false })
    const duplicate = queueMessage(
      deliveryBody(conquestId),
      'persistent-failure',
      8
    )
    await handleConquestGoldDeliveryQueue(
      messageBatch([duplicate.message]),
      env.AUTH_DB,
      new Date(DUE_AT)
    )
    expect(duplicate.outcome).toEqual({ acked: true, retried: false })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS' AND token_id = 136`
      )
        .bind(USER_ID)
        .first('balance')
    ).toBe(1)
  })

  it('fails malformed persisted card mappings closed without granting', async () => {
    const conquestId = await setupDelivery([999_999])
    const failed = queueMessage(deliveryBody(conquestId), 'malformed', 1)
    await handleConquestGoldDeliveryQueue(
      messageBatch([failed.message]),
      env.AUTH_DB,
      new Date(DUE_AT)
    )
    expect(failed.outcome).toEqual({
      acked: false,
      retried: true,
      delaySeconds: undefined
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, attempt_count, last_error
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first()
    ).toEqual({
      status: 'PENDING',
      attempt_count: 0,
      last_error: null
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT error FROM player_conquest_gold_delivery_failures
         WHERE conquest_id = ?`
      )
        .bind(conquestId)
        .first('error')
    ).toBe('Conquest Gold delivery contains invalid cards')
  })

  it('re-drives every due D1 responsibility across transport pages without claiming it', async () => {
    await setupDelivery()
    const statements: D1PreparedStatement[] = []
    for (let index = 1; index < 101; index += 1) {
      const entryKey = 'delivery-conquest-' + index
      statements.push(
        env.AUTH_DB.prepare(
          `INSERT INTO player_conquests
             (entry_key, user_id, status, nonce, mode, hero, deck_class,
              match_progress, created_at, ended_at)
           VALUES (?, ?, 'COMPLETED', ?, 'CONQUEST_CONSTRUCTED', 'ADA',
                   'STR', '{"1":"WIN","2":"WIN","3":"WIN"}', ?, ?)`
        ).bind(entryKey, USER_ID, index + 1, CREATED_AT, CREATED_AT),
        env.AUTH_DB.prepare(
          `INSERT INTO player_conquest_gold_deliveries
             (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
              status, attempt_count, created_at)
           SELECT id, ?, '[136]', '[131208]', ?, 'PENDING', 0, ?
           FROM player_conquests WHERE entry_key = ?`
        ).bind(USER_ID, DUE_AT, CREATED_AT, entryKey)
      )
    }
    await env.AUTH_DB.batch(statements)

    const pages: ConquestGoldDeliveryQueueMessage[][] = []
    const queue = {
      sendBatch: async (
        messages: Iterable<{ body: ConquestGoldDeliveryQueueMessage }>
      ) => {
        pages.push([...messages].map(message => message.body))
        return {
          metadata: {
            metrics: {
              backlogCount: pages.flat().length,
              backlogBytes: 0
            }
          }
        }
      }
    } as unknown as Queue<ConquestGoldDeliveryQueueMessage>
    const target = {
      AUTH_DB: env.AUTH_DB,
      CONQUEST_GOLD_DELIVERY_QUEUE: queue
    }
    expect(
      await dispatchDueConquestGoldDeliveries(
        target,
        new Date('2026-08-13T11:59:59.999Z')
      )
    ).toEqual({ published: 0 })
    expect(
      await dispatchDueConquestGoldDeliveries(target, new Date(DUE_AT))
    ).toEqual({ published: 101 })
    expect(pages.map(page => page.length)).toEqual([100, 1])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS pending,
                COALESCE(SUM(attempt_count), 0) AS attempts
         FROM player_conquest_gold_deliveries
         WHERE status = 'PENDING' AND application_status = 'READY'`
      ).first()
    ).toEqual({ pending: 101, attempts: 0 })
  })
})
