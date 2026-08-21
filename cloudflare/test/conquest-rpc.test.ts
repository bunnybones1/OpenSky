import { env } from 'cloudflare:workers'
import {
  ConquestMatchResult,
  ConquestStatus,
  DeckClass,
  GameMode,
  Hero,
  PlayerRank,
  PlayerRankStage
} from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { approvedConquestPoolStatements } from './helpers/conquest-pool'
import { handleApiRequest } from '../src/api'
import { ConquestRepository } from '../src/conquest'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import {
  enableConstructedConquestForTest,
  provisionVerifiedConquestReadiness
} from './helpers/conquest-readiness'

const testEnv = env as unknown as Env
const userId = 'conquest-player-user-id'

const rpc = async (method: string, body: unknown, signedIn = true) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
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
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ),
    env.AUTH_DB.prepare(
      `UPDATE game_mode_status SET enabled = 0
       WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')`
    ),
    env.AUTH_DB.prepare('DELETE FROM users WHERE id = ?').bind(userId)
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Conquest Weasel', 'conquest@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('source conquest RPC foundation', () => {
  it('returns safe empty state and exact source treasure thresholds', async () => {
    expect(await (await rpc('ConquestStatus', {})).json()).toEqual({
      conquest: null
    })
    expect(await (await rpc('ConquestStats', {})).json()).toMatchObject({
      stats: { firstConquestMatchPlayed: null, constructedTicketsUsed: 0 }
    })
    expect(await (await rpc('ConquestRewards', {}, false)).json()).toEqual({
      weeklyGolds: []
    })
    expect(await (await rpc('ConquestPoints', {})).json()).toEqual({
      points: 0,
      nedeed: 30
    })
    expect(await (await rpc('ConquestV2Progress', {})).json()).toEqual({
      progress: {
        treasureLevel: 0,
        treasurePoints: 0,
        treasurePointsRequired: 250
      }
    })
    expect(await (await rpc('ConquestV2Pool', {}, false)).json()).toEqual({
      pool: { amount: 0, totalWeight: 0 }
    })
    const treasures = await (
      await rpc('ConquestTreasuresInfo', {}, false)
    ).json<{
      treasures: Record<string, { amountSilver: number; amountUSDC: number }>
    }>()
    expect(Object.keys(treasures.treasures)).toHaveLength(11)
    expect(Object.values(treasures.treasures)).toEqual(
      Array.from({ length: 11 }, () => ({ amountSilver: 0, amountUSDC: 0 }))
    )

    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT event_id, current_points, total_points
           FROM player_conquest_points WHERE user_id = ? ORDER BY event_id`
        )
          .bind(userId)
          .all()
      ).results
    ).toEqual([
      { event_id: 1, current_points: 0, total_points: 0 },
      { event_id: 2, current_points: 0, total_points: 0 }
    ])

    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `UPDATE player_conquest_points
       SET current_points = 900, total_points = 1400, updated_at = ?
       WHERE user_id = ? AND event_id = 2`
    )
      .bind(now, userId)
      .run()
    expect(await (await rpc('ConquestV2Progress', {})).json()).toEqual({
      progress: {
        treasureLevel: 2,
        treasurePoints: 150,
        treasurePointsRequired: 600
      }
    })
    expect(await (await rpc('ConquestPoints', {})).json()).toEqual({
      points: 0,
      nedeed: 30
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_conquest_points
       SET current_points = 29, total_points = 129, updated_at = ?
       WHERE user_id = ? AND event_id = 1`
    )
      .bind(now, userId)
      .run()
    expect(await (await rpc('ConquestPoints', {})).json()).toEqual({
      points: 29,
      nedeed: 30
    })
    expect(await (await rpc('ConquestV2Progress', {})).json()).toEqual({
      progress: {
        treasureLevel: 2,
        treasurePoints: 150,
        treasurePointsRequired: 600
      }
    })
  })

  it('withholds Conquest V2 points until the source-atomic match publishes', async () => {
    const repository = new ConquestRepository(env.AUTH_DB)
    const now = new Date().toISOString()
    const proposalId = `pending-points-${crypto.randomUUID()}`
    const settlementToken = crypto.randomUUID()
    expect(await repository.points(userId, 2)).toEqual({ current: 0, total: 0 })
    const account = await env.AUTH_DB.prepare(
      'SELECT id FROM game_accounts WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: number }>()
    expect(account).not.toBeNull()

    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_points
         SET current_points = 200, total_points = 1200, updated_at = ?
         WHERE user_id = ? AND event_id = 2`
      ).bind(now, userId),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, status, created_at, updated_at)
         VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'points-projection-test',
                 '0x1111111111111111111111111111111111111111',
                 '0x2222222222222222222222222222222222222222', ?, NULL,
                 '{}', 'active', ?, ?)`
      ).bind(proposalId, `${proposalId}-replay`, userId, now, now)
    ])
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_conquest_points
         SET current_points = 500, total_points = 1500, updated_at = ?
         WHERE user_id = ? AND event_id = 2`
      ).bind(now, userId),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_conquest_point_players
           (proposal_id, player_index, user_id, settlement_token, account_id,
            raw_points, before_points, before_total_points, awarded_points,
            after_points, after_total_points, processed_at)
         VALUES (?, 0, ?, ?, ?, 300, 200, 1200, 300, 500, 1500, ?)`
      ).bind(proposalId, userId, settlementToken, account!.id, now)
    ])
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_conquest_points
         (proposal_id, player1_points, player2_points, player1_rewards_json,
          player2_rewards_json, processed_at, player_count, settlement_token)
       VALUES (?, 300, 0, '[]', '[]', ?, 1, ?)`
    )
      .bind(proposalId, now, settlementToken)
      .run()

    expect(await repository.points(userId, 2)).toEqual({
      current: 200,
      total: 1200
    })
    expect(await (await rpc('ConquestV2Progress', {})).json()).toEqual({
      progress: {
        treasureLevel: 0,
        treasurePoints: 200,
        treasurePointsRequired: 50
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET status = 'ended', winner_player = 0,
           result_json = '{"status":"COMPLETED"}', ended_at = ?, updated_at = ?
       WHERE proposal_id = ?`
    )
      .bind(now, now, proposalId)
      .run()
    expect(await repository.points(userId, 2)).toEqual({
      current: 500,
      total: 1500
    })
    expect(await (await rpc('ConquestV2Progress', {})).json()).toEqual({
      progress: {
        treasureLevel: 1,
        treasurePoints: 250,
        treasurePointsRequired: 250
      }
    })
  })

  it('returns only the active versioned weekly Gold pool and current supply', async () => {
    const now = new Date()
    const startsAt = new Date(now.getTime() - 60_000).toISOString()
    const endsAt = new Date(now.getTime() + 60_000).toISOString()
    const createdAt = now.toISOString()
    const version = `rpc-active-pool-${crypto.randomUUID()}`
    await env.AUTH_DB.batch([
      ...approvedConquestPoolStatements(env.AUTH_DB, {
        version,
        startsAt,
        endsAt,
        createdAt,
        silver: [6],
        gold: [136]
      }),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_GOLD_CARDS', 136, 2, 1, 'test', ?, ?)`
      ).bind(userId, createdAt, createdAt)
    ])

    expect(await (await rpc('ConquestRewards', {}, false)).json()).toEqual({
      weeklyGolds: [
        {
          startAt: startsAt,
          endAt: endsAt,
          tokenId: 131_208,
          totalSupply: 2
        }
      ]
    })
  })

  it('spends one source non-tradable ticket and enters only once', async () => {
    expect((await rpc('EnterConquest', null)).status).toBe(400)
    expect((await rpc('EnterConquest', [])).status).toBe(400)
    expect((await rpc('EnterConquest', {})).status).toBe(400)
    expect((await rpc('EnterConquest', { hero: null })).status).toBe(400)
    expect((await rpc('EnterConquest', { hero: 1 })).status).toBe(400)
    expect((await rpc('EnterConquest', { hero: Hero.UNKNOWN })).status).toBe(
      500
    )
    expect((await rpc('EnterConquest', { hero: '' })).status).toBe(500)
    expect(
      (await rpc('EnterConquest', { hero: 'FUTURE_HERO' })).status
    ).toBe(500)
    expect((await rpc('EnterConquest', { hero: Hero.ADA })).status).toBe(500)
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET player_rank = ?, player_rank_stage = ?, updated_at = ?
       WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
    )
      .bind(
        PlayerRank.TRAINEE,
        PlayerRankStage.STAGE_I,
        now,
        userId,
        seasonFromDate()
      )
      .run()
    expect((await rpc('EnterConquest', { hero: Hero.ADA })).status).toBe(500)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_CONQUEST_TICKET', 2, 2, 0, 'test', ?, ?)`
    )
      .bind(userId, now, now)
      .run()

    expect((await rpc('EnterConquest', { hero: Hero.ADA })).status).toBe(500)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT balance FROM player_items
            WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
              AND token_id = 2) balance,
           (SELECT COUNT(*) FROM player_conquests
            WHERE user_id = ?) conquests`
      )
        .bind(userId, userId)
        .first()
    ).toEqual({ balance: 2, conquests: 0 })

    const readiness = await provisionVerifiedConquestReadiness(env.AUTH_DB)
    expect((await rpc('EnterConquest', { hero: Hero.ADA })).status).toBe(500)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
      )
        .bind(userId)
        .first('balance')
    ).toBe(2)

    await enableConstructedConquestForTest(env.AUTH_DB)
    await expect(
      new ConquestRepository(env.AUTH_DB).enter(
        userId,
        Hero.ADA,
        new Date(readiness.endsAt)
      )
    ).resolves.toBe(true)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT balance FROM player_items
            WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
              AND token_id = 2) balance,
           (SELECT COUNT(*) FROM player_conquests
            WHERE user_id = ?) conquests`
      )
        .bind(userId, userId)
        .first()
    ).toEqual({ balance: 1, conquests: 1 })

    expect(
      await (await rpc('EnterConquest', { hero: Hero.ADA })).json()
    ).toEqual({ status: true })
    expect(await (await rpc('ConquestStatus', {})).json()).toMatchObject({
      conquest: {
        status: ConquestStatus.IN_PROGRESS,
        nonce: 1,
        mode: GameMode.CONQUEST_CONSTRUCTED,
        hero: Hero.ADA,
        deckClass: 'STR',
        matchProgress: {}
      }
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT balance FROM player_items
            WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
              AND token_id = 2) AS balance,
           (SELECT reward_pool_version FROM player_conquests
            WHERE user_id = ? AND status = 'IN_PROGRESS') AS reward_pool_version`
      )
        .bind(userId, userId)
        .first()
    ).toEqual({
      balance: 1,
      reward_pool_version: readiness.poolVersion
    })

    await env.AUTH_DB.prepare(
      `UPDATE game_mode_status SET enabled = 0
       WHERE game_mode = 'CONQUEST_CONSTRUCTED'`
    ).run()
    expect(
      await (await rpc('EnterConquest', { hero: Hero.SAMYA })).json()
    ).toEqual({ status: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
      )
        .bind(userId)
        .first('balance')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquests WHERE user_id = ?`
      )
        .bind(userId)
        .first('count')
    ).toBe(1)
  })

  it('derives status deck class from the locked hero like the source RPC', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES ('derived-deck-class', ?, 'IN_PROGRESS', 1,
               'CONQUEST_CONSTRUCTED', 'SAMYA', 'STR', '{}', ?)`
    )
      .bind(userId, now)
      .run()

    expect(await (await rpc('ConquestStatus', {})).json()).toEqual({
      conquest: {
        id: expect.any(Number),
        status: ConquestStatus.IN_PROGRESS,
        nonce: 1,
        mode: GameMode.CONQUEST_CONSTRUCTED,
        hero: Hero.SAMYA,
        deckClass: DeckClass.AGY,
        matchProgress: {},
        createdAt: now,
        endedAt: null
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET hero = 'UNKNOWN'
       WHERE entry_key = 'derived-deck-class'`
    ).run()
    expect(await (await rpc('ConquestStatus', {})).json()).toMatchObject({
      conquest: {
        hero: Hero.UNKNOWN,
        deckClass: DeckClass.UNKNOWN_CLASS
      }
    })
  })

  it('serializes concurrent entry without double-spending a ticket', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats
         SET player_rank = 'TRAINEE', player_rank_stage = 'STAGE_I',
             updated_at = ?
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      ).bind(now, userId, seasonFromDate()),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_CONQUEST_TICKET', 2, 1, 0, 'test', ?, ?)`
      ).bind(userId, now, now)
    ])
    await provisionVerifiedConquestReadiness(env.AUTH_DB)
    await enableConstructedConquestForTest(env.AUTH_DB)

    const responses = await Promise.all([
      rpc('EnterConquest', { hero: Hero.ADA }),
      rpc('EnterConquest', { hero: Hero.SAMYA })
    ])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect(
      await Promise.all(responses.map(response => response.json()))
    ).toEqual([{ status: true }, { status: true }])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
      )
        .bind(userId)
        .first('balance')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquests WHERE user_id = ?`
      )
        .bind(userId)
        .first('count')
    ).toBe(1)
  })

  it('blocks a new entry while off-chain settlement is incomplete', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats
         SET player_rank = 'TRAINEE', player_rank_stage = 'STAGE_I',
             updated_at = ?
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      ).bind(now, userId, seasonFromDate()),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_CONQUEST_TICKET', 2, 2, 0, 'test', ?, ?)`
      ).bind(userId, now, now)
    ])
    const readiness = await provisionVerifiedConquestReadiness(env.AUTH_DB)
    await enableConstructedConquestForTest(env.AUTH_DB)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at, reward_pool_version)
       VALUES (?, ?, 'REWARDS_PENDING', 1, 'CONQUEST_CONSTRUCTED', 'ADA',
               'STR', '{"1":"LOSS"}', ?, ?, ?)`
    )
      .bind(
        `pending-entry-${crypto.randomUUID()}`,
        userId,
        now,
        now,
        readiness.poolVersion
      )
      .run()

    await expect(
      new ConquestRepository(env.AUTH_DB).enter(userId, Hero.SAMYA)
    ).rejects.toThrow('conquest rewards are still settling')
    expect((await rpc('EnterConquest', { hero: Hero.SAMYA })).status).toBe(500)
    expect(await (await rpc('ConquestStatus', {})).json()).toEqual({
      conquest: null
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT balance FROM player_items
            WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET'
              AND token_id = 2) AS balance,
           (SELECT COUNT(*) FROM player_conquests
            WHERE user_id = ?) AS conquests,
           (SELECT COUNT(*) FROM player_conquests
            WHERE user_id = ? AND status = 'IN_PROGRESS') AS in_progress`
      )
        .bind(userId, userId, userId)
        .first()
    ).toEqual({ balance: 2, conquests: 1, in_progress: 0 })
  })

  it('withholds Conquest projections until the source-atomic match publishes', async () => {
    const now = new Date().toISOString()
    const publishedProposal = `published-conquest-${crypto.randomUUID()}`
    const pendingProposal = `pending-conquest-${crypto.randomUUID()}`
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, status, winner_player, result_json, ended_at,
            created_at, updated_at)
         VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'projection-test',
                 '0x1111111111111111111111111111111111111111',
                 '0x2222222222222222222222222222222222222222', ?, NULL,
                 '{}', 'ended', 0, '{"status":"COMPLETED"}', ?, ?, ?)`
      ).bind(
        publishedProposal,
        `${publishedProposal}-replay`,
        userId,
        now,
        now,
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, status, created_at, updated_at)
         VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'projection-test',
                 '0x1111111111111111111111111111111111111111',
                 '0x2222222222222222222222222222222222222222', ?, NULL,
                 '{}', 'active', ?, ?)`
      ).bind(
        pendingProposal,
        `${pendingProposal}-replay`,
        userId,
        now,
        now
      )
    ])
    const matchRows = await env.AUTH_DB.prepare(
      `SELECT id, proposal_id FROM multiplayer_matches
       WHERE proposal_id IN (?, ?)`
    )
      .bind(publishedProposal, pendingProposal)
      .all<{ id: number; proposal_id: string }>()
    const matchId = (proposalId: string) =>
      matchRows.results.find(row => row.proposal_id === proposalId)!.id
    const publishedMatchId = matchId(publishedProposal)
    const pendingMatchId = matchId(pendingProposal)
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at)
       VALUES (?, ?, 'COMPLETED', 1, 'CONQUEST_CONSTRUCTED', 'ADA', 'STR',
               ?, ?, ?)`
    )
      .bind(
        `projection-entry-${crypto.randomUUID()}`,
        userId,
        JSON.stringify({
          [publishedMatchId]: ConquestMatchResult.WIN,
          [pendingMatchId]: ConquestMatchResult.LOSS
        }),
        now,
        now
      )
      .run()

    expect(await (await rpc('ConquestStatus', {})).json()).toMatchObject({
      conquest: {
        status: ConquestStatus.IN_PROGRESS,
        matchProgress: { [publishedMatchId]: ConquestMatchResult.WIN },
        endedAt: null
      }
    })
    expect(await (await rpc('ConquestStats', {})).json()).toMatchObject({
      stats: {
        constructedTicketsUsed: 1,
        constructedMatchesPlayed: 1,
        constructedWinRate: 100,
        constructedSilverCardsWon: 0,
        constructedGoldCardsWon: 0
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET status = 'ended', winner_player = 1,
           result_json = '{"status":"COMPLETED"}', ended_at = ?, updated_at = ?
       WHERE proposal_id = ?`
    )
      .bind(now, now, pendingProposal)
      .run()
    expect(await (await rpc('ConquestStatus', {})).json()).toEqual({
      conquest: null
    })
    expect(await (await rpc('ConquestStats', {})).json()).toMatchObject({
      stats: {
        constructedTicketsUsed: 1,
        constructedMatchesPlayed: 2,
        constructedWinRate: 50,
        constructedSilverCardsWon: 1,
        constructedGoldCardsWon: 0
      }
    })
  })

  it('recreates source conquest statistics in row insertion order', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquests
           (entry_key, user_id, status, nonce, mode, hero, deck_class,
            match_progress, created_at, ended_at)
         VALUES ('constructed-stats', ?, 'COMPLETED', 1,
                 'CONQUEST_CONSTRUCTED', 'ADA', 'STR', ?, ?, ?)`
      ).bind(userId, JSON.stringify({ 1: 'WIN', 2: 'LOSS' }), now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquests
           (entry_key, user_id, status, nonce, mode, hero, deck_class,
            match_progress, created_at, ended_at)
         VALUES ('discovery-stats', ?, 'COMPLETED', 2,
                 'CONQUEST_DISCOVERY', 'SAMYA', 'AGY', ?, ?, ?)`
      ).bind(
        userId,
        JSON.stringify({ 3: 'WIN', 4: 'WIN', 5: 'WIN' }),
        new Date(Date.parse(now) - 1_000).toISOString(),
        new Date(Date.parse(now) - 1_000).toISOString()
      )
    ])

    expect(await (await rpc('ConquestStats', {})).json()).toMatchObject({
      stats: {
        firstConquestMatchPlayed: now,
        constructedTicketsUsed: 1,
        constructedMatchesPlayed: 2,
        constructedWinRate: 50,
        constructedSilverCardsWon: 1,
        constructedGoldCardsWon: 0,
        discoveryTicketsUsed: 1,
        discoveryMatchesPlayed: 3,
        discoveryWinRate: 100,
        discoverySilverCardsWon: 1,
        discoveryGoldCardsWon: 1
      }
    })
  })

  it('preserves source float32 win-rate arithmetic and JSON precision', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at)
       VALUES ('constructed-float32-stats', ?, 'COMPLETED', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR', ?, ?, ?)`
    )
      .bind(
        userId,
        JSON.stringify({ 1: 'WIN', 2: 'LOSS', 3: 'DRAW' }),
        now,
        now
      )
      .run()

    const response = await rpc('ConquestStats', {})
    expect(await response.text()).toContain('"constructedWinRate":33.333336')
  })

  it('uses source raw JSONB object semantics for conquest statistics', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at)
       VALUES ('raw-jsonb-stats', ?, 'COMPLETED', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR', ?, ?, ?)`
    )
      .bind(
        userId,
        JSON.stringify({
          'not-a-match-id': 'WIN',
          '+01': 'WIN',
          '1': 'LOSS',
          future: 'FUTURE_VALUE',
          nested: { result: 'WIN' },
          nil: null,
          number: 1
        }),
        now,
        now
      )
      .run()

    expect(await (await rpc('ConquestStats', {})).json()).toMatchObject({
      stats: {
        constructedTicketsUsed: 1,
        constructedMatchesPlayed: 7,
        constructedWinRate: 28.57143,
        constructedSilverCardsWon: 2,
        constructedGoldCardsWon: 0
      }
    })
  })

  it('matches source typed-map decoding and fails malformed rows closed', async () => {
    const now = new Date().toISOString()
    await expect(
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquests
           (entry_key, user_id, status, nonce, mode, hero, deck_class,
            match_progress, created_at)
         VALUES ('invalid-json', ?, 'IN_PROGRESS', 1,
                 'CONQUEST_CONSTRUCTED', 'ADA', 'STR', '[', ?)`
      )
        .bind(userId, now)
        .run()
    ).rejects.toThrow('Conquest match progress must be valid JSON')

    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES ('typed-map', ?, 'IN_PROGRESS', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR', ?, ?)`
    )
      .bind(userId, '{"+01":"FUTURE_VALUE","0":"DRAW","2":null}', now)
      .run()

    expect(await (await rpc('ConquestStatus', {})).json()).toMatchObject({
      conquest: {
        matchProgress: {
          0: 'DRAW',
          1: 'UNKNOWN',
          2: 'UNKNOWN'
        }
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET match_progress = '[]'
       WHERE entry_key = 'typed-map'`
    ).run()
    expect((await rpc('ConquestStatus', {})).status).toBe(500)
    expect((await rpc('ConquestStats', {})).status).toBe(500)

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquests SET match_progress = '['
         WHERE entry_key = 'typed-map'`
      ).run()
    ).rejects.toThrow('Conquest match progress must be valid JSON')
  })
})
