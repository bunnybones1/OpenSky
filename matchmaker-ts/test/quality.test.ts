import { CardClass, GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  calculateMatchQuality,
  createPlayer,
  factor,
  factorString,
  mmrDifferenceFactor,
  quality,
  rematchFactor,
  sameHeroFactor,
  tradableCardsFactor
} from '../src'

describe('Go match-quality compatibility', () => {
  it('preserves the weighted geometric quality formula', () => {
    expect(quality(factor('foo', 1, 1, 1), factor('bar', 2, 2, 2))).toBeCloseTo(
      3.684,
      3
    )
  })

  it('preserves each source factor and score cap', () => {
    const player1 = createPlayer({
      address: '0x01',
      mode: GameMode.RANKED_CONSTRUCTED,
      score: 10,
      prisms: [CardClass.STR],
      cards: new Map([[1, 'base']]),
      recentMatches: [{ opponentId: '0x02' }]
    })
    const player2 = createPlayer({
      address: '0x02',
      mode: GameMode.RANKED_CONSTRUCTED,
      score: 20,
      prisms: [CardClass.STR],
      cards: new Map([[2, 'base']]),
      recentMatches: [{ opponentId: '0x01' }]
    })

    expect(mmrDifferenceFactor(player1, player2)).toEqual(
      factor('MMR Difference', 0.05, 5, 10)
    )
    expect(factorString(sameHeroFactor(player1, player2))).toBe('Mirror Match: 1')
    expect(tradableCardsFactor(player1, player2)).toEqual(
      factor('Tradable cards', 15, -0.5, 1)
    )
    expect(rematchFactor(player1, player2)).toEqual(factor('Rematch', 40, 1, 1))
    expect(calculateMatchQuality(player1, player2)).toBeGreaterThan(0)

    player2.score = 20_000
    expect(mmrDifferenceFactor(player1, player2).value).toBe(1590)
  })

  it('treats missing or tradable card inventories exactly like the Go calculator', () => {
    const player1 = createPlayer({ address: '0x01', cards: undefined })
    const player2 = createPlayer({
      address: '0x02',
      cards: new Map([[2, 'silver']])
    })
    expect(tradableCardsFactor(player1, player2).value).toBe(0)
    player1.cards = new Map([[1, 'base']])
    expect(tradableCardsFactor(player1, player2).value).toBe(0)
    player2.cards = new Map([[2, 'base']])
    expect(tradableCardsFactor(player1, player2).value).toBe(1)
  })
})
