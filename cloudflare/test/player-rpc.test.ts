import { env } from 'cloudflare:workers'
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
    expect(body.res).toEqual([
      expect.objectContaining({
        class: 'STR',
        cardIds: STARTER_CARD_IDS,
        deckType: 'UNLOCKED_STARTER',
        deckString: expect.stringMatching(/^SWxSTR/)
      })
    ])
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
        }
      ]
    })

    const account = await rpc('GetAccount', { address: identityReference })
    expect(await account.json()).toMatchObject({
      account: { level: 2, experience: 100, levelUpXP: 200, seasonLevel: 2 }
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

  it('requires identity auth for player-owned RPC methods', async () => {
    expect((await rpc('ListDecks', {}, false)).status).toBe(401)
    expect((await rpc('ListQuests', {}, false)).status).toBe(401)
    expect((await rpc('ListSkypassRewards', {}, false)).status).toBe(401)
  })
})
