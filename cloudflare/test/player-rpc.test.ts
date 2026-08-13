import { env } from 'cloudflare:workers'
import { DeckClass, QuestPeriodicity } from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { encodeDeckString } from '../src/deck-codec'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
import { PlayerRepository, STARTER_CARD_IDS } from '../src/player'
import { questPeriodAt, sourceQuestSpec } from '../src/quest-library'

const testEnv = env as unknown as Env
const userId = 'rpc-player-user-id'
const identityReference = `identity:${userId}`

const rpcAs = async (
  sessionUserId: string,
  method: string,
  body: object,
  signedIn = true
) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      sessionUserId,
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

const rpc = (method: string, body: object, signedIn = true) =>
  rpcAs(userId, method, body, signedIn)

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Cloud Weasel Player', 'rpc-player@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('legacy player RPC compatibility', () => {
  it('presents a Google identity through the legacy account contract', async () => {
    const session = await rpc('GetSession', {})
    expect(session.status).toBe(200)
    expect(await session.json()).toMatchObject({
      address: identityReference,
      gamePrincipal: await deriveGamePrincipal(userId),
      account: {
        address: identityReference,
        name: 'Cloud Weasel Player',
        level: 1,
        seasonLevel: 1,
        isBurnerWallet: false
      }
    })

    const account = await rpc('GetAccount', { address: identityReference })
    expect(account.status).toBe(200)
    expect(await account.json()).toMatchObject({
      account: { address: identityReference, experience: 0, levelUpXP: 200 }
    })
  })

  it('persists source-compatible identity profile updates', async () => {
    const transitional = await rpc('UpdateAccount', {
      account: {
        address: identityReference,
        name: 'Cloud Weasel Player',
        locale: 'pt-BR',
        region: 'ca',
        tagArtID: 'bg-fire-01'
      }
    })
    expect(transitional.status).toBe(200)
    expect(await transitional.json()).toMatchObject({
      account: {
        name: 'Cloud Weasel Player',
        locale: 'pt-BR',
        region: 'CA',
        tagArtID: 'bg-fire-01'
      }
    })

    const renamed = await rpc('UpdateAccount', {
      account: {
        address: identityReference,
        name: 'Cloud.Weasel',
        locale: 'pt-BR',
        region: 'CA',
        tagArtID: 'bg-fire-01',
        settings: { hidePlayerNames: true }
      }
    })
    expect(renamed.status).toBe(200)
    expect(await renamed.json()).toMatchObject({
      account: {
        name: 'Cloud.Weasel',
        settings: { hidePlayerNames: true }
      }
    })

    const session = await rpc('GetSession', {})
    expect(await session.json()).toMatchObject({
      account: {
        name: 'Cloud.Weasel',
        locale: 'pt-BR',
        region: 'CA',
        tagArtID: 'bg-fire-01'
      }
    })
    const state = await new PlayerRepository(env.AUTH_DB).getState(userId)
    expect(state?.profile).toMatchObject({
      name: 'Cloud.Weasel',
      locale: 'pt-BR',
      region: 'CA',
      tagArtID: 'bg-fire-01'
    })
  })

  it('ports write-once invite attribution and source friend-point reads', async () => {
    const inviterUserId = 'rpc-inviter-user-id'
    const inviterReference = `identity:${inviterUserId}`
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Inviting Weasel', 'inviter@example.com', ?, ?)`
    )
      .bind(inviterUserId, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(inviterUserId)

    const self = await rpc('SetInvitedBy', {
      req: { address: identityReference, invitedBy: identityReference }
    })
    expect(self.status).toBe(400)

    // Preserve the source's successful no-op for a syntactically invalid
    // inviter address.
    const invalid = await rpc('SetInvitedBy', {
      req: { address: identityReference, invitedBy: 'not-an-account' }
    })
    expect(await invalid.json()).toEqual({ ok: true })

    const set = await rpc('SetInvitedBy', {
      req: { address: identityReference, invitedBy: inviterReference }
    })
    expect(set.status).toBe(200)
    expect(await set.json()).toEqual({ ok: true })

    const account = await rpc('GetAccount', { address: identityReference })
    expect(await account.json()).toMatchObject({
      account: { invitedBy: inviterReference }
    })
    const repeated = await rpc('SetInvitedBy', {
      req: { address: identityReference, invitedBy: inviterReference }
    })
    expect(repeated.status).toBe(403)

    const season = seasonFromDate()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_friend_points
           (invitee_user_id, inviter_user_id, season, levels,
            points_carried, points_spent, updated_at)
         VALUES (?, ?, ?, 3, 4, 1, ?), (?, ?, ?, 2, 0, 0, ?)`
      ).bind(
        userId,
        inviterUserId,
        season,
        now,
        userId,
        inviterUserId,
        season - 1,
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_STICKER_POINTS', 0, 7, 0, 'friend-level', ?, ?)`
      ).bind(inviterUserId, now, now)
    ])

    const gifted = await rpc('GetPointsGifted', {
      address: identityReference
    })
    expect(await gifted.json()).toMatchObject({
      total: 5,
      inviter: { address: inviterReference, name: 'Inviting Weasel' }
    })

    const friends = await rpcAs(inviterUserId, 'GetFriendPoints', {
      address: inviterReference
    })
    expect(await friends.json()).toMatchObject({
      total: 7,
      friends: [
        {
          account: {
            address: identityReference,
            invitedBy: inviterReference
          },
          season,
          levels: 3,
          points: 7,
          pointsSpent: 1
        }
      ]
    })
  })

  it('heals eligible pre-port accounts into the source Wanderer rank', async () => {
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_profiles SET level = 2, xp = 0 WHERE user_id = ?`
      ).bind(userId),
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats
         SET player_rank = 'UNRANKED', player_rank_stage = 'STAGE_NONE',
             player_rank_state = ''
         WHERE user_id = ?`
      ).bind(userId)
    ])

    const account = await rpc('GetAccount', { address: identityReference })
    expect(await account.json()).toMatchObject({
      account: {
        stats: {
          rankedConstructed: {
            playerRank: 'WANDERER',
            playerRankStage: 'STAGE_I',
            playerRankState: '[-1,1750,350,0]'
          },
          rankedDiscovery: {
            playerRank: 'WANDERER',
            playerRankStage: 'STAGE_I',
            playerRankState: '[-1,1750,350,0]'
          }
        }
      }
    })
  })

  it('exposes identity accounts publicly without private settings', async () => {
    const account = await rpc(
      'GetAccount',
      { address: identityReference },
      false
    )
    expect(account.status).toBe(200)
    const body = await account.json<{
      account: { name: string; settings?: unknown }
    }>()
    expect(body.account.name).toBe('Cloud Weasel Player')
    expect(body.account.settings).toBeUndefined()

    const exists = await rpc(
      'AccountExists',
      { address: identityReference },
      false
    )
    expect(await exists.json()).toEqual({
      exists: true,
      pending_migration: false
    })
    const named = await rpc(
      'AccountExistsByName',
      { name: 'cloud weasel player' },
      false
    )
    expect(await named.json()).toEqual({
      exists: true,
      pending_migration: false
    })
  })

  it('looks up accounts by trimmed, case-insensitive username', async () => {
    const publicAccount = await rpc(
      'GetAccountByUsername',
      { username: '  cLoUd WeAsEl PlAyEr' },
      false
    )
    expect(publicAccount.status).toBe(200)
    const publicBody = await publicAccount.json<{
      account: { address: string; name: string; settings?: unknown }
    }>()
    expect(publicBody.account).toMatchObject({
      address: identityReference,
      name: 'Cloud Weasel Player'
    })
    expect(publicBody.account.settings).toBeUndefined()

    const ownAccount = await rpc('GetAccountByUsername', {
      username: 'cloud weasel player'
    })
    expect(ownAccount.status).toBe(200)
    expect(await ownAccount.json()).toMatchObject({
      account: {
        address: identityReference,
        settings: { starterDeckV2Migration: true }
      }
    })

    const missing = await rpc(
      'GetAccountByUsername',
      { username: '  unknown player  ' },
      false
    )
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({
      status: 404,
      code: 'webrpc.not_found',
      msg: 'account not found'
    })

    const empty = await rpc('GetAccountByUsername', { username: '' }, false)
    expect(empty.status).toBe(400)
    const whitespace = await rpc(
      'GetAccountByUsername',
      { username: '   ' },
      false
    )
    expect(whitespace.status).toBe(404)
  })

  it('creates, retains, and explicitly rotates source-compatible spectate codes', async () => {
    const first = await rpc('GetPrivateSpectateCode', {})
    expect(first.status).toBe(200)
    const firstCode = (await first.json<{ code: string }>()).code
    expect(firstCode).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )

    const retained = await rpc('GetPrivateSpectateCode', { reset: false })
    expect(await retained.json()).toEqual({ code: firstCode })

    const ownAccount = await rpc('GetAccount', { address: identityReference })
    const ownBody = await ownAccount.json<{
      account: {
        settings: {
          spectateCode: string
          spectateCodeExpiresAt: string
        }
      }
    }>()
    expect(ownBody.account.settings.spectateCode).toBe(firstCode)
    expect(
      Date.parse(ownBody.account.settings.spectateCodeExpiresAt)
    ).toBeGreaterThan(Date.now() + 59 * 24 * 60 * 60 * 1000)

    const rotated = await rpc('GetPrivateSpectateCode', { reset: true })
    const rotatedCode = (await rotated.json<{ code: string }>()).code
    expect(rotatedCode).not.toBe(firstCode)

    const publicAccount = await rpc(
      'GetAccount',
      { address: identityReference },
      false
    )
    const publicBody = await publicAccount.json<{
      account: { settings?: unknown }
    }>()
    expect(publicBody.account.settings).toBeUndefined()
  })

  it('returns source-shaped current and historical account stats', async () => {
    const season = seasonFromDate()
    const account = await rpc('GetAccount', { address: identityReference })
    expect(await account.json()).toMatchObject({
      account: {
        stats: {
          rankedConstructed: {
            gameMode: 'RANKED_CONSTRUCTED',
            gamesPlayed: 0,
            playerRank: 'UNRANKED',
            playerRankStage: 'STAGE_NONE',
            season
          },
          rankedDiscovery: {
            gameMode: 'RANKED_DISCOVERY',
            gamesPlayed: 0,
            season
          }
        }
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET win_count = 3, loss_count = 1, score = 42,
           player_rank = 'WANDERER', player_rank_stage = 'STAGE_I'
       WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
         AND season = ?`
    )
      .bind(userId, season)
      .run()
    const response = await rpc(
      'GetAccountStats',
      { address: identityReference, seasons: [1, season] },
      false
    )
    expect(response.status).toBe(200)
    const body = await response.json<{
      constructedStats: Array<{
        season: number
        gamesPlayed: number
        winRatio: number
        score: number
      }>
      discoveryStats: Array<{ season: number; gamesPlayed: number }>
    }>()
    expect(body.constructedStats).toHaveLength(2)
    expect(body.discoveryStats).toHaveLength(2)
    expect(body.constructedStats[0]).toMatchObject({
      season: 1,
      gamesPlayed: 0,
      score: 0
    })
    expect(body.constructedStats[1]).toMatchObject({
      season,
      gamesPlayed: 4,
      winRatio: 0.75,
      score: 42
    })
  })

  it('lists and centers the source player leaderboard with stable paging', async () => {
    const season = seasonFromDate()
    const otherUsers = [
      ['leaderboard-a', 'Alpha.Weasel'],
      ['leaderboard-b', 'Beta.Weasel']
    ] as const
    const now = new Date().toISOString()
    for (const [id, name] of otherUsers) {
      await env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(id, name, `${id}@example.com`, now, now)
        .run()
      await new PlayerRepository(env.AUTH_DB).bootstrap(id)
    }
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats SET score = 20, player_rank = 'WANDERER',
             player_rank_stage = 'STAGE_I', updated_at = ?
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      ).bind(now, 'leaderboard-a', season),
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats SET score = 10, player_rank = 'WANDERER',
             player_rank_stage = 'STAGE_I', updated_at = ?
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = ?`
      ).bind(now, 'leaderboard-b', season)
    ])

    const first = await rpc(
      'ListLeaderboard',
      {
        page: { pageSize: 1 },
        req: { gameMode: 'RANKED_CONSTRUCTED', season }
      },
      false
    )
    expect(first.status).toBe(200)
    const firstBody = await first.json<{
      page: { hasBefore: boolean; after: string }
      res: Array<{
        account: { name: string }
        rank: number
        rankedSilverReward: number
        rankedTicketReward: number
      }>
    }>()
    expect(firstBody.res).toEqual([
      expect.objectContaining({
        account: expect.objectContaining({ name: 'Alpha.Weasel' }),
        rank: 1,
        rankedSilverReward: 10,
        rankedTicketReward: 2
      })
    ])
    expect(firstBody.page.hasBefore).toBe(true)

    const next = await rpc(
      'ListLeaderboard',
      {
        page: { pageSize: 1, before: firstBody.page.after },
        req: { gameMode: 'RANKED_CONSTRUCTED', season }
      },
      false
    )
    expect(await next.json()).toMatchObject({
      res: [
        {
          account: { name: 'Beta.Weasel' },
          rank: 2,
          accountStat: { score: 10 },
          rankedSilverReward: 9,
          rankedTicketReward: 2
        }
      ]
    })

    const centered = await rpc('AccountLeaderboard', {
      page: { pageSize: 3 },
      req: {
        accountAddress: identityReference,
        gameMode: 'RANKED_CONSTRUCTED',
        season
      }
    })
    expect(centered.status).toBe(200)
    expect(
      (
        await centered.json<{ res: Array<{ account: { address: string } }> }>()
      ).res.map(entry => entry.account.address)
    ).toContain(identityReference)
  })

  it('lists only the signed-in player source-visible match history', async () => {
    const otherUserId = 'match-history-opponent'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'History Opponent', 'history@example.com', ?, ?)`
    )
      .bind(otherUserId, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(otherUserId)
    const payload = JSON.stringify({
      match: {
        player1: {
          privateSeed: { cards: ['6'], prisms: ['str'] },
          gameMode: 'RANKED_CONSTRUCTED',
          account: {
            id: 1,
            address: '0x1111111111111111111111111111111111111111',
            name: 'Cloud Weasel Player'
          },
          playerSessionID: 'p1',
          botSubkey: false
        },
        player2: {
          privateSeed: { cards: ['6'], prisms: ['str'] },
          gameMode: 'RANKED_CONSTRUCTED',
          account: {
            id: 2,
            address: '0x2222222222222222222222222222222222222222',
            name: 'History Opponent'
          },
          playerSessionID: 'p2',
          botSubkey: false
        }
      }
    })
    for (const [proposal, mode] of [
      ['ranked-history', 'RANKED_CONSTRUCTED'],
      ['practice-hidden', 'PRACTICE_BOT']
    ]) {
      await env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, server_address, status, created_at, updated_at,
            winner_player, result_json, ended_at)
         VALUES (?, ?, ?, 'test', ?, ?, ?, ?, ?, NULL, 'ended', ?, ?, 0, ?, ?)`
      )
        .bind(
          proposal,
          `${proposal}-replay`,
          mode,
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
          userId,
          otherUserId,
          payload,
          now,
          now,
          JSON.stringify({ winner: 0, turnCount: 4, moveCount: 8 }),
          now
        )
        .run()
    }

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET player1_mode = 'PRACTICE_PVP',
           player2_mode = 'RANKED_CONSTRUCTED'
       WHERE proposal_id = 'ranked-history'`
    ).run()

    const response = await rpc('ListMatches', {
      page: { pageSize: 5 },
      req: { accountAddress: identityReference }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      res: [
        {
          status: 'COMPLETED',
          player1: {
            address: identityReference,
            name: 'Cloud Weasel Player',
            deckClass: 'STR',
            isBot: false
          },
          player2: {
            address: `identity:${otherUserId}`,
            name: 'History Opponent'
          },
          winningPlayer: 1,
          player1GameMode: 'PRACTICE_PVP',
          player2GameMode: 'RANKED_CONSTRUCTED',
          turnNonce: 4,
          replayID: 'ranked-history-replay'
        }
      ]
    })
    expect(
      (
        await rpc('ListMatches', {
          req: { accountAddress: `identity:${otherUserId}` }
        })
      ).status
    ).toBe(403)

    const rankedRow = await env.AUTH_DB.prepare(
      `SELECT id FROM multiplayer_matches WHERE proposal_id = 'ranked-history'`
    ).first<{ id: number }>()
    const practiceRow = await env.AUTH_DB.prepare(
      `SELECT id FROM multiplayer_matches WHERE proposal_id = 'practice-hidden'`
    ).first<{ id: number }>()
    expect(
      await (await rpc('GetMatch', { matchID: rankedRow!.id })).json()
    ).toMatchObject({
      match: {
        id: rankedRow!.id,
        player1: { address: identityReference },
        replayID: 'ranked-history-replay'
      }
    })
    expect(
      await (await rpc('GetMatch', { matchID: practiceRow!.id })).json()
    ).toMatchObject({
      match: {
        id: practiceRow!.id,
        replayID: 'practice-hidden-replay'
      }
    })
    const outsiderId = 'match-history-outsider'
    await env.AUTH_DB.prepare(
      `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'History Outsider', 'outsider@example.com', ?, ?)`
    )
      .bind(outsiderId, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(outsiderId)
    expect(
      await (
        await rpcAs(outsiderId, 'GetMatch', { matchID: rankedRow!.id })
      ).json()
    ).toMatchObject({ match: { id: rankedRow!.id, replayID: '' } })
    expect(
      (
        await rpcAs(outsiderId, 'GetMatch', { matchID: practiceRow!.id })
      ).status
    ).toBe(404)
    expect((await rpc('GetMatch', { matchID: 0 })).status).toBe(400)
    expect((await rpc('GetMatch', { matchID: 999999 })).status).toBe(404)
    expect(
      (await rpc('GetMatch', { matchID: rankedRow!.id }, false)).status
    ).toBe(401)
  })

  it('rebuilds the source profile feed from durable reward and rank receipts', async () => {
    const skypassReward = await env.AUTH_DB.prepare(
      `SELECT id FROM skypass_rewards
       WHERE item_type = 300
       ORDER BY id ASC LIMIT 1`
    ).first<{ id: number }>()
    expect(skypassReward).not.toBeNull()
    const older = '2026-08-10T10:00:00.000Z'
    const newer = '2026-08-10T11:00:00.000Z'
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_rank_up_rewards
           (user_id, game_mode, season, player_rank, player_rank_stage,
            proposal_id, awarded_at)
         VALUES (?, 'RANKED_CONSTRUCTED', 62, 'APPRENTICE', 'STAGE_II',
                 'feed-rank-proposal', ?)`
      ).bind(userId, older),
      env.AUTH_DB.prepare(
        `INSERT INTO player_skypass_claims
           (user_id, reward_id, rewards, claimed_at)
         VALUES (?, ?, ?, ?)`
      ).bind(
        userId,
        skypassReward!.id,
        JSON.stringify([
          {
            type: 'CARD',
            card: {
              card: { id: 42, itemType: 'SW_BASE_CARDS' }
            }
          }
        ]),
        newer
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquests
           (entry_key, user_id, status, nonce, mode, hero, deck_class,
            match_progress, created_at, ended_at)
         VALUES ('feed-conquest', ?, 'COMPLETED', 1,
                 'CONQUEST_CONSTRUCTED', 'ADA', 'STR', '{"42":"WIN"}', ?, ?)`
      ).bind(userId, newer, newer)
    ])
    const conquest = await env.AUTH_DB.prepare(
      `SELECT id FROM player_conquests WHERE entry_key = 'feed-conquest'`
    ).first<{ id: number }>()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquest_feed_events
         (user_id, conquest_id, event_type, token_ids_json, created_at)
       VALUES (?, ?, 'DELAYED_REWARD', '[131208]', ?)`
    )
      .bind(userId, conquest!.id, new Date(Date.parse(newer) + 1_000).toISOString())
      .run()

    const first = await rpc('GetFeed', {
      page: { pageSize: 1 },
      req: { accountAddress: identityReference }
    })
    expect(first.status).toBe(200)
    const firstPage = await first.json<{
      page: { hasBefore: boolean; after: string }
      res: Array<{ type: string; tokenIds?: number[] }>
    }>()
    expect(firstPage).toMatchObject({
      page: { hasBefore: true },
      res: [{ type: 'DELAYED_REWARD', tokenIds: [131208] }]
    })

    const second = await rpc('GetFeed', {
      page: { pageSize: 1, before: firstPage.page.after },
      req: { accountAddress: identityReference }
    })
    const secondPage = await second.json<{
      page: { hasAfter: boolean; hasBefore: boolean; after: string }
      res: Array<{ type: string; tokenIds?: number[] }>
    }>()
    expect(secondPage).toMatchObject({
      page: { hasAfter: true, hasBefore: true },
      res: [{ type: 'REWARD', tokenIds: [(0xff << 16) + 42] }]
    })
    const third = await rpc('GetFeed', {
      page: { pageSize: 1, before: secondPage.page.after },
      req: { accountAddress: identityReference }
    })
    expect(await third.json()).toMatchObject({
      page: { hasAfter: true, hasBefore: false },
      res: [{
        type: 'RANKUP',
        playerRank: 'APPRENTICE',
        playerRankStage: 'STAGE_II',
        gameMode: 'RANKED_CONSTRUCTED'
      }]
    })

    const filtered = await rpc('GetFeed', {
      req: {
        accountAddress: identityReference,
        types: ['RANKUP']
      }
    })
    expect(await filtered.json()).toMatchObject({
      res: [{ type: 'RANKUP' }]
    })
    expect(
      (
        await rpc('GetFeed', {
          page: { before: 'not-a-cursor' },
          req: { accountAddress: identityReference }
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpc(
          'GetFeed',
          { req: { accountAddress: identityReference } },
          false
        )
      ).status
    ).toBe(401)
  })

  it('enforces profile ownership, username uniqueness, and title ownership', async () => {
    const now = new Date().toISOString()
    const otherUserId = 'other-profile-user'
    await env.AUTH_DB.prepare(
      `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Taken.Name', 'taken@example.com', ?, ?)`
    )
      .bind(otherUserId, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(otherUserId)

    expect(
      (
        await rpc('UpdateAccount', {
          account: {
            address: identityReference,
            name: 'taken.name',
            locale: 'en'
          }
        })
      ).status
    ).toBe(409)
    expect(
      (
        await rpc('UpdateAccount', {
          account: {
            address: `identity:${otherUserId}`,
            name: 'Valid.Name',
            locale: 'en'
          }
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpc('UpdateAccount', {
          account: {
            address: identityReference,
            name: 'bad name',
            locale: 'en'
          }
        })
      ).status
    ).toBe(400)
    expect(
      (
        await rpc('UpdateAccount', {
          account: {
            address: identityReference,
            name: 'Valid.Name',
            locale: 'en',
            titleID: 999
          }
        })
      ).status
    ).toBe(400)
  })

  it('returns the starter deck with the existing ListDecks shape', async () => {
    const response = await rpc('ListDecks', {})
    expect(response.status).toBe(200)
    const body = await response.json<{
      page: { pageSize: number }
      res: Array<{
        class: string
        cardIds: number[]
        deckType: string
        deckString: string
      }>
    }>()

    expect(body.page.pageSize).toBe(200)
    expect(body.res).toHaveLength(5)
    expect(body.res).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: 'STR',
          cardIds: STARTER_CARD_IDS,
          deckType: 'UNLOCKED_STARTER',
          deckString: expect.stringMatching(/^SWxSTR/)
        }),
        expect.objectContaining({
          class: 'AGY',
          deckType: 'LOCKED_STARTER',
          deckString: expect.stringMatching(/^SWxAGY/)
        })
      ])
    )
  })

  it('searches private decks with source filters and cursor pagination', async () => {
    const filtered = await rpc('SearchDecks', {
      req: { name: 'STARTER', class: 'STR' }
    })
    expect(filtered.status).toBe(200)
    expect(await filtered.json()).toMatchObject({
      page: { pageSize: 20, hasBefore: false, hasAfter: false },
      res: [expect.objectContaining({ name: 'Ada Starter', class: 'STR' })]
    })

    const first = await rpc('SearchDecks', {
      req: {},
      page: { pageSize: 2 }
    })
    expect(first.status).toBe(200)
    const firstBody = await first.json<{
      page: { before: string; hasBefore: boolean; hasAfter: boolean }
      res: Array<{ name: string }>
    }>()
    expect(firstBody.res.map(deck => deck.name)).toEqual([
      'Ada Starter',
      'Ari Starter'
    ])
    expect(firstBody.page).toMatchObject({
      hasBefore: true,
      hasAfter: false,
      before: expect.any(String)
    })

    const second = await rpc('SearchDecks', {
      req: {},
      page: { pageSize: 2, before: firstBody.page.before }
    })
    expect(second.status).toBe(200)
    const secondBody = await second.json<{
      page: { hasBefore: boolean; hasAfter: boolean; after: string }
      res: Array<{ name: string }>
    }>()
    expect(secondBody.res.map(deck => deck.name)).toEqual([
      'Bouran Starter',
      'Lotus Starter'
    ])
    expect(secondBody.page).toMatchObject({
      hasBefore: true,
      hasAfter: true,
      after: expect.any(String)
    })

    expect(
      (
        await rpc('SearchDecks', {
          req: {},
          page: { before: firstBody.page.before, after: firstBody.page.before }
        })
      ).status
    ).toBe(400)
    expect((await rpc('SearchDecks', { req: {} }, false)).status).toBe(401)
  })

  it('checks deck ownership and class unlocks with source semantics', async () => {
    const decks = await rpc('ListDecks', {})
    const listed = (
      await decks.json<{
        res: Array<{
          uuid: string
          class: string
          deckString: string
          cardIds: number[]
        }>
      }>()
    ).res
    const strength = listed.find(deck => deck.class === 'STR')!
    const agility = listed.find(deck => deck.class === 'AGY')!

    expect(
      await (await rpc('CheckDeck', { req: { uuid: strength.uuid } })).json()
    ).toEqual({
      res: {
        containsInvalid: false,
        accountOwnsAllCards: true,
        unlockedClass: true
      }
    })
    expect(
      await (
        await rpc('CheckDeck', { req: { deckString: agility.deckString } })
      ).json()
    ).toEqual({
      res: {
        containsInvalid: false,
        accountOwnsAllCards: false,
        unlockedClass: false
      }
    })
    expect(
      await (
        await rpc('CheckDeck', {
          req: { deckString: encodeDeckString([], DeckClass.STR) }
        })
      ).json()
    ).toEqual({
      res: {
        containsInvalid: false,
        accountOwnsAllCards: true,
        unlockedClass: true
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_items SET balance = 0
       WHERE user_id = ? AND item_type = 'SW_BASE_CARDS' AND token_id = ?`
    )
      .bind(userId, strength.cardIds[0])
      .run()
    expect(
      await (await rpc('CheckDeck', { req: { uuid: strength.uuid } })).json()
    ).toMatchObject({ res: { accountOwnsAllCards: false } })

    expect((await rpc('CheckDeck', { req: {} }, false)).status).toBe(401)
  })

  it('creates, reads, updates, and deletes decks through legacy contracts', async () => {
    const createdResponse = await rpc('CreateDeck', {
      req: {
        name: 'Practice Copy',
        class: 'STR',
        cardIds: STARTER_CARD_IDS,
        art: '140'
      }
    })
    expect(createdResponse.status).toBe(200)
    const created = (
      await createdResponse.json<{
        res: {
          uuid: string
          name: string
          deckString: string
          deckType: string
        }
      }>()
    ).res
    expect(created).toMatchObject({
      name: 'Practice Copy',
      deckString: expect.stringMatching(/^SWxSTR02/),
      deckType: 'CUSTOM'
    })

    const fetched = await rpc('GetDeck', { req: { uuid: created.uuid } })
    expect(await fetched.json()).toMatchObject({
      res: { uuid: created.uuid, name: 'Practice Copy' }
    })

    const favorited = await rpc('ToggleDeckFavorite', { uuid: created.uuid })
    expect(await favorited.json()).toEqual({ isFavorite: true })
    expect(
      await (
        await rpc('GetDeck', { req: { uuid: created.uuid } })
      ).json()
    ).toMatchObject({
      res: {
        uuid: created.uuid,
        isFavorite: true,
        favoritedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      }
    })
    const unfavorited = await rpc('ToggleDeckFavorite', { uuid: created.uuid })
    expect(await unfavorited.json()).toEqual({ isFavorite: false })
    expect(
      await (
        await rpc('GetDeck', { req: { uuid: created.uuid } })
      ).json()
    ).toMatchObject({
      res: { uuid: created.uuid, isFavorite: false, favoritedAt: '' }
    })

    const concurrentToggles = await Promise.all([
      rpc('ToggleDeckFavorite', { uuid: created.uuid }),
      rpc('ToggleDeckFavorite', { uuid: created.uuid })
    ])
    expect(
      (
        await Promise.all(
          concurrentToggles.map(response =>
            response.json<{ isFavorite: boolean }>()
          )
        )
      )
        .map(response => response.isFavorite)
        .sort()
    ).toEqual([false, true])
    expect(
      await (
        await rpc('GetDeck', { req: { uuid: created.uuid } })
      ).json()
    ).toMatchObject({ res: { isFavorite: false } })
    expect(
      (
        await rpcAs('another-player', 'ToggleDeckFavorite', {
          uuid: created.uuid
        })
      ).status
    ).toBe(500)

    const updated = await rpc('UpdateDeck', {
      req: {
        uuid: created.uuid,
        deck: {
          deckString: created.deckString,
          name: 'Renamed Practice Copy',
          class: 'STR',
          art: '98'
        }
      }
    })
    expect(await updated.json()).toMatchObject({
      res: {
        uuid: created.uuid,
        name: 'Renamed Practice Copy',
        art: '98',
        isNew: false
      }
    })

    const deleted = await rpc('DeleteDeck', { req: { uuid: created.uuid } })
    expect(await deleted.json()).toEqual({ ok: true })
    const decks = await rpc('ListDecks', {})
    expect((await decks.json<{ res: unknown[] }>()).res).toHaveLength(5)
  })

  it('requires a deck selector before deletion', async () => {
    expect((await rpc('DeleteDeck', { req: {} })).status).toBe(400)
  })

  it('returns item and card ownership using legacy balance semantics', async () => {
    const itemsResponse = await rpc('GetItemOwnershipByType', {
      accountAddress: identityReference,
      itemTypes: ['SW_BASE_CARDS']
    })
    const itemsBody = await itemsResponse.json<{
      items: Array<{ itemType: string; tokenID: number; balance: string }>
    }>()
    expect(itemsBody.items).toHaveLength(30)
    expect(itemsBody.items[0]).toMatchObject({
      itemType: 'SW_BASE_CARDS',
      balance: '1'
    })

    const ownershipResponse = await rpc('GetCardOwnership', {
      accountAddress: identityReference,
      contractQuery: false
    })
    const { res } = await ownershipResponse.json<{
      res: {
        unlockedCards: number
        lockedCards: number
        unlockedCardsByClass: Record<string, number>
        unlockedCardsByFrame: Record<string, number>
        cardBalances: Record<string, Record<string, { balance: string }>>
      }
    }>()
    expect(res.unlockedCards).toBe(30)
    expect(res.lockedCards).toBe(826)
    expect(res.unlockedCardsByClass.STR).toBe(30)
    expect(res.unlockedCardsByFrame.SW_BASE_CARDS).toBe(30)
    expect(res.cardBalances['6']).toMatchObject({
      SW_BASE_CARDS: { balance: '1' },
      SW_SILVER_CARDS: { balance: '0' },
      SW_GOLD_CARDS: { balance: '0' }
    })
  })

  it('summarizes identity inventory and public Cloud Weasel item supply', async () => {
    const now = new Date().toISOString()
    const otherUserId = 'item-supply-peer'
    await env.AUTH_DB.prepare(
      `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Supply Peer', 'supply-peer@example.com', ?, ?)`
    )
      .bind(otherUserId, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(otherUserId)
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_SILVER_CARDS', 42, 2, 0, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_GOLD_CARDS', 42, 3, 0, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_CONQUEST_TICKET', 1, 4, 0, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_SILVER_CARDS', 42, 5, 0, 'test', ?, ?)`
      ).bind(otherUserId, now, now)
    ])

    const summary = await rpc('GetItemSummary', {
      accountAddress: identityReference
    })
    expect(await summary.json()).toMatchObject({
      summary: {
        USDC: { itemType: 'USDC', totalBalance: '0' },
        SW_SILVER_CARDS: { totalBalance: '2' },
        SW_GOLD_CARDS: { totalBalance: '3' },
        SW_CONQUEST_TICKET: { totalBalance: '4' }
      }
    })

    const cardSearch = await rpc('SearchCards', {
      req: {
        criteria: {
          ids: [42],
          itemType: 'SW_SILVER_CARDS',
          ownedCards: true
        },
        includeUserBalances: true,
        contractQuery: false
      }
    })
    expect(await cardSearch.json()).toMatchObject({
      res: [
        {
          card: { id: 42 },
          balance: '5',
          balanceByType: {
            SW_SILVER_CARDS: { balance: '2' },
            SW_GOLD_CARDS: { balance: '3' }
          }
        }
      ]
    })

    const supply = await rpc('GetItemSupply', { tokenID: 42 }, false)
    expect(supply.status).toBe(200)
    expect(await supply.json()).toMatchObject({
      summary: {
        SW_SILVER_CARDS: { tokenID: 42, balance: '7' },
        SW_GOLD_CARDS: { tokenID: 42, balance: '3' }
      }
    })

    expect(
      await (
        await rpc(
          'GetBatchItemSupply',
          { tokenIDs: [42, 999, 42] },
          false
        )
      ).json()
    ).toMatchObject({
      summary: {
        42: {
          SW_SILVER_CARDS: { tokenID: 42, balance: '7' },
          SW_GOLD_CARDS: { tokenID: 42, balance: '3' }
        }
      }
    })
    expect(
      (
        await rpc(
          'GetBatchItemSupply',
          { tokenIDs: Array.from({ length: 51 }, (_, index) => index) },
          false
        )
      ).status
    ).toBe(400)

    expect(
      await (
        await rpc(
          'GetItemSuppliesByType',
          { itemTypes: ['SW_SILVER_CARDS', 'SW_GOLD_CARDS'] },
          false
        )
      ).json()
    ).toEqual({
      summary: {
        401: [
          {
            itemID: 42,
            itemType: 'SW_SILVER_CARDS',
            totalBalance: '7'
          }
        ],
        402: [
          {
            itemID: 42,
            itemType: 'SW_GOLD_CARDS',
            totalBalance: '3'
          }
        ]
      }
    })
    expect(
      (
        await rpc('GetItemSuppliesByType', { itemTypes: [] }, false)
      ).status
    ).toBe(400)

    expect(
      (
        await rpc('GetItemSummary', {
          accountAddress: `identity:${otherUserId}`
        })
      ).status
    ).toBe(403)
    expect((await rpc('GetItemSupply', { tokenID: -1 }, false)).status).toBe(
      400
    )
  })

  it('faithfully equips owned stickers and card backs for game decks', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_STICKERS', 5, 1, 0, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_CARD_BACKS', 7, 1, 0, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_CARD_BACKS', 8, 1, 0, 'test', ?, ?)`
      ).bind(userId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_HERO_SKINS', 1, 1, 0, 'test', ?, ?)`
      ).bind(userId, now, now)
    ])

    const sticker = await rpc('EquipItem', {
      itemType: 'SW_STICKERS',
      tokenID: 5
    })
    expect(sticker.status).toBe(200)
    expect(await sticker.json()).toMatchObject({
      item: { itemType: 'SW_STICKERS', tokenID: 5, balance: '1' }
    })
    expect(
      (
        await rpc('EquipItem', {
          itemType: 'SW_STICKERS',
          tokenID: 5
        })
      ).status
    ).toBe(200)
    for (const tokenID of [7, 8]) {
      expect(
        (
          await rpc('EquipItem', {
            itemType: 'SW_CARD_BACKS',
            tokenID
          })
        ).status
      ).toBe(200)
    }

    const listed = await rpc('ListEquippedItems', {
      itemType: 'SW_CARD_BACKS'
    })
    expect(await listed.json()).toMatchObject({
      items: [
        { itemType: 'SW_CARD_BACKS', tokenID: 7 },
        { itemType: 'SW_CARD_BACKS', tokenID: 8 }
      ]
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_items_equipped WHERE user_id = ?`
      )
        .bind(userId)
        .first('count')
    ).toBe(3)

    const decks = await rpc('ListDecks', {})
    const adaDeck = (
      await decks.json<{ res: Array<{ class: string; deckString: string }> }>()
    ).res.find(deck => deck.class === 'STR')!
    const equipment = await rpc('GetDeckEquipmentByDeckString', {
      accountAddress: 'identity:ignored-by-authenticated-source-contract',
      deckString: adaDeck.deckString
    })
    expect(await equipment.json()).toMatchObject({
      deckEquipment: {
        stickers: [5],
        heroSkin: 1,
        cardBack: expect.toSatisfy((value: number) => [7, 8].includes(value))
      }
    })

    await env.AUTH_DB.prepare(
      `UPDATE player_items SET balance = 0
       WHERE user_id = ? AND item_type = 'SW_CARD_BACKS' AND token_id = 7`
    )
      .bind(userId)
      .run()
    expect(
      await (
        await rpc('GetDeckEquipmentByDeckString', {
          deckString: adaDeck.deckString
        })
      ).json()
    ).toMatchObject({ deckEquipment: { cardBack: 8 } })

    expect(
      await (
        await rpc('UnequipItem', {
          itemType: 'SW_STICKERS',
          tokenID: 5
        })
      ).json()
    ).toEqual({ ok: true })
    expect(
      await (await rpc('ListEquippedItems', { itemType: 'SW_STICKERS' })).json()
    ).toEqual({ items: [] })
  })

  it('refuses to equip unsupported or unowned inventory', async () => {
    expect(
      (
        await rpc('EquipItem', {
          itemType: 'SW_BASE_CARDS',
          tokenID: STARTER_CARD_IDS[0]
        })
      ).status
    ).toBe(400)
    const unowned = await rpc('EquipItem', {
      itemType: 'SW_STICKERS',
      tokenID: 999
    })
    expect(unowned.status).toBe(404)
    expect(await unowned.json()).toMatchObject({ msg: 'item is not owned' })
    expect((await rpc('ListEquippedItems', {}, false)).status).toBe(401)
  })

  it('uses the original quest response fields and starter quest types', async () => {
    const response = await rpc('ListQuests', {
      accountAddress: identityReference
    })
    const body = await response.json<{
      quests: Array<{
        id: number
        questType: string
        position: number
        periodicity: string
        reward: { itemType: string; amount: number }
      }>
      rewards: unknown[]
    }>()

    expect(body.rewards).toEqual([])
    expect(
      body.quests.map(({ questType, position }) => ({ questType, position }))
    ).toEqual([
      { questType: 'OntheRoadAgain', position: 1 },
      { questType: 'WelcomeOpenSky', position: 2 },
      { questType: 'HerosJourney', position: 3 }
    ])
    expect(body.quests[0]).toMatchObject({
      periodicity: 'DAILY',
      reward: { itemType: 'SW_XP', amount: 100 }
    })

    const seen = await rpc('SetQuestsAsSeen', {
      ids: body.quests.map(quest => quest.id)
    })
    expect(await seen.json()).toEqual({ status: true })
    const refreshed = await rpc('ListQuests', {
      accountAddress: identityReference
    })
    expect(
      (await refreshed.json<{ quests: Array<{ isNew: boolean }> }>()).quests
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ isNew: false })])
    )
  })

  it('claims quest XP and advances the exact legacy epic chain', async () => {
    const initialChain = await rpc('GetEpicQuestChain', {
      epicType: 'starter2_test'
    })
    expect(initialChain.status).toBe(200)
    const initialQuests = (
      await initialChain.json<{
        quests: Array<{
          id: number
          epicIndex: number
          isClaimed: boolean
          isClaimable: boolean
        }>
      }>()
    ).quests
    expect(initialQuests.map(quest => quest.epicIndex)).toEqual([1, 2, 3, 4, 5])
    expect(initialQuests[0]).toMatchObject({
      id: expect.any(Number),
      isClaimable: true,
      isClaimed: false
    })
    expect(initialQuests.slice(1).every(quest => quest.id === 0)).toBe(true)

    const list = await rpc('ListQuests', {
      accountAddress: identityReference
    })
    const welcome = (
      await list.json<{
        quests: Array<{ id: number; questType: string; isClaimable: boolean }>
      }>()
    ).quests.find(quest => quest.questType === 'WelcomeOpenSky')
    expect(welcome).toMatchObject({ isClaimable: true })

    const claimed = await rpc('ClaimQuestRewards', { ids: [welcome!.id] })
    expect(claimed.status).toBe(200)
    expect(await claimed.json()).toMatchObject({
      quest: {
        questType: 'AnEnemyApproaches',
        epicType: 'starter2_test',
        epicIndex: 2,
        epicLength: 5,
        progress: 0,
        endProgress: 10,
        reward: { itemType: 'SW_XP', amount: 200 }
      },
      rewards: [
        {
          accountID: 0,
          type: 'EXP',
          exp: {
            amount: 300,
            reason: 'RankUp',
            currentLevel: 2,
            requiredExp: 200,
            beforeMatchExp: 0
          }
        },
        {
          accountID: 0,
          type: 'RANK',
          gameMode: 'RANKED_CONSTRUCTED',
          rank: {
            beforeMatch: {
              rank: 'UNRANKED',
              rankStage: 'STAGE_I',
              score: 0
            },
            afterMatch: {
              rank: 'WANDERER',
              rankStage: 'STAGE_I',
              score: 0,
              requiredRankPoints: 100
            }
          }
        }
      ]
    })

    expect(
      await (
        await rpc('GetEpicQuestChain', { epicType: 'starter2_test' })
      ).json()
    ).toMatchObject({
      quests: [
        { epicIndex: 1, isClaimed: true },
        { epicIndex: 2, isClaimed: false, id: expect.any(Number) },
        { epicIndex: 3, id: 0 },
        { epicIndex: 4, id: 0 },
        { epicIndex: 5, id: 0 }
      ]
    })

    const account = await rpc('GetAccount', { address: identityReference })
    expect(await account.json()).toMatchObject({
      account: {
        level: 2,
        experience: 100,
        levelUpXP: 200,
        seasonLevel: 2,
        stats: {
          rankedConstructed: {
            playerRank: 'WANDERER',
            playerRankStage: 'STAGE_I',
            score: 0
          },
          rankedDiscovery: {
            playerRank: 'WANDERER',
            playerRankStage: 'STAGE_I',
            score: 0
          }
        }
      }
    })

    const refreshed = await rpc('ListQuests', {
      accountAddress: identityReference
    })
    const questTypes = (
      await refreshed.json<{ quests: Array<{ questType: string }> }>()
    ).quests.map(quest => quest.questType)
    expect(questTypes).not.toContain('WelcomeOpenSky')
    expect(questTypes).toContain('AnEnemyApproaches')
  })

  it('rejects claims for quests that are not complete', async () => {
    const list = await rpc('ListQuests', {})
    const road = (
      await list.json<{
        quests: Array<{ id: number; questType: string }>
      }>()
    ).quests.find(quest => quest.questType === 'OntheRoadAgain')

    const response = await rpc('ClaimQuestRewards', { ids: [road!.id] })
    expect(response.status).toBe(500)
  })

  it('credits concurrent completed quest claims exactly once each', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_quests
         SET status = 'complete', progress = target, active = 0, updated_at = ?
         WHERE user_id = ?`
      ).bind(now, userId),
      env.AUTH_DB.prepare(
        `INSERT INTO player_quests
           (user_id, quest_key, title, description, progress, target,
            reward_xp, status, created_at, updated_at, quest_type, position,
            periodicity, is_rerollable, is_new, active, period, rerolls)
         VALUES (?, 'concurrent-quest-a', 'Concurrent A', 'Test', 1, 1, 125,
                 'complete', ?, ?, 'WinGames', 1, 'WEEKLY', 0, 1, 1, 1, 0),
                (?, 'concurrent-quest-b', 'Concurrent B', 'Test', 1, 1, 175,
                 'complete', ?, ?, 'PlayGames', 2, 'WEEKLY', 0, 1, 1, 1, 0)`
      ).bind(userId, now, now, userId, now, now)
    ])
    const rows = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? AND quest_key IN ('concurrent-quest-a', 'concurrent-quest-b')
       ORDER BY quest_key`
    )
      .bind(userId)
      .all<{ id: number }>()

    const responses = await Promise.all(
      rows.results.map(row => rpc('ClaimQuestRewards', { ids: [row.id] }))
    )
    expect(responses.every(response => response.status === 200)).toBe(true)

    const profile = await env.AUTH_DB.prepare(
      `SELECT level, xp FROM player_profiles WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ level: number; xp: number }>()
    expect(profile).toEqual({ level: 2, xp: 100 })

    const receipts = await env.AUTH_DB.prepare(
      `SELECT reward_xp, before_level, before_xp, after_level, after_xp
       FROM player_quest_claim_receipts WHERE user_id = ?
       ORDER BY ((before_level - 1) * 200) + before_xp`
    )
      .bind(userId)
      .all<{
        reward_xp: number
        before_level: number
        before_xp: number
        after_level: number
        after_xp: number
      }>()
    expect(receipts.results).toHaveLength(2)
    expect(
      receipts.results.reduce((total, row) => total + row.reward_xp, 0)
    ).toBe(300)
    expect(receipts.results[0]).toMatchObject({
      before_level: 1,
      before_xp: 0
    })
    expect(receipts.results[1]).toMatchObject({
      before_level: receipts.results[0].after_level,
      before_xp: receipts.results[0].after_xp,
      after_level: 2,
      after_xp: 100
    })
  })

  it('rejects a duplicate concurrent claim without a second XP receipt', async () => {
    const list = await rpc('ListQuests', {})
    const welcome = (
      await list.json<{
        quests: Array<{ id: number; questType: string }>
      }>()
    ).quests.find(quest => quest.questType === 'WelcomeOpenSky')

    const responses = await Promise.all([
      rpc('ClaimQuestRewards', { ids: [welcome!.id] }),
      rpc('ClaimQuestRewards', { ids: [welcome!.id] })
    ])
    expect(responses.map(response => response.status).sort()).toEqual([
      200, 500
    ])

    const [profile, receiptCount, nextQuestCount] = await Promise.all([
      env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(userId)
        .first<{ level: number; xp: number }>(),
      env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_quest_claim_receipts
         WHERE user_id = ? AND quest_key = 'practice-match'`
      )
        .bind(userId)
        .first<{ count: number }>(),
      env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_quests
         WHERE user_id = ? AND quest_type = 'AnEnemyApproaches' AND active = 1`
      )
        .bind(userId)
        .first<{ count: number }>()
    ])
    expect(profile).toEqual({ level: 2, xp: 100 })
    expect(receiptCount?.count).toBe(1)
    expect(nextQuestCount?.count).toBe(1)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_quest_claim_receipts SET reward_xp = 999
         WHERE user_id = ? AND quest_key = 'practice-match'`
      )
        .bind(userId)
        .run()
    ).rejects.toThrow('quest claim receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM player_quest_claim_receipts
         WHERE user_id = ? AND quest_key = 'practice-match'`
      )
        .bind(userId)
        .run()
    ).rejects.toThrow('quest claim receipts are immutable')
  })

  it('rolls the entire off-chain quest grant back on a receipt failure', async () => {
    const list = await rpc('ListQuests', {})
    const welcome = (
      await list.json<{
        quests: Array<{ id: number; questType: string }>
      }>()
    ).quests.find(quest => quest.questType === 'WelcomeOpenSky')
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER test_quest_receipt_failure
       BEFORE INSERT ON player_quest_claim_receipts
       BEGIN SELECT RAISE(ABORT, 'test quest receipt failure'); END`
    ).run()

    try {
      expect(
        (await rpc('ClaimQuestRewards', { ids: [welcome!.id] })).status
      ).toBe(500)
    } finally {
      await env.AUTH_DB.prepare('DROP TRIGGER test_quest_receipt_failure').run()
    }

    const [profile, assignment, batchCount] = await Promise.all([
      env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(userId)
        .first<{ level: number; xp: number }>(),
      env.AUTH_DB.prepare(
        `SELECT status FROM player_quests WHERE user_id = ? AND rowid = ?`
      )
        .bind(userId, welcome!.id)
        .first<{ status: string }>(),
      env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_quest_claim_batches
         WHERE user_id = ?`
      )
        .bind(userId)
        .first<{ count: number }>()
    ])
    expect(profile).toEqual({ level: 1, xp: 0 })
    expect(assignment?.status).toBe('complete')
    expect(batchCount?.count).toBe(0)
  })

  it('fills eligible source quest slots and shares one manual daily reroll', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_profiles SET level = 2, updated_at = ? WHERE user_id = ?`
      ).bind(now, userId),
      env.AUTH_DB.prepare(
        `UPDATE player_quests SET active = 0, updated_at = ? WHERE user_id = ?`
      ).bind(now, userId)
    ])

    const listed = await rpc('ListQuests', {})
    expect(listed.status).toBe(200)
    const quests = (
      await listed.json<{
        quests: Array<{
          id: number
          position: number
          questType: string
          periodicity: string
          isRerollable: boolean
        }>
      }>()
    ).quests
    expect(quests).toHaveLength(3)
    expect(quests.map(quest => quest.periodicity)).toEqual([
      'DAILY',
      'DAILY',
      'DAILY'
    ])
    expect(quests.map(quest => quest.position)).toEqual([1, 2, 3])
    expect(quests.every(quest => quest.isRerollable)).toBe(true)

    const ownedCards = new Set<number>(STARTER_CARD_IDS)
    for (const quest of quests) {
      const spec = sourceQuestSpec(
        quest.questType as Parameters<typeof sourceQuestSpec>[0]
      )
      expect(spec).toBeDefined()
      expect(spec!.requiredHero === null || spec!.requiredHero === 'ADA').toBe(
        true
      )
      expect(spec!.requiredCards.every(card => ownedCards.has(card))).toBe(true)
    }

    const previous = quests[0]
    const rerolled = await rpc('ReRollQuest', { id: previous.id })
    expect(rerolled.status).toBe(200)
    const rerollBody = await rerolled.json<{
      quest: {
        id: number
        position: number
        questType: string
        periodicity: string
        isRerollable: boolean
      }
      rewards: unknown[]
    }>()
    expect(rerollBody).toMatchObject({
      quest: {
        position: previous.position,
        periodicity: 'DAILY',
        isRerollable: false
      },
      rewards: []
    })
    expect(rerollBody.quest.questType).not.toBe(previous.questType)

    const refreshed = await rpc('ListQuests', {})
    const refreshedQuests = (
      await refreshed.json<{
        quests: Array<{ id: number; isRerollable: boolean }>
      }>()
    ).quests
    expect(refreshedQuests.every(quest => !quest.isRerollable)).toBe(true)
    expect(
      (await rpc('ReRollQuest', { id: refreshedQuests[0].id })).status
    ).toBe(500)

    const history = await env.AUTH_DB.prepare(
      `SELECT active, rerolls FROM player_quests
       WHERE user_id = ? AND periodicity = 'DAILY' AND period > 0`
    )
      .bind(userId)
      .all<{ active: number; rerolls: number }>()
    expect(history.results.some(row => row.active === 0)).toBe(true)
    expect(history.results.every(row => row.rerolls === 1)).toBe(true)
  })

  it('copies unfinished starter quests and replaces expired rerollable quests', async () => {
    const initial = await rpc('ListQuests', {})
    const starter = (
      await initial.json<{
        quests: Array<{ id: number; questType: string; isNew: boolean }>
      }>()
    ).quests.find(quest => quest.questType === 'OntheRoadAgain')
    expect(starter).toBeDefined()

    const currentPeriod = questPeriodAt(QuestPeriodicity.DAILY)
    await env.AUTH_DB.prepare(
      `UPDATE player_quests SET period = ?, is_new = 0
       WHERE user_id = ? AND rowid = ?`
    )
      .bind(currentPeriod - 1, userId, starter!.id)
      .run()

    const copied = await rpc('ListQuests', {})
    const copiedStarter = (
      await copied.json<{
        quests: Array<{ id: number; questType: string; isNew: boolean }>
      }>()
    ).quests.find(quest => quest.questType === 'OntheRoadAgain')
    expect(copiedStarter).toMatchObject({ isNew: false })
    expect(copiedStarter!.id).not.toBe(starter!.id)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT active, period FROM player_quests WHERE rowid = ?`
      )
        .bind(starter!.id)
        .first()
    ).toEqual({ active: 0, period: currentPeriod - 1 })

    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_profiles SET level = 2, updated_at = ? WHERE user_id = ?`
      ).bind(now, userId),
      env.AUTH_DB.prepare(
        `UPDATE player_quests SET active = 0, updated_at = ? WHERE user_id = ?`
      ).bind(now, userId)
    ])
    const normal = await rpc('ListQuests', {})
    const previous = (
      await normal.json<{
        quests: Array<{ id: number; position: number; questType: string }>
      }>()
    ).quests[0]
    await env.AUTH_DB.prepare(
      `UPDATE player_quests SET period = ? WHERE user_id = ? AND rowid = ?`
    )
      .bind(currentPeriod - 1, userId, previous.id)
      .run()

    const rerolled = await rpc('ListQuests', {})
    const replacement = (
      await rerolled.json<{
        quests: Array<{ id: number; position: number; questType: string }>
      }>()
    ).quests.find(quest => quest.position === previous.position)
    expect(replacement).toBeDefined()
    expect(replacement!.id).not.toBe(previous.id)
    expect(replacement!.questType).not.toBe(previous.questType)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT active FROM player_quests WHERE rowid = ?`
      )
        .bind(previous.id)
        .first()
    ).toEqual({ active: 0 })
  })

  it('serves the legacy season and SkyPass reward data', async () => {
    const season = seasonFromDate()

    const seasonResponse = await rpc('GetCurrentSeason', {}, false)
    expect(await seasonResponse.json()).toEqual({ res: season })

    expect(seasonFromDate(new Date('2026-08-10T00:00:00.000Z'))).toBe(62)
    const rewardsResponse = await rpc('ListSkypassRewards', { season: 62 })
    const body = await rewardsResponse.json<{
      res: {
        seasonNumber: number
        seasonName: string
        hasPremium: boolean
        levels: Array<{
          level: number
          earned: boolean
          rewards: Array<{
            tier: string
            itemType: string
            isStarter: boolean
          }>
        }>
      }
    }>()
    expect(body.res).toMatchObject({
      seasonNumber: 62,
      seasonName: 'Frosted Redux',
      hasPremium: false
    })
    expect(body.res.levels.find(level => level.level === 1)).toMatchObject({
      earned: true,
      rewards: [
        expect.objectContaining({
          tier: 'FREE',
          itemType: 'SW_BASE_CARDS',
          isStarter: true
        })
      ]
    })

    const unlocks = await rpc('DeckClassUnlockLevels', {}, false)
    expect(await unlocks.json()).toMatchObject({
      res: { AGY: 6, HRT: 12, INT: 18, WIS: 24 }
    })
  })

  it('claims the listed and earned starter SkyPass card reward', async () => {
    const listed = await rpc('ListSkypassRewards', { season: 62 })
    const levels = (
      await listed.json<{
        res: {
          levels: Array<{
            level: number
            rewards: Array<{
              id: number
              itemType: string
              isStarter: boolean
              claimed: boolean
            }>
          }>
        }
      }>()
    ).res.levels
    const starterReward = levels
      .find(level => level.level === 1)!
      .rewards.find(reward => reward.isStarter)!
    expect(starterReward).toMatchObject({
      itemType: 'SW_BASE_CARDS',
      claimed: false
    })

    const claimed = await rpc('ClaimSkypassRewards', {
      ids: [starterReward.id]
    })
    expect(claimed.status).toBe(200)
    expect(await claimed.json()).toMatchObject({
      rewards: [
        {
          accountID: 0,
          type: 'CARD',
          card: {
            amount: 1,
            card: {
              id: 140,
              name: 'Stalwart Sentinel',
              itemType: 'SW_BASE_CARDS',
              isNew: true
            }
          }
        }
      ]
    })

    const ownership = await rpc('GetCardOwnership', {})
    expect(
      (await ownership.json<{ res: { unlockedCards: number } }>()).res
        .unlockedCards
    ).toBe(31)

    const refreshed = await rpc('ListSkypassRewards', { season: 62 })
    const refreshedReward = (
      await refreshed.json<{
        res: {
          levels: Array<{
            level: number
            rewards: Array<{
              id: number
              claimed: boolean
              gainedRewards?: unknown[]
            }>
          }>
        }
      }>()
    ).res.levels
      .find(level => level.level === 1)!
      .rewards.find(reward => reward.id === starterReward.id)!
    expect(refreshedReward).toMatchObject({
      claimed: true,
      gainedRewards: [expect.objectContaining({ type: 'CARD' })]
    })

    const claimedAgain = await rpc('ClaimSkypassRewards', {
      ids: [starterReward.id]
    })
    expect(await claimedAgain.json()).toMatchObject({
      rewards: [expect.objectContaining({ type: 'CARD' })]
    })
    const ownershipAgain = await rpc('GetCardOwnership', {})
    expect(
      (await ownershipAgain.json<{ res: { unlockedCards: number } }>()).res
        .unlockedCards
    ).toBe(31)
  })

  it('claims a source hero reward and unlocks its starter deck and cards', async () => {
    await env.AUTH_DB.prepare(
      `UPDATE player_progression SET basic_skypass_level = 6 WHERE user_id = ?`
    )
      .bind(userId)
      .run()

    const listed = await rpc('ListSkypassRewards', { season: 62 })
    const levelSix = (
      await listed.json<{
        res: {
          levels: Array<{
            level: number
            rewards: Array<{ id: number; itemType: string }>
          }>
        }
      }>()
    ).res.levels.find(level => level.level === 6)
    const heroReward = levelSix?.rewards.find(
      reward => reward.itemType === 'SW_HERO'
    )
    expect(heroReward).toBeDefined()

    const claimed = await rpc('ClaimSkypassRewards', {
      ids: [heroReward!.id]
    })
    expect(claimed.status).toBe(200)
    expect(await claimed.json()).toMatchObject({
      rewards: [
        {
          accountID: 0,
          type: 'DECK',
          deck: { deckClass: 'AGY', tokenIds: expect.any(Array) }
        },
        {
          accountID: 0,
          type: 'HERO',
          hero: { hero: 'SAMYA', deckClass: 'AGY' }
        }
      ]
    })

    const heroes = await rpc('GetItemOwnershipByType', {
      itemTypes: ['SW_HERO']
    })
    expect(
      (
        await heroes.json<{
          items: Array<{ tokenID: number; itemType: string }>
        }>()
      ).items
    ).toEqual([
      expect.objectContaining({ tokenID: 1, itemType: 'SW_HERO' }),
      expect.objectContaining({ tokenID: 2, itemType: 'SW_HERO' })
    ])

    const decks = await rpc('ListDecks', {})
    const agilityDeck = (
      await decks.json<{
        res: Array<{ class: string; deckType: string; cardIds: number[] }>
      }>()
    ).res.find(deck => deck.class === 'AGY')
    expect(agilityDeck).toMatchObject({
      class: 'AGY',
      deckType: 'UNLOCKED_STARTER'
    })
    expect(agilityDeck?.cardIds).toHaveLength(30)

    const cardCount = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_card_unlocks WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(cardCount?.count).toBe(60)

    const claimedAgain = await rpc('ClaimSkypassRewards', {
      ids: [heroReward!.id]
    })
    expect(await claimedAgain.json()).toMatchObject({
      rewards: [
        expect.objectContaining({ type: 'DECK' }),
        expect.objectContaining({ type: 'HERO' })
      ]
    })
    const heroCount = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_items
       WHERE user_id = ? AND item_type = 'SW_HERO'`
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(heroCount?.count).toBe(2)
  })

  it('delivers every remaining source SkyPass reward into off-chain inventory', async () => {
    const season = seasonFromDate()
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO content_stickers (token_id, required_points, season)
         VALUES (987, 0, ?)`
      ).bind(season),
      ...[
        [101, 403, 3, null],
        [102, 405, 0, JSON.stringify({ tokenIDs: [987] })],
        [103, 303, 7, null],
        [104, 401, 0, JSON.stringify({ tokenIDs: [1, 2] })],
        [105, 407, 0, JSON.stringify({ tokenIDs: [11] })],
        [106, 302, 0, JSON.stringify({ tokenIDs: [12] })]
      ].map(([level, itemType, amount, attributes]) =>
        env.AUTH_DB.prepare(
          `INSERT INTO skypass_rewards
             (level, season, tier, item_type, amount, is_starter, attributes,
              updated_at, is_infinite)
           VALUES (?, ?, 1, ?, ?, 0, ?, ?, 0)`
        ).bind(level, season, itemType, amount, attributes, now)
      ),
      env.AUTH_DB.prepare(
        `UPDATE player_progression SET basic_skypass_level = 106
         WHERE user_id = ?`
      ).bind(userId)
    ])
    const rows = await env.AUTH_DB.prepare(
      `SELECT id FROM skypass_rewards
       WHERE season = ? AND level BETWEEN 101 AND 106 ORDER BY level`
    )
      .bind(season)
      .all<{ id: number }>()

    const claimed = await rpc('ClaimSkypassRewards', {
      ids: rows.results.map(row => row.id)
    })
    expect(claimed.status).toBe(200)
    expect(
      (await claimed.json<{ rewards: Array<{ type: string }> }>()).rewards.map(
        reward => reward.type
      )
    ).toEqual([
      'CONQUEST_TICKET',
      'STICKER',
      'STICKER_POINTS',
      'CARD',
      'CARD',
      'CARD_BACK',
      'TITLE'
    ])

    const inventory = await env.AUTH_DB.prepare(
      `SELECT item_type, token_id, balance FROM player_items
       WHERE user_id = ? AND unlock_source LIKE 'skypass:%'
       ORDER BY item_type, token_id`
    )
      .bind(userId)
      .all<{ item_type: string; token_id: number; balance: number }>()
    expect(inventory.results).toEqual([
      { item_type: 'SW_CARD_BACKS', token_id: 11, balance: 1 },
      { item_type: 'SW_CONQUEST_TICKET', token_id: 2, balance: 3 },
      { item_type: 'SW_SILVER_CARDS', token_id: 1, balance: 1 },
      { item_type: 'SW_SILVER_CARDS', token_id: 2, balance: 1 },
      { item_type: 'SW_STICKERS', token_id: 987, balance: 1 },
      { item_type: 'SW_STICKER_POINTS', token_id: 0, balance: 7 },
      { item_type: 'SW_TITLES', token_id: 12, balance: 1 }
    ])

    const claimedAgain = await rpc('ClaimSkypassRewards', {
      ids: rows.results.map(row => row.id)
    })
    expect(claimedAgain.status).toBe(200)
    const afterRetry = await env.AUTH_DB.prepare(
      `SELECT SUM(balance) AS balance FROM player_items
       WHERE user_id = ? AND unlock_source LIKE 'skypass:%'`
    )
      .bind(userId)
      .first<{ balance: number }>()
    expect(afterRetry?.balance).toBe(15)

    const feed = await rpc('GetFeed', {
      page: { pageSize: 20 },
      req: { accountAddress: identityReference }
    })
    const feedEvents = (
      await feed.json<{
        res: Array<{ type: string; tokenIds?: number[]; stickerPoints?: number }>
      }>()
    ).res
    expect(feedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REWARD',
          tokenIds: expect.arrayContaining([16_646_145])
        }),
        expect.objectContaining({ type: 'REWARD', stickerPoints: 7 }),
        expect.objectContaining({
          type: 'REWARD',
          tokenIds: expect.arrayContaining([(5 << 16) + 987])
        }),
        expect.objectContaining({
          type: 'REWARD',
          tokenIds: expect.arrayContaining([(6 << 16) + 11])
        }),
        expect.objectContaining({
          type: 'REWARD',
          tokenIds: expect.arrayContaining([(8 << 16) + 12])
        })
      ])
    )
  })

  it('credits a concurrent SkyPass claim only once', async () => {
    const season = seasonFromDate()
    await env.AUTH_DB.prepare(
      `INSERT INTO skypass_rewards
         (level, season, tier, item_type, amount, is_starter, attributes,
          updated_at, is_infinite)
       VALUES (120, ?, 1, 303, 9, 0, NULL, ?, 0)`
    )
      .bind(season, new Date().toISOString())
      .run()
    await env.AUTH_DB.prepare(
      `UPDATE player_progression SET basic_skypass_level = 120 WHERE user_id = ?`
    )
      .bind(userId)
      .run()
    const reward = await env.AUTH_DB.prepare(
      `SELECT id FROM skypass_rewards WHERE season = ? AND level = 120`
    )
      .bind(season)
      .first<{ id: number }>()

    const responses = await Promise.all([
      rpc('ClaimSkypassRewards', { ids: [reward!.id] }),
      rpc('ClaimSkypassRewards', { ids: [reward!.id] })
    ])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    const item = await env.AUTH_DB.prepare(
      `SELECT balance FROM player_items
       WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
    )
      .bind(userId)
      .first<{ balance: number }>()
    expect(item?.balance).toBe(9)
    const receipt = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count, COUNT(DISTINCT delivery_key) AS keys
       FROM player_skypass_claims WHERE user_id = ? AND reward_id = ?`
    )
      .bind(userId, reward!.id)
      .first<{ count: number; keys: number }>()
    expect(receipt).toEqual({ count: 1, keys: 1 })
  })

  it('rejects SkyPass rewards that are unearned or replaced in the listing', async () => {
    const unearned = await env.AUTH_DB.prepare(
      `SELECT id FROM skypass_rewards
       WHERE season = 62 AND level = 2 AND is_starter = 1`
    ).first<{ id: number }>()
    expect(
      (await rpc('ClaimSkypassRewards', { ids: [unearned!.id] })).status
    ).toBe(500)

    const replaced = await env.AUTH_DB.prepare(
      `SELECT id FROM skypass_rewards
       WHERE season = 62 AND level = 1 AND tier = 1 AND is_starter = 0`
    ).first<{ id: number }>()
    expect(
      (await rpc('ClaimSkypassRewards', { ids: [replaced!.id] })).status
    ).toBe(500)
  })

  it('requires identity auth for player-owned RPC methods', async () => {
    expect((await rpc('ListDecks', {}, false)).status).toBe(401)
    expect((await rpc('ListQuests', {}, false)).status).toBe(401)
    expect(
      (
        await rpc(
          'GetEpicQuestChain',
          { epicType: 'starter2_test' },
          false
        )
      ).status
    ).toBe(401)
    expect((await rpc('ListSkypassRewards', {}, false)).status).toBe(401)
  })
})
