import cardLibrary from '../src/generated/card-library.json'
import { describe, expect, it } from 'vitest'

import {
  sourcePendingCardsListWire,
  sourcePendingCardsResponseWire
} from '../src/pending-card-wire'

const SOURCE_PENDING_CARD_FIELDS = ['cards', 'tokenIDs', 'mintAt']
const SOURCE_CARD_FIELDS = [
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

describe('source PendingCardsResponse JSON wire', () => {
  it('projects the exact outer and nested Card fields', () => {
    const card = cardLibrary.cards.find(entry => entry.id === 136)!
    const result = sourcePendingCardsResponseWire({
      cards: [card],
      tokenIDs: [131_208],
      mintAt: '2026-08-13T12:00:00.000Z'
    }) as unknown as Record<string, unknown>

    expect(Object.keys(result)).toEqual(SOURCE_PENDING_CARD_FIELDS)
    const [nested] = result.cards as Array<Record<string, unknown>>
    expect(Object.keys(nested)).toEqual(SOURCE_CARD_FIELDS)
    expect(nested).toMatchObject({
      id: 136,
      itemType: 'UNKNOWN',
      isNew: null
    })
    expect(nested).not.toHaveProperty('validFromSeason')
    expect(result.tokenIDs).toEqual([131_208])
  })

  it('preserves nil slices and the nil top-level source result', () => {
    expect(
      sourcePendingCardsResponseWire({
        cards: [],
        tokenIDs: [],
        mintAt: '2026-08-13T12:00:00.000Z'
      })
    ).toStrictEqual({
      cards: null,
      tokenIDs: null,
      mintAt: '2026-08-13T12:00:00.000Z'
    })
    expect(sourcePendingCardsListWire([])).toBeNull()
    expect(sourcePendingCardsListWire(null)).toBeNull()
  })
})
