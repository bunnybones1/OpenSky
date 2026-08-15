import { describe, expect, it } from 'vitest'

import {
  sourceConquestTreasureInfoMapWire,
  sourceConquestV2PoolConfigWire,
  sourceConquestV2SummaryWire,
  sourceConquestV2TreasureProgressWire,
  sourceNullableConquestV2AccountTreasureProgressListWire
} from '../src/conquest-v2-wire'

describe('Conquest V2 generated Go wire', () => {
  it('emits every nil config pointer as an explicit null', () => {
    expect(sourceConquestV2PoolConfigWire({})).toEqual({
      default: null,
      settings: null,
      final: null
    })
    expect(
      sourceConquestV2PoolConfigWire({
        settings: {
          maxPoolCeiling: null,
          poolCeiling: 10,
          poolFloor: 2,
          topWeightUnitPrice: 1.25,
          bottomWeightUnitPrice: 0.75,
          weightPerSilverCard: 0
        }
      }).settings
    ).toEqual({
      maxPoolCeiling: null,
      poolCeiling: 10,
      poolFloor: 2,
      topWeightUnitPrice: 1.25,
      bottomWeightUnitPrice: 0.75,
      weightPerSilverCard: 0
    })
  })

  it('distinguishes a nil summary slice from an allocated empty slice', () => {
    expect(
      sourceConquestV2SummaryWire({
        pool: 0,
        totalWeight: 0,
        weightUnitPrice: 0,
        treasureLevels: null
      })
    ).toEqual({
      pool: 0,
      totalWeight: 0,
      weightUnitPrice: 0,
      treasureLevels: null
    })
    expect(
      sourceConquestV2SummaryWire({
        pool: 0,
        totalWeight: 0,
        weightUnitPrice: 0,
        treasureLevels: []
      }).treasureLevels
    ).toEqual([])
  })

  it('preserves nil staff lists and pointers while keeping scalar fields', () => {
    expect(sourceNullableConquestV2AccountTreasureProgressListWire([])).toBe(
      null
    )
    expect(
      sourceNullableConquestV2AccountTreasureProgressListWire([
        { accountID: 7, accountName: 'Weasel', progress: null }
      ])
    ).toEqual([{ accountID: 7, accountName: 'Weasel', progress: null }])
    expect(
      sourceConquestV2TreasureProgressWire({
        treasureLevel: 0,
        treasurePoints: 0,
        treasurePointsRequired: 250
      })
    ).toEqual({
      treasureLevel: 0,
      treasurePoints: 0,
      treasurePointsRequired: 250
    })
  })

  it('preserves nil map values from Go pointer-valued treasure maps', () => {
    expect(
      sourceConquestTreasureInfoMapWire({
        0: { amountSilver: 1, amountUSDC: 0 },
        1: null
      })
    ).toEqual({
      0: { amountSilver: 1, amountUSDC: 0 },
      1: null
    })
  })
})
