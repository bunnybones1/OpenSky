import { env } from 'cloudflare:workers'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { seasonFromDate } from '../src/legacy-seasons'
import { PlayerRepository, STARTER_CARD_IDS } from '../src/player'

const testEnv = env as unknown as Env
const userId = 'rpc-player-user-id'
const identityReference = `identity:${userId}`

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
      res: Array<{ account: { name: string }; rank: number }>
    }>()
    expect(firstBody.res).toEqual([
      expect.objectContaining({
        account: expect.objectContaining({ name: 'Alpha.Weasel' }),
        rank: 1
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
          accountStat: { score: 10 }
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
      { questType: 'Strengthweaver', position: 1 },
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
    const strength = (
      await list.json<{
        quests: Array<{ id: number; questType: string }>
      }>()
    ).quests.find(quest => quest.questType === 'Strengthweaver')

    const response = await rpc('ClaimQuestRewards', { ids: [strength!.id] })
    expect(response.status).toBe(500)
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
    expect((await rpc('ListSkypassRewards', {}, false)).status).toBe(401)
  })
})
