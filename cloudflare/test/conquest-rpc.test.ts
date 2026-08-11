import { env } from 'cloudflare:workers'
import {
  ConquestStatus,
  GameMode,
  Hero,
  PlayerRank,
  PlayerRankStage
} from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const userId = 'conquest-player-user-id'

const rpc = async (method: string, body: object, signedIn = true) => {
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
  await env.AUTH_DB.prepare('DELETE FROM users').run()
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
    ).json<{ treasures: Record<string, unknown> }>()
    expect(Object.keys(treasures.treasures)).toHaveLength(11)

    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquest_points
         (user_id, event_id, current_points, total_points, updated_at)
       VALUES (?, 2, 900, 1400, ?)`
    )
      .bind(userId, now)
      .run()
    expect(await (await rpc('ConquestV2Progress', {})).json()).toEqual({
      progress: {
        treasureLevel: 2,
        treasurePoints: 150,
        treasurePointsRequired: 600
      }
    })
  })

  it('spends one source non-tradable ticket and enters only once', async () => {
    expect((await rpc('EnterConquest', {})).status).toBe(400)
    expect((await rpc('EnterConquest', { hero: Hero.UNKNOWN })).status).toBe(
      500
    )
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
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2`
      )
        .bind(userId)
        .first('balance')
    ).toBe(1)

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

  it('recreates source conquest statistics from durable progress', async () => {
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
        new Date(Date.now() + 1_000).toISOString(),
        new Date(Date.now() + 1_000).toISOString()
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
})
