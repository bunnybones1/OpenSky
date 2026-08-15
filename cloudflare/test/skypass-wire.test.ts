import {
  CardSet,
  DeckClass,
  ItemType,
  RewardExpReason,
  RewardType,
  SkypassTier
} from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceListSkypassRewardsWire,
  sourceNullableSkypassRewardListWire,
  sourceSkypassRewardWire
} from '../src/skypass-wire'

describe('source SkyPass JSON wire', () => {
  it('preserves required pointers and omits nil optional fields', () => {
    expect(
      sourceSkypassRewardWire({
        id: 12,
        level: 2,
        season: 62,
        tier: SkypassTier.PREMIUM,
        itemType: ItemType.SW_CONQUEST_TICKET,
        amount: 1,
        isStarter: false,
        isInfinite: false,
        claimable: false,
        claimed: false
      })
    ).toEqual({
      id: 12,
      level: 2,
      season: 62,
      tier: 'PREMIUM',
      itemType: 'SW_CONQUEST_TICKET',
      amount: 1,
      isStarter: false,
      isInfinite: false,
      claimable: false,
      claimed: false,
      gainedRewards: null
    })
  })

  it('omits zero amount and empty attribute slices but preserves the pointer', () => {
    expect(
      sourceSkypassRewardWire({
        id: 13,
        level: 6,
        season: 62,
        tier: SkypassTier.FREE,
        itemType: ItemType.SW_HERO,
        amount: 0,
        isStarter: true,
        isInfinite: false,
        attributes: {
          tokenIDs: [2],
          cardSets: [],
          cardSetsExcluded: [CardSet.HEXBOUND_INVASION],
          unlockDeckClasses: [DeckClass.AGY]
        },
        claimable: true,
        claimed: true,
        gainedRewards: []
      })
    ).toEqual({
      id: 13,
      level: 6,
      season: 62,
      tier: 'FREE',
      itemType: 'SW_HERO',
      isStarter: true,
      isInfinite: false,
      attributes: {
        tokenIDs: [2],
        cardSetsExcluded: ['HEXBOUND_INVASION'],
        unlockDeckClasses: ['AGY']
      },
      claimable: true,
      claimed: true,
      gainedRewards: []
    })
  })

  it('normalizes gained rewards and nullable required enum pointers', () => {
    expect(
      sourceSkypassRewardWire({
        id: 14,
        level: 0,
        season: 62,
        tier: null,
        itemType: null,
        amount: 0,
        isStarter: false,
        isInfinite: false,
        attributes: {},
        claimable: false,
        claimed: true,
        gainedRewards: [
          {
            accountID: 3,
            type: RewardType.EXP,
            exp: {
              amount: 100,
              reason: RewardExpReason.DailyQuest,
              currentLevel: 1,
              requiredExp: 200,
              beforeMatchExp: 0
            }
          }
        ]
      })
    ).toMatchObject({
      tier: null,
      itemType: null,
      attributes: {},
      gainedRewards: [
        {
          accountID: 3,
          type: 'EXP',
          gameMode: null,
          rank: null,
          card: null
        }
      ]
    })
  })

  it('preserves source nil slices for empty list results', () => {
    expect(sourceNullableSkypassRewardListWire([])).toBeNull()
    expect(
      sourceListSkypassRewardsWire({
        levels: [],
        seasonNumber: 62,
        seasonName: 'Frosted Redux',
        hasPremium: false
      })
    ).toEqual({
      levels: null,
      seasonNumber: 62,
      seasonName: 'Frosted Redux',
      hasPremium: false
    })
  })
})
