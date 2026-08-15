import { describe, expect, it } from 'vitest'
import {
  GameMode,
  ItemType,
  PlayerRank,
  PlayerRankStage,
  RewardExpReason,
  RewardType
} from '@opensky/proto'

import {
  sourceNullableRewardListWire,
  sourceRewardWire,
  type SourceRewardInput
} from '../src/reward-wire'

const inactiveVariants = {
  gameMode: null,
  rank: null,
  exp: null,
  card: null,
  hero: null,
  heroSkin: null,
  deck: null,
  conquestV2TreasureProgress: null,
  stickerPoints: null
}

describe('source Reward JSON wire', () => {
  it('emits every generated union field and nested EXP pointer', () => {
    expect(
      sourceRewardWire({
        accountID: 7,
        type: RewardType.EXP,
        exp: {
          amount: 300,
          reason: RewardExpReason.RankUp,
          currentLevel: 2,
          requiredExp: 200,
          beforeMatchExp: 100
        }
      })
    ).toEqual({
      accountID: 7,
      type: 'EXP',
      ...inactiveVariants,
      exp: {
        amount: 300,
        reason: 'RankUp',
        reasonExtraData: null,
        currentLevel: 2,
        requiredExp: 200,
        beforeMatchExp: 100
      }
    })
  })

  it('projects rank data and retains nullable rank pointers', () => {
    expect(
      sourceRewardWire({
        accountID: 0,
        type: RewardType.RANK,
        gameMode: GameMode.RANKED_CONSTRUCTED,
        rank: {
          beforeMatch: {
            rank: PlayerRank.UNRANKED,
            rankStage: PlayerRankStage.STAGE_I,
            requiredRankPoints: 0,
            rankPosition: 0,
            score: 0,
            scoreAbove: 0,
            scoreBelow: 0
          }
        }
      })
    ).toEqual({
      accountID: 0,
      type: 'RANK',
      ...inactiveVariants,
      gameMode: 'RANKED_CONSTRUCTED',
      rank: {
        beforeMatch: {
          rank: 'UNRANKED',
          rankStage: 'STAGE_I',
          requiredRankPoints: 0,
          rankPosition: 0,
          score: 0,
          scoreAbove: 0,
          scoreBelow: 0
        },
        afterMatch: null
      }
    })
  })

  it('projects nested Card and Item values without private metadata', () => {
    const card = {
      id: 42,
      name: 'Engine Blade',
      description: 'Description',
      asset: 'unit-patty-03',
      class: 'STR',
      element: 'METAL',
      type: 'UNIT',
      manaCost: 1,
      power: 2,
      health: 2,
      keywords: [],
      status: 'PLAY',
      set: 'CORE_SET',
      itemType: 'SW_BASE_CARDS',
      validFromSeason: 1
    }
    const reward = sourceRewardWire({
      accountID: 3,
      type: RewardType.CARD,
      card: {
        amount: 1,
        card,
        item: {
          id: 9,
          itemType: ItemType.SW_BASE_CARDS,
          tokenID: 42,
          balance: '1',
          lastUpdateID: 11,
          privateRowID: 'must-not-leak'
        }
      }
    } as unknown as SourceRewardInput)

    expect(reward.card).toEqual({
      amount: 1,
      card: {
        id: 42,
        name: 'Engine Blade',
        description: 'Description',
        asset: 'unit-patty-03',
        class: 'STR',
        element: 'METAL',
        type: 'UNIT',
        manaCost: 1,
        power: 2,
        health: 2,
        attachedSpellID: null,
        keywords: [],
        status: 'PLAY',
        set: 'CORE_SET',
        imageURL: null,
        itemType: 'SW_BASE_CARDS',
        isNew: null,
        silverCardTokenId: null,
        goldCardTokenId: null
      },
      item: {
        id: 9,
        contractAddress: null,
        itemType: 'SW_BASE_CARDS',
        tokenID: 42,
        balance: '1',
        lastUpdateID: 11,
        updatedAt: null,
        createdAt: null,
        isNew: null
      }
    })
    expect(JSON.stringify(reward)).not.toContain('validFromSeason')
    expect(JSON.stringify(reward)).not.toContain('privateRowID')
  })

  it('preserves source nil-slice semantics at player RPC boundaries', () => {
    expect(sourceNullableRewardListWire([])).toBeNull()
    expect(sourceNullableRewardListWire(null)).toBeNull()
    expect(
      sourceNullableRewardListWire([
        {
          accountID: 0,
          type: RewardType.STICKER_POINTS,
          stickerPoints: 4
        }
      ])
    ).toEqual([
      {
        accountID: 0,
        type: 'STICKER_POINTS',
        ...inactiveVariants,
        stickerPoints: 4
      }
    ])
  })
})
