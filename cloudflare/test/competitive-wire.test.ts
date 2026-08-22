import { DeckClass, type Account, type AccountStat } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceDeckRankAccountWire,
  sourceDeckRankWire,
  sourceLeaderboardEntryWire
} from '../src/competitive-wire'

describe('source competitive JSON wire', () => {
  it('emits all DeckRank fields, explicit pointer and slice nulls, and float32 values', () => {
    expect(
      sourceDeckRankWire({
        deckString: 'deck',
        class: DeckClass.STR,
        cardIds: null,
        winCount: 1,
        lossCount: 2,
        forfeitCount: 3,
        abandonCount: 4,
        tieCount: 5,
        winRatio: 1 / 3,
        gamesPlayed: 16_777_217,
        score: null,
        highestPlayerID: '0',
        highestPlayerAddress: '',
        rankState: 'private',
        cardsRevision: 99,
        cursor: 'private'
      } as Parameters<typeof sourceDeckRankWire>[0] & {
        rankState: string
        cardsRevision: number
        cursor: string
      })
    ).toEqual({
      deckString: 'deck',
      class: 'STR',
      cardIds: null,
      winCount: 1,
      lossCount: 2,
      forfeitCount: 3,
      abandonCount: 4,
      tieCount: 5,
      winRatio: 0.33333334,
      gamesPlayed: 16_777_216,
      score: null,
      highestPlayerID: '0',
      highestPlayerAddress: ''
    })
  })

  it('preserves nullable DeckRankAccount pointers and normalizes a populated account', () => {
    expect(sourceDeckRankAccountWire({})).toEqual({
      deckRank: null,
      highestPlayer: null
    })
    expect(
      sourceDeckRankAccountWire({
        deckRank: {
          deckString: 'deck',
          class: DeckClass.STR,
          cardIds: [],
          winCount: 0,
          lossCount: 0,
          forfeitCount: 0,
          abandonCount: 0,
          tieCount: 0,
          highestPlayerID: '1',
          highestPlayerAddress: ''
        },
        highestPlayer: {
          id: 1,
          address: 'identity:weasel',
          name: 'Weasel',
          locale: 'en',
          experience: 0,
          warmUps: 0,
          level: 1,
          seasonLevel: 0,
          levelUpXP: 200
        } as Account
      }).highestPlayer
    ).toMatchObject({
      address: 'identity:weasel',
      stats: null,
      settings: null,
      crystalID: null
    })
  })

  it('preserves LeaderboardEntry pointers and reuses public nested projections', () => {
    expect(sourceLeaderboardEntryWire({})).toEqual({
      account: null,
      accountStat: null,
      rank: 0,
      rankedSilverReward: 0,
      rankedTicketReward: 0
    })
    const stat = {
      gameMode: 'RANKED_CONSTRUCTED',
      winCount: 1,
      lossCount: 0,
      tieCount: 0,
      forfeitCount: 0,
      abandonCount: 0,
      winRatio: 1,
      gamesPlayed: 1,
      playerRank: 'WANDERER',
      playerRankStage: 'STAGE_I',
      winStreak: 1,
      lossStreak: 0
    } as AccountStat
    expect(
      sourceLeaderboardEntryWire({
        accountStat: stat,
        rank: 2,
        rankedSilverReward: 8,
        rankedTicketReward: 1
      })
    ).toEqual({
      account: null,
      accountStat: expect.objectContaining({
        gameMode: 'RANKED_CONSTRUCTED',
        score: null,
        rank: null,
        rankProgress: null
      }),
      rank: 2,
      rankedSilverReward: 8,
      rankedTicketReward: 1
    })
  })
})
