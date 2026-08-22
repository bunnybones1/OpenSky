import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { PenaltyTracker } from '../src/penalties'

const subject = {
  address: '0x1111111111111111111111111111111111111111',
  mode: GameMode.RANKED_CONSTRUCTED
}

const memoryStorage = () => {
  const values = new Map<string, unknown>()
  return {
    values,
    storage: {
      get: (key: string) => Promise.resolve(values.get(key)),
      put: (key: string, value: unknown) => {
        values.set(key, value)
        return Promise.resolve()
      },
      delete: (keys: string | string[]) => {
        for (const key of Array.isArray(keys) ? keys : [keys])
          values.delete(key)
        return Promise.resolve(true)
      }
    } as unknown as DurableObjectStorage
  }
}

describe('source matchmaker penalty tracker', () => {
  it('escalates refusals within the window and resets after a successful match', async () => {
    const { storage } = memoryStorage()
    const tracker = new PenaltyTracker(storage, {
      acceptTimeoutPenaltyMs: 20_000,
      refusalWindowMs: 86_400_000,
      refusalPenaltyMs: [0, 2_000, 4_000]
    })

    expect(await tracker.setRefusalPenalty(subject, 1_000)).toBe(0)
    expect(await tracker.getPenaltyMs(subject, 1_100)).toBe(0)
    expect(await tracker.setRefusalPenalty(subject, 2_000)).toBe(2_000)
    expect(await tracker.getPenaltyMs(subject, 2_500)).toBe(1_500)
    expect(await tracker.setRefusalPenalty(subject, 5_000)).toBe(4_000)
    expect(await tracker.getPenaltyMs(subject, 5_500)).toBe(3_500)

    await tracker.deleteRefusalPenalty(subject)
    expect(await tracker.getPenaltyMs(subject, 5_500)).toBe(0)
    expect(await tracker.setRefusalPenalty(subject, 6_000)).toBe(0)
  })

  it('returns the longest live refusal or acceptance-timeout penalty', async () => {
    const { storage } = memoryStorage()
    const tracker = new PenaltyTracker(storage, {
      acceptTimeoutPenaltyMs: 20_000,
      refusalWindowMs: 60_000,
      refusalPenaltyMs: [30_000]
    })

    await tracker.setRefusalPenalty(subject, 1_000)
    await tracker.setAcceptTimeoutPenalty(subject, 5_000)
    expect(await tracker.getPenaltyMs(subject, 10_000)).toBe(21_000)
    expect(await tracker.getPenaltyMs(subject, 26_000)).toBe(5_000)
    expect(await tracker.getPenaltyMs(subject, 31_001)).toBe(0)
  })
})
