import {
  GameMode,
  PlayerRank,
  PlayerRankStage,
  RewardExpReason,
  RewardType,
  type Reward
} from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { sourceRewardListWire, sourceRewardWire } from '../src/reward-wire'

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
})
