import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import { cardLibrarySource } from '../src/card-library'
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

describe('source card-library RPC compatibility', () => {
  it('serves the complete active source library in numeric ID order', async () => {
    const response = await rpc('GetCardLibrary', { page: { pageSize: 1 } })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { cards: Array<Record<string, unknown>> }
    expect(body.cards).toHaveLength(cardLibrarySource.count)
    expect(cardLibrarySource.count).toBeGreaterThan(800)
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
})
