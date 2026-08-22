import { describe, expect, it } from 'vitest'

import type { WeeklyGolds } from '@opensky/proto'

import {
  sourceConquestPointsResponseWire,
  sourceWeeklyGoldsListWire,
  sourceWeeklyGoldsWire,
  type SourceConquestPointsResponse
} from '../src/conquest-wire'

describe('source Conquest wire', () => {
  it('emits only the four required WeeklyGolds fields', () => {
    expect(
      sourceWeeklyGoldsWire({
        startAt: '2026-08-15T00:00:00.000Z',
        endAt: '2026-08-22T00:00:00.000Z',
        tokenId: 131_208,
        totalSupply: 2,
        poolVersion: 'private-policy-metadata'
      } as WeeklyGolds & { poolVersion: string })
    ).toEqual({
      startAt: '2026-08-15T00:00:00.000Z',
      endAt: '2026-08-22T00:00:00.000Z',
      tokenId: 131_208,
      totalSupply: 2
    })
  })

  it('preserves the source make-backed empty list boundary', () => {
    expect(sourceWeeklyGoldsListWire([])).toEqual([])
  })

  it('preserves the generated ConquestPoints keys and strips metadata', () => {
    expect(
      sourceConquestPointsResponseWire({
        points: 29,
        nedeed: 30,
        totalPoints: 129
      } as SourceConquestPointsResponse & { totalPoints: number })
    ).toEqual({ points: 29, nedeed: 30 })
  })
})
