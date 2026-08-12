import { env } from 'cloudflare:workers'
import { DeckClass } from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import {
  CURRENT_DECK_RANK_LIBRARY_REVISION,
  DeckRanksRepository
} from '../src/deck-ranks'
import { encodeDeckString } from '../src/deck-codec'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'
import cardLibrary from '../src/generated/card-library.json'

const testEnv = env as unknown as Env
const USER_1 = 'deck-rpc-player-one'
const USER_2 = 'deck-rpc-player-two'
const NOW = '2026-08-13T13:00:00.000Z'
const deck1 = Array.from({ length: 30 }, (_, index) => index + 136)
const deck2 = Array.from({ length: 30 }, (_, index) => index + 166)
const deck3 = Array.from({ length: 30 }, (_, index) => index + 3001)
const string1 = encodeDeckString(deck1, DeckClass.STR)
const string2 = encodeDeckString(deck2, DeckClass.STR)
const string3 = encodeDeckString(deck3, DeckClass.HRT)

const rpc = async (method: string, body: object, signedIn = false) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      USER_1,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
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

const addRank = (
  deckString: string,
  deckClass: DeckClass,
  cardIds: number[],
  userId: string,
  score: number,
  wins: number
) =>
  env.AUTH_DB.prepare(
    `INSERT INTO player_deck_ranks
       (library_revision, deck_string, deck_class, card_ids_json, score,
        highest_player_user_id, win_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    CURRENT_DECK_RANK_LIBRARY_REVISION,
    deckString,
    deckClass,
    JSON.stringify(cardIds),
    score,
    userId,
    wins,
    NOW,
    NOW
  )

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_deck_ranks_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_rank_wins'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_ranks'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Deck One', 'deck-one@example.com', ?, ?),
              (?, 'Deck Two', 'deck-two@example.com', ?, ?)`
    ).bind(USER_1, NOW, NOW, USER_2, NOW, NOW)
  ])
  await new PlayerRepository(env.AUTH_DB).bootstrap(USER_1)
  await new PlayerRepository(env.AUTH_DB).bootstrap(USER_2)
  await env.AUTH_DB.batch([
    addRank(string1, DeckClass.STR, deck1, USER_1, 80, 4),
    addRank(string2, DeckClass.STR, deck2, USER_2, 0, 0),
    addRank(string3, DeckClass.HRT, deck3, USER_2, 120, 6)
  ])
})

describe('deck-rank RPC compatibility', () => {
  it('keeps ListDeckRanks public, score-positive, sorted, and account-enriched', async () => {
    const first = await rpc('ListDeckRanks', {
      page: { pageSize: 1 },
      req: {}
    })
    expect(first.status).toBe(200)
    const page1 = (await first.json()) as {
      page: { after?: string; hasBefore: boolean }
      res: Array<{
        deckRank: { deckString: string; score: number }
        highestPlayer: { address: string; name: string; settings?: unknown }
      }>
    }
    expect(page1.res).toEqual([
      expect.objectContaining({
        deckRank: expect.objectContaining({ deckString: string3, score: 120 }),
        highestPlayer: expect.objectContaining({
          address: `identity:${USER_2}`,
          name: 'Deck Two'
        })
      })
    ])
    expect(page1.res[0].highestPlayer.settings).toBeUndefined()
    expect(page1.page.hasBefore).toBe(true)

    const second = await rpc('ListDeckRanks', {
      page: { pageSize: 1, before: page1.page.after },
      req: {}
    })
    expect(await second.json()).toMatchObject({
      page: { hasBefore: false, hasAfter: true },
      res: [{ deckRank: { deckString: string1, score: 80 } }]
    })
  })

  it('preserves source class filtering and excludes zero-score list rows', async () => {
    expect(
      await (
        await rpc('ListDeckRanks', { req: { class: DeckClass.STR } })
      ).json()
    ).toMatchObject({ res: [{ deckRank: { deckString: string1 } }] })
    expect(
      await (
        await rpc('ListDeckRanks', { req: { class: DeckClass.HRT } })
      ).json()
    ).toMatchObject({ res: [{ deckRank: { deckString: string3 } }] })
  })

  it('requires identity auth for SearchDeckRanks and includes score-zero rows', async () => {
    expect((await rpc('SearchDeckRanks', { req: {} })).status).toBe(401)
    const response = await rpc('SearchDeckRanks', { req: {} }, true)
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      res: Array<{
        deckString: string
        highestPlayerID: string
        highestPlayerAddress: string
      }>
    }
    expect(body.res).toHaveLength(3)
    expect(body.res.find(rank => rank.deckString === string2)).toMatchObject({
      highestPlayerID: expect.stringMatching(/^\d+$/),
      highestPlayerAddress: `identity:${USER_2}`
    })
  })

  it('supports exact deck, class, and card-containment searches', async () => {
    expect(
      await (
        await rpc('SearchDeckRanks', { req: { deckString: string2 } }, true)
      ).json()
    ).toMatchObject({ res: [{ deckString: string2 }] })
    expect(
      await (
        await rpc(
          'SearchDeckRanks',
          { req: { classes: [DeckClass.HRT] } },
          true
        )
      ).json()
    ).toMatchObject({ res: [{ deckString: string3 }] })
    expect(
      await (
        await rpc('SearchDeckRanks', { req: { withCards: [168, 170] } }, true)
      ).json()
    ).toMatchObject({ res: [{ deckString: string2 }] })

    // The source overwrites earlier filters as later fields are applied.
    expect(
      await (
        await rpc(
          'SearchDeckRanks',
          {
            req: {
              deckString: string1,
              classes: [DeckClass.HRT],
              withCards: [168]
            }
          },
          true
        )
      ).json()
    ).toMatchObject({ res: [{ deckString: string2 }] })
  })

  it('initializes a score-zero current rank when a complete deck is saved', async () => {
    const fourthDeck = cardLibrary.cards
      .filter(card => card.class === 'STR')
      .slice(60, 90)
      .map(card => card.id)
    const deck = await new PlayerRpcRepository(env.AUTH_DB).createDeck(USER_1, {
      name: 'Complete Deck',
      class: DeckClass.STR,
      cardIds: fourthDeck
    })
    const search = await new DeckRanksRepository(env.AUTH_DB).search(
      undefined,
      {
        deckString: deck.deckString
      }
    )
    expect(search.res).toEqual([
      expect.objectContaining({
        deckString: deck.deckString,
        cardIds: [...fourthDeck].sort((left, right) => left - right),
        score: 0,
        highestPlayerAddress: `identity:${USER_1}`
      })
    ])
  })
})
