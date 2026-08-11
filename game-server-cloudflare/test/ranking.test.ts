import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  applySourceRankProtections,
  attenuateRankDelta,
  initialRankState,
  lookupRankByScoreAndExperience,
  parseRankState,
  serializeRankState,
  updateRankState,
  type RankState,
  type RankingOutcome
} from '../src/ranking'

const sourceVectors: Array<{
  input: [RankingOutcome, number, number, number, number, number, number]
  output: [number, number, number]
}> = [
  { input: [1, 1250, 350, 200, 1250, 350, 200], output: [1382.16273136436, 318.430420961991, 243] },
  { input: [1, 2000, 100, 600, 1750, 100, 400], output: [2010.67209296261, 97.8948961277282, 619] },
  { input: [1, 2200, 200, 1000, 2400, 100, 1200], output: [2322.61367558107, 182.753342166943, 1033] },
  { input: [1, 2750, 100, 1200, 2755, 100, 1205], output: [2773.89676015618, 96.9951117625091, 1216] },
  { input: [1, 2900, 100, 1250, 2950, 100, 1250], output: [2926.56977838943, 97.039392304661, 1266] },
  { input: [1, 2300, 100, 1000, 1400, 100, 1100], output: [2300.54142493833, 99.865559053693, 1021] },
  { input: [0, 1250, 350, 300, 1250, 350, 300], output: [1117.83726863564, 318.430420961991, 276] },
  { input: [0, 2000, 100, 600, 1750, 100, 400], output: [1962.59078251652, 97.8948961277282, 586] },
  { input: [0, 2200, 200, 1000, 2400, 100, 1200], output: [2155.04730929987, 182.753342166943, 980] },
  { input: [0, 2750, 100, 1200, 2755, 100, 1205], output: [2726.6952502247, 96.9951117625091, 1186] },
  { input: [0, 2900, 100, 1250, 2950, 100, 1250], output: [2879.32516142906, 97.039392304661, 1236] },
  { input: [0, 2300, 100, 1000, 1400, 100, 1100], output: [2250.50483882682, 99.865559053693, 990] },
  { input: [0.5, 1250, 350, 300, 1250, 350, 300], output: [1250, 318.430420961991, 309] },
  { input: [0.5, 2200, 200, 1000, 2400, 100, 1200], output: [2238.83049244047, 182.753342166943, 1021] },
  { input: [0.5, 2900, 100, 1250, 2950, 100, 1250], output: [2902.94746990924, 97.039392304661, 1251] },
  { input: [1, 1500, 350, 200, 1500, 250, 200], output: [1652.38954052961, 302.26325821035, 244] },
  { input: [1, 1000, 100, 200, 1600, 350, 600], output: [1021.3491368382, 99.5172652549113, 226] },
  { input: [1, 1000, 350, 200, 1600, 100, 600], output: [1514.70083322362, 328.09118124, 249] },
  { input: [1, 2000, 100, 1300, 2600, 137, 1600], output: [2042.3158735393, 99.4107830289981, 1320] },
  { input: [1, 2000, 100, 1300, 2600, 350, 1600], output: [2021.3491368382, 99.5172652549113, 1313] },
  { input: [1, 2000, 350, 1300, 2600, 100, 1600], output: [2514.70083322362, 328.09118124, 1332] }
]

describe('source ranking port', () => {
  it('matches every Go post-match reference vector', () => {
    for (const { input, output } of sourceVectors) {
      const [outcome, rating, deviation, points, opponentRating, opponentDeviation, opponentPoints] = input
      const result = updateRankState(
        outcome,
        { rating, deviation, points },
        { rating: opponentRating, deviation: opponentDeviation, points: opponentPoints }
      )
      expect(result.rating).toBeCloseTo(output[0], 5)
      expect(result.deviation).toBeCloseTo(output[1], 5)
      expect(result.points).toBe(output[2])
    }
  })

  it('matches the Go attenuated-delta table', () => {
    const vectors: Array<[number, number]> = [
      [5, 4.66352163365388], [10, 8.66879849247931],
      [30, 19.1727878031568], [100, 28.0351524454087],
      [500, 29.9116439855198], [1000, 29.9778229312576]
    ]
    for (const [input, expected] of vectors) {
      expect(attenuateRankDelta(input)).toBeCloseTo(expected, 5)
    }
  })

  it('uses the source rank and XP thresholds', () => {
    expect(lookupRankByScoreAndExperience(1200, 200)).toMatchObject({
      rank: PlayerRank.MASTER,
      stage: PlayerRankStage.STAGE_NONE
    })
    expect(lookupRankByScoreAndExperience(1100, 200)).toMatchObject({
      rank: PlayerRank.EXPERT,
      stage: PlayerRankStage.STAGE_III
    })
    expect(lookupRankByScoreAndExperience(100, 199)).toMatchObject({
      rank: PlayerRank.UNRANKED,
      stage: PlayerRankStage.STAGE_NONE
    })
  })

  it('preserves pre-Apprentice RP and deviation protections', () => {
    const current = lookupRankByScoreAndExperience(400, 200)
    const protectedResult = applySourceRankProtections(
      current,
      { rating: 1650, deviation: 200, points: 400 },
      { outcome: 0, rating: 1600, deviation: 180, points: 380 }
    )
    expect(protectedResult.state.points).toBe(400)
    expect(protectedResult.state.deviation).toBe(350)
    expect(protectedResult.rank).toBe(current)
  })

  it('round-trips the compact Go rank-state JSON representation', () => {
    const state: RankState = {
      outcome: 0.5,
      rating: 1800.25,
      deviation: 123.5,
      points: 700
    }
    expect(parseRankState(serializeRankState(state))).toEqual(state)
    expect(parseRankState('', 250)).toEqual({
      rating: 1500,
      deviation: 350,
      points: 250
    })
    expect(initialRankState()).toEqual({
      rating: 1750,
      deviation: 350,
      points: 0
    })
  })
})
