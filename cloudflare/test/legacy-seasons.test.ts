import { describe, expect, it } from 'vitest'

import {
  currentSeasonStart,
  nextSeasonStart,
  questAutoRerollTimes,
  seasonFromDate,
  seasonStart,
  seasonWeekFromDate
} from '../src/legacy-seasons'

describe('source season clock compatibility', () => {
  it('keeps the source season-one anchor and four-week cadence', () => {
    expect(seasonStart(1).toISOString()).toBe('2021-11-22T14:00:00.000Z')
    expect(seasonFromDate(new Date('2026-08-10T15:00:00.000Z'))).toBe(62)
    expect(seasonWeekFromDate(new Date('2026-08-10T15:00:00.000Z'))).toEqual({
      season: 62,
      week: 3
    })
  })

  it('preserves the source one-second current-season offset', () => {
    const date = new Date('2026-08-10T15:00:00.000Z')
    expect(currentSeasonStart(date).toISOString()).toBe(
      '2026-07-27T14:00:01.000Z'
    )
    expect(nextSeasonStart(date).toISOString()).toBe(
      '2026-08-24T14:00:00.000Z'
    )
  })

  it('changes seasons at the exact source boundary', () => {
    const before = new Date('2026-08-24T13:59:59.999Z')
    const boundary = new Date('2026-08-24T14:00:00.000Z')

    expect(seasonFromDate(before)).toBe(62)
    expect(nextSeasonStart(before).toISOString()).toBe(
      '2026-08-24T14:00:00.000Z'
    )
    expect(seasonFromDate(boundary)).toBe(63)
    expect(currentSeasonStart(boundary).toISOString()).toBe(
      '2026-08-24T14:00:01.000Z'
    )
  })

  it('derives daily, weekly, and seasonal quest rerolls from the same clock', () => {
    expect(
      questAutoRerollTimes(new Date('2026-08-10T15:00:00.000Z'))
    ).toEqual({
      daily: '2026-08-11T14:00:00.000Z',
      weekly: '2026-08-17T14:00:00.000Z',
      seasonal: '2026-08-24T14:00:00.000Z'
    })
  })

  it('keeps an exact 14:00 daily boundary and advances one millisecond later', () => {
    expect(
      questAutoRerollTimes(new Date('2026-08-10T14:00:00.000Z')).daily
    ).toBe('2026-08-10T14:00:00.000Z')
    expect(
      questAutoRerollTimes(new Date('2026-08-10T14:00:00.001Z')).daily
    ).toBe('2026-08-11T14:00:00.000Z')
  })
})
