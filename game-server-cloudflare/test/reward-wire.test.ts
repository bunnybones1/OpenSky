import {
  GameMode,
  PlayerRank,
  PlayerRankStage,
  RewardExpReason,
  RewardType,
  type Reward
} from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceMatchEndRewardListWire,
  sourceRewardListWire,
  sourceRewardWire
} from '../src/reward-wire'

const inactiveVariants = {
  card: null,
  hero: null,
  heroSkin: null,
  deck: null,
  conquestV2TreasureProgress: null,
  stickerPoints: null
}

describe('source match reward wire', () => {
  it('serializes the complete Go EXP union and nested pointer', () => {
    expect(
      sourceRewardWire({
        accountID: 17,
        type: RewardType.EXP,
        exp: {
          amount: 30,
          reason: RewardExpReason.MatchPlayed,
          currentLevel: 4,
          requiredExp: 200,
          beforeMatchExp: 75
        }
      })
    ).toEqual({
      accountID: 17,
      type: RewardType.EXP,
      gameMode: null,
      rank: null,
      exp: {
        amount: 30,
        reason: RewardExpReason.MatchPlayed,
        reasonExtraData: null,
        currentLevel: 4,
        requiredExp: 200,
        beforeMatchExp: 75
      },
      ...inactiveVariants
    })
  })

  it('preserves the active rank variant and nulls every inactive variant', () => {
    const beforeMatch = {
      rank: PlayerRank.WANDERER,
      rankStage: PlayerRankStage.STAGE_I,
      requiredRankPoints: 100,
      rankPosition: 9,
      score: 50,
      scoreAbove: 60,
      scoreBelow: 40
    }
    const afterMatch = {
      ...beforeMatch,
      rankStage: PlayerRankStage.STAGE_II,
      requiredRankPoints: 200,
      score: 110
    }
    expect(
      sourceRewardWire({
        accountID: 18,
        type: RewardType.RANK,
        gameMode: GameMode.RANKED_CONSTRUCTED,
        rank: { beforeMatch, afterMatch }
      })
    ).toEqual({
      accountID: 18,
      type: RewardType.RANK,
      gameMode: GameMode.RANKED_CONSTRUCTED,
      rank: { beforeMatch, afterMatch },
      exp: null,
      ...inactiveVariants
    })
  })

  it('repairs sparse stored rewards before reconnect and recent-match reads', () => {
    const sparse = {
      accountID: 19,
      type: RewardType.CONQUEST_POINTS,
      conquestV2TreasureProgress: {
        beforeMatch: {
          treasureLevel: 0,
          treasurePoints: 0,
          treasurePointsRequired: 250
        },
        afterMatch: {
          treasureLevel: 0,
          treasurePoints: 10,
          treasurePointsRequired: 240
        }
      }
    } as Reward

    expect(sourceRewardListWire([sparse])).toEqual([
      {
        accountID: 19,
        type: RewardType.CONQUEST_POINTS,
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: sparse.conquestV2TreasureProgress,
        stickerPoints: null
      }
    ])
  })

  it('preserves the source terminal producer order around Conquest rewards', () => {
    const reward = (accountID: number, type: RewardType) =>
      ({ accountID, type }) as Reward

    expect(
      sourceMatchEndRewardListWire({
        rankAndStats: [reward(1, RewardType.EXP), reward(2, RewardType.RANK)],
        matchExperience: [
          reward(3, RewardType.EXP),
          reward(4, RewardType.EXP),
          reward(7, RewardType.RANK)
        ],
        conquestCards: [reward(5, RewardType.CARD)],
        conquestPoints: [reward(6, RewardType.CONQUEST_POINTS)]
      }).map(value => value.accountID)
    ).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('fails closed when a producer receipt crosses its source phase', () => {
    const reward = (type: RewardType) => ({ accountID: 1, type }) as Reward
    const valid = {
      rankAndStats: [reward(RewardType.RANK)],
      matchExperience: [reward(RewardType.EXP)],
      conquestCards: [reward(RewardType.CARD)],
      conquestPoints: [reward(RewardType.CONQUEST_POINTS)]
    }

    for (const mutation of [
      { ...valid, rankAndStats: [reward(RewardType.CARD)] },
      {
        ...valid,
        matchExperience: [reward(RewardType.RANK), reward(RewardType.EXP)]
      },
      { ...valid, matchExperience: [reward(RewardType.CARD)] },
      { ...valid, conquestCards: [reward(RewardType.CONQUEST_POINTS)] },
      { ...valid, conquestPoints: [reward(RewardType.CARD)] }
    ]) {
      expect(() => sourceMatchEndRewardListWire(mutation)).toThrow(
        /invalid phase/
      )
    }
  })
})
