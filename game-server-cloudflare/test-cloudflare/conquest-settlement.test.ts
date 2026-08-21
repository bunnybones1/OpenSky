import { env } from 'cloudflare:test'
import {
  ConquestMatchResult,
  ConquestStatus,
  ItemType,
  RewardType
} from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ConquestGoldDeliveryQueueMessage } from '@opensky/shared/conquest-gold-delivery'

import { approvedConquestPoolStatements } from '../../cloudflare/test/helpers/conquest-pool'
import { publishConquestGoldDeliveriesForMatch } from '../src/conquest-gold-delivery'
import {
  conquestRewardBundle,
  settleConquestRewardsForMatch,
  settlePendingConquest,
  type ConquestDraw
} from '../src/conquest-settlement'

const USER_ID = 'conquest-settlement-user'
const USER_ID_2 = 'conquest-settlement-opponent'
const SETTLED_AT = '2026-08-12T12:00:00.000Z'
let poolVersion = 'conquest-pool-test-v1'

const setup = async (
  wins: number,
  options: {
    pool?: boolean
    silver?: number[]
    gold?: number[]
    startsAt?: string
    endsAt?: string
    createdAt?: string
    runCreatedAt?: string
    pinPool?: boolean
    accountStatus?:
      | 'ACTIVE'
      | 'BANNED'
      | 'SUSPENDED'
      | 'FLAGGED'
      | 'TO_DELETE'
      | 'DELETED'
  } = {}
) => {
  const now = options.runCreatedAt ?? '2026-08-12T11:00:00.000Z'
  const progress: Record<number, ConquestMatchResult> = {}
  for (let index = 0; index < wins; index++) {
    progress[index + 1] = ConquestMatchResult.WIN
  }
  if (wins < 3) progress[wins + 1] = ConquestMatchResult.LOSS
  const statements = [
    ...(options.pool === false
      ? []
      : approvedConquestPoolStatements(env.AUTH_DB, {
          version: poolVersion,
          startsAt: options.startsAt ?? '2026-08-12T00:00:00.000Z',
          endsAt: options.endsAt ?? '2026-08-13T00:00:00.000Z',
          createdAt: options.createdAt ?? now,
          silver: options.silver ?? [6, 68],
          gold: options.gold ?? [136]
        })),
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Settlement Player', 'settlement@example.com', ?, ?)`
    ).bind(USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at) VALUES (91, ?, ?)`
    ).bind(USER_ID, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, account_status, created_at, updated_at)
       VALUES (?, 'Settlement.Player', ?, ?, ?)`
    ).bind(USER_ID, options.accountStatus ?? 'ACTIVE', now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at, reward_pool_version)
       VALUES ('settlement-entry', ?, 'REWARDS_PENDING', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR', ?, ?, ?, ?)`
    ).bind(
      USER_ID,
      JSON.stringify(progress),
      now,
      now,
      options.pool === false || options.pinPool === false ? null : poolVersion
    )
  ]
  await env.AUTH_DB.batch(statements)
  return env.AUTH_DB.prepare(
    `SELECT id FROM player_conquests WHERE entry_key = 'settlement-entry'`
  ).first<{ id: number }>()
}

const sequenceDraw = (...indices: number[]): ConquestDraw => {
  let cursor = 0
  return candidateCount => {
    const result = indices[cursor++]
    if (result === undefined || result >= candidateCount) {
      throw new Error('test draw exhausted')
    }
    return result
  }
}

const setupOpponent = async () => {
  const now = '2026-08-12T11:00:00.000Z'
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Settlement Opponent', 'opponent@example.com', ?, ?)`
    ).bind(USER_ID_2, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at) VALUES (92, ?, ?)`
    ).bind(USER_ID_2, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES ('settlement-opponent-entry', ?, 'IN_PROGRESS', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR', '{}', ?)`
    ).bind(USER_ID_2, now)
  ])
}

const inventory = () =>
  env.AUTH_DB.prepare(
    `SELECT item_type, token_id, balance, is_new, unlock_source
     FROM player_items WHERE user_id = ? ORDER BY item_type, token_id`
  )
    .bind(USER_ID)
    .all<{
      item_type: ItemType
      token_id: number
      balance: number
      is_new: number
      unlock_source: string
    }>()

beforeEach(async () => {
  poolVersion = `conquest-pool-test-${crypto.randomUUID()}`
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_conquest_inventory'
  ).run()
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_conquest_receipt_completion'
  ).run()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ),
    env.AUTH_DB.prepare('DELETE FROM users'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_deck_ranks_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_rank_wins'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_ranks'),
    env.AUTH_DB.prepare('DELETE FROM player_items'),
    env.AUTH_DB.prepare('DELETE FROM player_conquests'),
    env.AUTH_DB.prepare('DELETE FROM game_accounts')
  ])
})

describe('source Conquest reward settlement', () => {
  it('preserves the exact zero-through-three-win bundle table', () => {
    expect([0, 1, 2, 3, 4].map(conquestRewardBundle)).toEqual([
      { silver: 0, gold: 0 },
      { silver: 1, gold: 0 },
      { silver: 2, gold: 0 },
      { silver: 1, gold: 1 },
      { silver: 0, gold: 0 }
    ])
  })

  it('makes independent Silver draws and sorts source token IDs', async () => {
    const conquest = await setup(2)
    const receipt = await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(1, 0)
    )

    expect(receipt).toMatchObject({
      applied: true,
      poolVersion,
      wins: 2,
      silverCardIds: [68, 6],
      goldCardIds: [],
      silverTokenIds: [65_542, 65_604],
      goldTokenIds: []
    })
    expect(receipt.rewards.map(reward => reward.card?.card.id)).toEqual([68, 6])
    expect((await inventory()).results).toEqual([
      {
        item_type: ItemType.SW_SILVER_CARDS,
        token_id: 6,
        balance: 1,
        is_new: 1,
        unlock_source: `conquest:${conquest!.id}`
      },
      {
        item_type: ItemType.SW_SILVER_CARDS,
        token_id: 68,
        balance: 1,
        is_new: 1,
        unlock_source: `conquest:${conquest!.id}`
      }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT conquest.status, settlement.application_status,
                settlement.match_progress_json,
                settlement.completed_at
         FROM player_conquests conquest
         JOIN player_conquest_settlements settlement
           ON settlement.conquest_id = conquest.id
         WHERE conquest.id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      status: ConquestStatus.COMPLETED,
      application_status: 'APPLIED',
      match_progress_json: JSON.stringify({
        1: ConquestMatchResult.WIN,
        2: ConquestMatchResult.WIN,
        3: ConquestMatchResult.LOSS
      }),
      completed_at: SETTLED_AT
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, card_id, quantity, before_balance, after_balance
         FROM player_conquest_settlement_inventory_grants
         WHERE conquest_id = ? ORDER BY card_id`
      )
        .bind(conquest!.id)
        .all()
    ).toMatchObject({
      results: [
        {
          item_type: ItemType.SW_SILVER_CARDS,
          card_id: 6,
          quantity: 1,
          before_balance: 0,
          after_balance: 1
        },
        {
          item_type: ItemType.SW_SILVER_CARDS,
          card_id: 68,
          quantity: 1,
          before_balance: 0,
          after_balance: 1
        }
      ]
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT event_type, token_ids_json FROM player_conquest_feed_events`
      ).all()
    ).toMatchObject({
      results: [
        {
          event_type: 'REWARD',
          token_ids_json: JSON.stringify([65_542, 65_604])
        }
      ]
    })
  })

  it('returns the exact source card reward wire shape', async () => {
    const conquest = await setup(1)
    const receipt = await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(0)
    )

    expect(receipt.rewards).toEqual([
      {
        accountID: 91,
        type: RewardType.CARD,
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 0,
          card: {
            id: 6,
            name: 'Stomp',
            description:
              'Do damage to target unit equal to the highest health among ally units.',
            asset: 'spell-case-94',
            class: 'STR',
            element: 'EARTH',
            type: 'SPELL',
            manaCost: 2,
            power: 0,
            health: 0,
            attachedSpellID: null,
            keywords: [],
            status: 'PLAY',
            set: 'CORE_SET',
            imageURL: {
              small:
                'https://assets.skyweaver.net/latest/full-cards/en/2x/6.webp',
              medium:
                'https://assets.skyweaver.net/latest/full-cards/en/4x/6.webp',
              large:
                'https://assets.skyweaver.net/latest/full-cards/en/6x/6.webp'
            },
            itemType: ItemType.UNKNOWN,
            isNew: null,
            silverCardTokenId: 65_542,
            goldCardTokenId: 131_078
          },
          item: {
            id: 0,
            contractAddress: null,
            itemType: ItemType.SW_SILVER_CARDS,
            tokenID: 6,
            balance: '0',
            lastUpdateID: 0,
            updatedAt: null,
            createdAt: null,
            isNew: null
          }
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null,
        stickerPoints: null
      }
    ])
    expect(receipt.rewards[0].card?.card).not.toHaveProperty('validFromSeason')
  })

  it('allows duplicate independent Silver draws and increments one balance', async () => {
    const conquest = await setup(2)
    const receipt = await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(1, 1)
    )
    expect(receipt.silverCardIds).toEqual([68, 68])
    expect((await inventory()).results).toMatchObject([
      { item_type: ItemType.SW_SILVER_CARDS, token_id: 68, balance: 2 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT quantity, before_balance, after_balance
         FROM player_conquest_settlement_inventory_grants
         WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({ quantity: 2, before_balance: 0, after_balance: 2 })
  })

  it('records the serialized balance transition over existing inventory', async () => {
    const conquest = await setup(1)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_SILVER_CARDS', 6, 4, 0, 'prior-reward', ?, ?)`
    )
      .bind(USER_ID, SETTLED_AT, SETTLED_AT)
      .run()

    await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(0)
    )

    expect((await inventory()).results).toMatchObject([
      { item_type: ItemType.SW_SILVER_CARDS, token_id: 6, balance: 5 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT quantity, before_balance, after_balance
         FROM player_conquest_settlement_inventory_grants
         WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({ quantity: 1, before_balance: 4, after_balance: 5 })
  })

  it('uses only the versioned Gold pool and emits delayed Gold feed data', async () => {
    const conquest = await setup(3)
    const receipt = await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(0, 0)
    )
    expect(receipt).toMatchObject({
      wins: 3,
      silverCardIds: [6],
      goldCardIds: [136],
      silverTokenIds: [65_542],
      goldTokenIds: [131_208]
    })
    expect(receipt.rewards[1]).toMatchObject({
      type: RewardType.CARD,
      card: {
        amount: 0,
        card: { itemType: ItemType.UNKNOWN, isNew: null },
        item: {
          itemType: ItemType.SW_GOLD_CARDS,
          tokenID: 136,
          balance: '0',
          isNew: null
        }
      }
    })
    expect((await inventory()).results).toMatchObject([
      { item_type: ItemType.SW_SILVER_CARDS, token_id: 6, balance: 1 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT card_ids_json, token_ids_json, deliver_at, status,
                attempt_count, delivery_key
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      card_ids_json: '[136]',
      token_ids_json: '[131208]',
      deliver_at: '2026-08-13T12:00:00.000Z',
      status: 'PENDING',
      attempt_count: 0,
      delivery_key: null
    })
    const events = await env.AUTH_DB.prepare(
      `SELECT event_type, token_ids_json FROM player_conquest_feed_events
       ORDER BY id`
    ).all()
    expect(events.results).toEqual([
      { event_type: 'REWARD', token_ids_json: '[65542]' },
      { event_type: 'DELAYED_REWARD', token_ids_json: '[131208]' }
    ])
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest Gold delivery entitlements are immutable')
  })

  it('atomically disables delayed Gold when settlement observes a blocked account', async () => {
    const conquest = await setup(3, { accountStatus: 'FLAGGED' })

    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(0, 0)
      )
    ).resolves.toMatchObject({
      applied: true,
      silverCardIds: [6],
      goldCardIds: [136]
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, application_status, attempt_count
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      status: 'DISABLED',
      application_status: 'READY',
      attempt_count: 0
    })
    expect((await inventory()).results).toMatchObject([
      { item_type: ItemType.SW_SILVER_CARDS, token_id: 6, balance: 1 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT application_status FROM player_conquest_settlements
         WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({ application_status: 'APPLIED' })
  })

  it('settles only terminal runs and recovers their receipt on match retry', async () => {
    const conquest = await setup(3)
    await setupOpponent()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES ('settlement-match', 'settlement-replay', 'CONQUEST_CONSTRUCTED',
               'test', '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222', ?, ?, '{}',
               'active', ?, ?)`
    )
      .bind(USER_ID, USER_ID_2, SETTLED_AT, SETTLED_AT)
      .run()
    const match = await env.AUTH_DB.prepare(
      `SELECT id FROM multiplayer_matches WHERE proposal_id = 'settlement-match'`
    ).first<{ id: number }>()
    const progress = {
      10_001: ConquestMatchResult.WIN,
      10_002: ConquestMatchResult.WIN,
      [match!.id]: ConquestMatchResult.WIN
    }
    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET match_progress = ? WHERE id = ?`
    )
      .bind(JSON.stringify(progress), conquest!.id)
      .run()

    const rewards = await settleConquestRewardsForMatch(
      env.AUTH_DB,
      'settlement-match',
      SETTLED_AT,
      sequenceDraw(0, 0)
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT silver_card_ids_json, gold_card_ids_json
         FROM player_conquest_settlements WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      silver_card_ids_json: '[6]',
      gold_card_ids_json: '[136]'
    })
    expect((await inventory()).results).toMatchObject([
      { item_type: ItemType.SW_SILVER_CARDS, token_id: 6 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquest_gold_deliveries
         WHERE conquest_id = ? AND status = 'PENDING'`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({ count: 1 })
    expect(rewards[0].map(reward => reward.card?.card.id)).toEqual([6, 136])
    expect(rewards[1]).toEqual([])

    const retry = await settleConquestRewardsForMatch(
      env.AUTH_DB,
      'settlement-match',
      '2026-08-12T12:01:00.000Z',
      () => {
        throw new Error('match retry must not redraw')
      }
    )
    expect(retry).toEqual(rewards)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquest_settlements) AS settlements,
           (SELECT COUNT(*) FROM player_conquest_gold_deliveries) AS deliveries,
           (SELECT COUNT(*) FROM player_conquest_feed_events) AS events`
      ).first()
    ).toEqual({ settlements: 1, deliveries: 1, events: 2 })
    expect((await inventory()).results).toMatchObject([
      { item_type: ItemType.SW_SILVER_CARDS, token_id: 6, balance: 1 }
    ])
  })

  it('publishes only the D1 responsibility with the remaining exact delay', async () => {
    const conquest = await setup(3)
    await setupOpponent()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES ('gold-queue-match', 'gold-queue-replay',
               'CONQUEST_CONSTRUCTED', 'test',
               '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222', ?, ?, '{}',
               'ended', ?, ?)`
    )
      .bind(USER_ID, USER_ID_2, SETTLED_AT, SETTLED_AT)
      .run()
    const match = await env.AUTH_DB.prepare(
      `SELECT id FROM multiplayer_matches
       WHERE proposal_id = 'gold-queue-match'`
    ).first<{ id: number }>()
    await env.AUTH_DB.prepare(
      `UPDATE player_conquests
       SET match_progress = ? WHERE id = ?`
    )
      .bind(
        JSON.stringify({
          10_001: ConquestMatchResult.WIN,
          10_002: ConquestMatchResult.WIN,
          [match!.id]: ConquestMatchResult.WIN
        }),
        conquest!.id
      )
      .run()
    await settleConquestRewardsForMatch(
      env.AUTH_DB,
      'gold-queue-match',
      SETTLED_AT,
      sequenceDraw(0, 0)
    )

    const sent: Array<{
      body: ConquestGoldDeliveryQueueMessage
      options?: QueueSendOptions
    }> = []
    const queue = {
      send: async (
        body: ConquestGoldDeliveryQueueMessage,
        options?: QueueSendOptions
      ) => {
        sent.push({ body, options })
        return {
          metadata: { metrics: { backlogCount: sent.length, backlogBytes: 0 } }
        }
      }
    } as unknown as Queue<ConquestGoldDeliveryQueueMessage>
    expect(
      await publishConquestGoldDeliveriesForMatch(
        env.AUTH_DB,
        queue,
        'gold-queue-match',
        new Date(SETTLED_AT)
      )
    ).toEqual({ published: 1 })
    expect(sent).toEqual([
      {
        body: {
          kind: 'CONQUEST_GOLD',
          version: 1,
          conquestId: conquest!.id
        },
        options: { contentType: 'json', delaySeconds: 86_400 }
      }
    ])
    expect(Object.keys(sent[0].body).sort()).toEqual([
      'conquestId',
      'kind',
      'version'
    ])

    const unavailable = {
      send: async () => {
        throw new Error('injected Queue outage')
      }
    } as unknown as Queue<ConquestGoldDeliveryQueueMessage>
    await expect(
      publishConquestGoldDeliveriesForMatch(
        env.AUTH_DB,
        unavailable,
        'gold-queue-match',
        new Date(SETTLED_AT)
      )
    ).rejects.toThrow('delayed Queue publication failed')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status, application_status, attempt_count
         FROM player_conquest_gold_deliveries WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      status: 'PENDING',
      application_status: 'READY',
      attempt_count: 0
    })
  })

  it('does not require a pool for a nonterminal Conquest match', async () => {
    const conquest = await setup(1, { pool: false })
    await setupOpponent()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES ('nonterminal-match', 'nonterminal-replay', 'CONQUEST_CONSTRUCTED',
               'test', '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222', ?, ?, '{}',
               'active', ?, ?)`
    )
      .bind(USER_ID, USER_ID_2, SETTLED_AT, SETTLED_AT)
      .run()
    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET status = 'IN_PROGRESS', match_progress = '{}'
       WHERE id = ?`
    )
      .bind(conquest!.id)
      .run()

    await expect(
      settleConquestRewardsForMatch(
        env.AUTH_DB,
        'nonterminal-match',
        SETTLED_AT,
        () => {
          throw new Error('must not draw')
        }
      )
    ).resolves.toEqual([[], []])
  })

  it('returns its immutable receipt on retry without redrawing or regranting', async () => {
    const conquest = await setup(1)
    const first = await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(0)
    )
    const retry = await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      '2026-08-12T12:01:00.000Z',
      () => {
        throw new Error('retry must not draw')
      }
    )
    expect(retry).toEqual({ ...first, applied: false })
    expect((await inventory()).results).toMatchObject([{ balance: 1 }])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquest_settlements`
      ).first()
    ).toEqual({ count: 1 })
  })

  it('settles a racing retry exactly once', async () => {
    const conquest = await setup(1)
    const attempts = await Promise.all([
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(0)
      ),
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(1)
      )
    ])
    expect(attempts.filter(attempt => attempt.applied)).toHaveLength(1)
    expect(attempts[0].silverCardIds).toEqual(attempts[1].silverCardIds)
    expect((await inventory()).results).toMatchObject([{ balance: 1 }])
  })

  it('refuses to apply a prepared receipt before every off-chain effect exists', async () => {
    const conquest = await setup(1)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquest_settlements
         (conquest_id, settlement_key, user_id, pool_version, wins,
          silver_card_ids_json, gold_card_ids_json, silver_token_ids_json,
          gold_token_ids_json, settled_at, match_progress_json,
          application_status, completed_at)
       SELECT id, '00000000-0000-4000-8000-000000000075', user_id, ?, 1,
              '[6]', '[]', '[65542]', '[]', ?, match_progress,
              'PREPARING', NULL
       FROM player_conquests WHERE id = ?`
    )
      .bind(poolVersion, SETTLED_AT, conquest!.id)
      .run()

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_settlements
         SET application_status = 'APPLIED', completed_at = ?
         WHERE conquest_id = ?`
      )
        .bind(SETTLED_AT, conquest!.id)
        .run()
    ).rejects.toThrow('Conquest settlement completion is invalid')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT application_status, completed_at
         FROM player_conquest_settlements WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({ application_status: 'PREPARING', completed_at: null })
    expect((await inventory()).results).toEqual([])
  })

  it('rejects direct receipt tampering and deletion while preserving account cleanup', async () => {
    const conquest = await setup(1)
    await settlePendingConquest(
      env.AUTH_DB,
      conquest!.id,
      SETTLED_AT,
      sequenceDraw(0)
    )

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_settlements SET wins = 2 WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest settlement completion is invalid')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_settlement_inventory_grants
         SET after_balance = after_balance + 1 WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest inventory grant receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_feed_events SET token_ids_json = '[65543]'
         WHERE conquest_id = ? AND event_type = 'REWARD'`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest settlement feed receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM player_conquest_settlements WHERE conquest_id = ?`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest settlement receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(`DELETE FROM player_conquests WHERE id = ?`)
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest runs with settlement receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquests SET status = 'REWARDS_PENDING' WHERE id = ?`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest runs with settlement receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM conquest_reward_pool_cards
         WHERE pool_version = ? AND card_id = 6`
      )
        .bind(poolVersion)
        .run()
    ).rejects.toThrow('Conquest reward pool cards are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pools SET ends_at = ? WHERE version = ?`
      )
        .bind('2026-08-14T00:00:00.000Z', poolVersion)
        .run()
    ).rejects.toThrow('Conquest reward pool')
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_reward_pools SET status = 'RETIRED'
         WHERE version = ?`
      )
        .bind(poolVersion)
        .run()
    ).resolves.toMatchObject({ success: true })

    await expect(
      env.AUTH_DB.prepare(`DELETE FROM users WHERE id = ?`).bind(USER_ID).run()
    ).resolves.toMatchObject({ success: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquest_settlements) AS settlements,
           (SELECT COUNT(*) FROM player_conquest_settlement_inventory_grants)
             AS grants,
           (SELECT COUNT(*) FROM player_conquest_feed_events) AS events`
      ).first()
    ).toEqual({ settlements: 0, grants: 0, events: 0 })
  })

  it('rolls back every off-chain reward when receipt completion validation fails', async () => {
    const conquest = await setup(3)
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_conquest_receipt_completion
       BEFORE UPDATE OF application_status ON player_conquest_settlements
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected Conquest receipt failure');
       END`
    ).run()

    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(0, 0)
      )
    ).rejects.toThrow('injected Conquest receipt failure')
    expect((await inventory()).results).toEqual([])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquest_settlements) AS settlements,
           (SELECT COUNT(*) FROM player_conquest_settlement_inventory_grants)
             AS grants,
           (SELECT COUNT(*) FROM player_conquest_gold_deliveries) AS deliveries,
           (SELECT COUNT(*) FROM player_conquest_feed_events) AS events,
           (SELECT status FROM player_conquests WHERE id = ?) AS status`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      settlements: 0,
      grants: 0,
      deliveries: 0,
      events: 0,
      status: ConquestStatus.REWARDS_PENDING
    })
    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_conquest_receipt_completion'
    ).run()
  })

  it('fails closed instead of inferring a pool for an unpinned run', async () => {
    const missingPool = await setup(1, { pool: false })
    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        missingPool!.id,
        SETTLED_AT,
        sequenceDraw(0)
      )
    ).rejects.toThrow('Conquest run has no pinned reward pool')
    expect((await inventory()).results).toEqual([])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM player_conquests WHERE id = ?`
      )
        .bind(missingPool!.id)
        .first()
    ).toEqual({ status: ConquestStatus.REWARDS_PENDING })
  })

  it('fails closed for malformed persisted match progress', async () => {
    const conquest = await setup(1)
    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET match_progress = '[]' WHERE id = ?`
    )
      .bind(conquest!.id)
      .run()

    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(0)
      )
    ).rejects.toThrow('Conquest match progress is malformed')
    expect((await inventory()).results).toEqual([])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquest_settlements) AS settlements,
           (SELECT COUNT(*) FROM player_conquest_feed_events) AS events,
           (SELECT status FROM player_conquests WHERE id = ?) AS status`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      settlements: 0,
      events: 0,
      status: ConquestStatus.REWARDS_PENDING
    })
  })

  it('settles from the immutable admission pool after its window closes', async () => {
    const admitted = await setup(1, {
      startsAt: '2026-08-10T00:00:00.000Z',
      endsAt: '2026-08-11T00:00:00.000Z',
      createdAt: '2026-08-10T01:00:00.000Z',
      runCreatedAt: '2026-08-10T12:00:00.000Z'
    })
    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED' WHERE version = ?`
    )
      .bind(poolVersion)
      .run()
    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        admitted!.id,
        SETTLED_AT,
        sequenceDraw(0)
      )
    ).resolves.toMatchObject({
      applied: true,
      poolVersion,
      silverCardIds: [6]
    })
  })

  it('rejects a pool pin whose window never admitted the run', async () => {
    const invalidPin = await setup(1, {
      startsAt: '2026-08-10T00:00:00.000Z',
      endsAt: '2026-08-11T00:00:00.000Z',
      createdAt: '2026-08-10T01:00:00.000Z'
    })
    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        invalidPin!.id,
        SETTLED_AT,
        sequenceDraw(0)
      )
    ).rejects.toThrow('Conquest run was not admitted by its pinned reward pool')
    expect((await inventory()).results).toEqual([])
  })

  it('prevents changing the reward promise after ticket admission', async () => {
    const conquest = await setup(1)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquests SET reward_pool_version = NULL WHERE id = ?`
      )
        .bind(conquest!.id)
        .run()
    ).rejects.toThrow('Conquest reward pool pin is immutable')
  })

  it('rejects an invalid card before a pool can be approved', async () => {
    await expect(setup(1, { silver: [999999] })).rejects.toThrow(
      'Conquest reward pool card is invalid'
    )
    expect((await inventory()).results).toEqual([])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquest_settlements`
      ).first()
    ).toEqual({ count: 0 })
  })

  it('preserves the source pool end-time inclusivity', async () => {
    const conquest = await setup(1, {
      endsAt: SETTLED_AT,
      createdAt: '2026-08-12T00:00:00.000Z',
      runCreatedAt: SETTLED_AT
    })
    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(0)
      )
    ).resolves.toMatchObject({ applied: true, silverCardIds: [6] })
  })

  it('rolls back the receipt, delayed delivery, feed, and status if any inventory grant fails', async () => {
    const conquest = await setup(3)
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_conquest_inventory
       BEFORE INSERT ON player_items
       WHEN NEW.unlock_source LIKE 'conquest:%'
       BEGIN
         SELECT RAISE(ABORT, 'injected Conquest grant failure');
       END`
    ).run()

    await expect(
      settlePendingConquest(
        env.AUTH_DB,
        conquest!.id,
        SETTLED_AT,
        sequenceDraw(0, 0)
      )
    ).rejects.toThrow('injected Conquest grant failure')
    expect((await inventory()).results).toEqual([])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_conquest_settlements) AS settlements,
           (SELECT COUNT(*) FROM player_conquest_gold_deliveries) AS deliveries,
           (SELECT COUNT(*) FROM player_conquest_feed_events) AS events,
           (SELECT status FROM player_conquests WHERE id = ?) AS status`
      )
        .bind(conquest!.id)
        .first()
    ).toEqual({
      settlements: 0,
      deliveries: 0,
      events: 0,
      status: ConquestStatus.REWARDS_PENDING
    })
  })
})
