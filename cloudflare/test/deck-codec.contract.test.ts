import { DeckClass } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  decodeDeckString,
  encodeDeckString,
  validateDeckClass
} from '../src/deck-codec'
import { STARTER_CARD_IDS, STRENGTH_STARTER_DECK } from '../src/player'

describe('legacy deck string contract', () => {
  it('encodes and decodes the exact original Strength starter deck', () => {
    expect(encodeDeckString(STARTER_CARD_IDS, DeckClass.STR)).toBe(
      STRENGTH_STARTER_DECK
    )
    expect(decodeDeckString(STRENGTH_STARTER_DECK)).toEqual({
      cardIds: STARTER_CARD_IDS,
      deckClass: 'STR'
    })
    expect(() =>
      validateDeckClass(STARTER_CARD_IDS, DeckClass.STR)
    ).not.toThrow()
  })
})
