import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import {
  cardLibrarySource,
  type CardInventoryBalance,
  searchLibraryCards
} from '../src/card-library'
import type { Env } from '../src/env'

const testEnv = env as unknown as Env

const rpc = (method: string, body: object) =>
  handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    testEnv
  )

const CARD_WIRE_FIELDS = [
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
]

describe('source card-library RPC compatibility', () => {
  it('serves the complete active source library in numeric ID order', async () => {
    const response = await rpc('GetCardLibrary', { page: { pageSize: 1 } })
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      cards: Array<Record<string, unknown>>
    }
    expect(body.cards).toHaveLength(cardLibrarySource.count)
    expect(cardLibrarySource.count).toBeGreaterThan(800)
    expect(Object.keys(body.cards[0])).toEqual(CARD_WIRE_FIELDS)
    expect(body.cards[0]).toMatchObject({
      id: 1,
      name: 'Foul Stench',
      class: 'HRT',
      element: 'DARK',
      type: 'SPELL',
      manaCost: 4,
      status: 'PLAY',
      set: 'CORE_SET',
      silverCardTokenId: 65_537,
      goldCardTokenId: 131_073
    })
    expect(body.cards[0]).toMatchObject({
      attachedSpellID: null,
      imageURL: {
        small: expect.stringMatching(/\/2x\/1\.webp$/),
        medium: expect.stringMatching(/\/4x\/1\.webp$/),
        large: expect.stringMatching(/\/6x\/1\.webp$/)
      },
      itemType: 'UNKNOWN',
      isNew: null
    })
    expect(body.cards[0]).not.toHaveProperty('attributes')
    expect(body.cards[0]).not.toHaveProperty('validFromSeason')
    expect(body.cards.at(-1)?.id).toBeGreaterThan(4_000)
    expect(body.cards.every(card => card.class !== 'TOK')).toBe(true)
  })

  it('returns known IDs in request order, preserves duplicates, and skips unknown IDs', async () => {
    const response = await rpc('GetCardsByID', { cardIDs: [3, 999_999, 1, 3] })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { cards: Array<{ id: number }> }
    expect(body.cards.map(card => card.id)).toEqual([3, 1, 3])
  })

  it('decodes the source version-02 deck format and rejects invalid decks safely', async () => {
    const valid = await rpc('GetCardsByDeckString', {
      deckString: 'SWxHRT02VtJVTmH'
    })
    expect(valid.status).toBe(200)
    expect(
      ((await valid.json()) as { cards: Array<{ id: number }> }).cards.map(
        card => card.id
      )
    ).toEqual([1, 5, 24])

    expect(
      (await rpc('GetCardsByDeckString', { deckString: 'SWxSTR02!' })).status
    ).toBe(500)
    expect((await rpc('GetCardsByDeckString', {})).status).toBe(400)
  })

  it('validates ID request types at the transport boundary', async () => {
    expect((await rpc('GetCardsByID', { cardIDs: ['1'] })).status).toBe(400)
    expect((await rpc('GetCardsByID', { cardIDs: [1.5] })).status).toBe(400)
  })

  it('ports source card search filters, token inclusion, ordering, and pagination', async () => {
    const filtered = await rpc('SearchCards', {
      page: { pageSize: 2 },
      req: {
        criteria: { cardElement: ['EARTH'], searchText: 'Ston' },
        includeUserBalances: false,
        contractQuery: false
      }
    })
    expect(filtered.status).toBe(200)
    const filteredBody = await filtered.json<{
      page: { pageSize: number }
      res: Array<{ card: { id: number; name: string }; balance: string }>
    }>()
    expect(filteredBody.page.pageSize).toBe(2)
    expect(filteredBody.res.map(item => item.card.id)).toEqual([16, 96])
    expect(Object.keys(filteredBody.res[0].card)).toEqual(CARD_WIRE_FIELDS)
    expect(filteredBody.res[0]).toMatchObject({
      card: { name: 'Stone Fist' },
      balance: '0'
    })

    const hiddenToken = await rpc('SearchCards', {
      req: { criteria: { ids: [20_000] } }
    })
    expect((await hiddenToken.json<{ res: unknown[] }>()).res).toHaveLength(0)
    const includedToken = await rpc('SearchCards', {
      req: { criteria: { ids: [20_000], includeTokens: true } }
    })
    expect(await includedToken.json()).toMatchObject({
      res: [{ card: { id: 20_000, name: 'Songbird', class: 'TOK' } }]
    })

    const ordered = await rpc('SearchCards', {
      req: { criteria: { ids: [191, 1] } }
    })
    expect(
      (
        (await ordered.json()) as { res: Array<{ card: { id: number } }> }
      ).res.map(item => item.card.id)
    ).toEqual([1, 191])

    const first = await rpc('SearchCards', {
      page: { pageSize: 1 },
      req: { criteria: { ids: [1, 2] } }
    })
    const firstBody = await first.json<{
      page: { after: string; hasBefore: boolean }
      res: Array<{ card: { id: number } }>
    }>()
    expect(firstBody.page.hasBefore).toBe(true)
    expect(JSON.parse(atob(firstBody.page.after))).toEqual(['1', '4'])
    const second = await rpc('SearchCards', {
      page: { pageSize: 1, before: firstBody.page.after },
      req: { criteria: { ids: [1, 2] } }
    })
    const secondBody = await second.json<{
      page: { before: string; hasAfter: boolean; hasBefore: boolean }
      res: Array<{ card: { id: number } }>
    }>()
    expect(secondBody).toMatchObject({
      page: { hasAfter: true, hasBefore: false },
      res: [{ card: { id: 2 } }]
    })
    expect(
      await (
        await rpc('SearchCards', {
          page: { pageSize: 1, after: secondBody.page.before },
          req: { criteria: { ids: [1, 2] } }
        })
      ).json()
    ).toMatchObject({ res: [{ card: { id: 1 } }] })

    expect(
      (
        await rpc('SearchCards', {
          page: { before: firstBody.page.after, after: firstBody.page.after },
          req: { criteria: { ids: [1, 2] } }
        })
      ).status
    ).toBe(500)
    expect(
      (
        await rpc('SearchCards', {
          page: { before: 'not-a-cursor' },
          req: { criteria: { ids: [1, 2] } }
        })
      ).status
    ).toBe(500)
  })

  it('keeps owned-card pages stable when inventory changes ahead of a cursor', () => {
    const balance = (tokenId: number): CardInventoryBalance => ({
      itemType: 'SW_BASE_CARDS',
      tokenId,
      balance: 1,
      isNew: false,
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    const first = searchLibraryCards(
      { ownedCards: true },
      { pageSize: 1 },
      [balance(2), balance(3)],
      true
    )
    expect(first.res.map(item => item.card.id)).toEqual([2])

    const second = searchLibraryCards(
      { ownedCards: true },
      { pageSize: 1, before: first.page.after },
      [balance(1), balance(2), balance(3)],
      true
    )
    expect(second.res.map(item => item.card.id)).toEqual([3])

    const descending = searchLibraryCards(
      { ids: [1, 2] },
      {
        pageSize: 1,
        sort: [{ column: 'id', order: SortOrder.DESC }]
      }
    )
    expect(descending.res.map(item => item.card.id)).toEqual([2])
    expect(descending.page.sort).toEqual([])
    expect(JSON.parse(atob(descending.page.after!))).toEqual(['2'])
  })

  it('applies source ownership frames and only includes balances when requested', () => {
    const inventory = [
      {
        itemType: 'SW_BASE_CARDS',
        tokenId: 1,
        balance: 1,
        isNew: false,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        itemType: 'SW_SILVER_CARDS',
        tokenId: 1,
        balance: 2,
        isNew: true,
        createdAt: '2026-01-02T00:00:00.000Z'
      }
    ]
    const hidden = searchLibraryCards(
      { ids: [1], ownedCards: true },
      {},
      inventory,
      true,
      false
    )
    expect(hidden.res[0]).toMatchObject({ balance: '0', balanceByType: {} })

    const included = searchLibraryCards(
      { ids: [1], ownedCards: true },
      {},
      inventory,
      true,
      true
    )
    expect(included.res[0]).toMatchObject({
      balance: '3',
      balanceByType: {
        SW_BASE_CARDS: { balance: '1' },
        SW_SILVER_CARDS: { balance: '2', isNew: true }
      },
      createdAt: '2026-01-02T00:00:00.000Z'
    })
    expect(() =>
      searchLibraryCards({ ownedCards: true }, {}, [], false)
    ).toThrow('anonymous user')
  })
})
