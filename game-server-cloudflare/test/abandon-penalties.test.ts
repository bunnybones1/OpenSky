import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  abandonPenaltyForCount,
  isLeavePenaltyMode,
  readAbandonPenaltyConfig
} from '../src/abandon-penalties'

describe('source abandon penalty policy', () => {
  it('uses the checked-in source defaults and bounds configured values', () => {
    expect(readAbandonPenaltyConfig({})).toEqual({
      windowMs: 86_400_000,
      penaltyMs: [0, 0, 0, 0]
    })
    expect(
      readAbandonPenaltyConfig({
        ABANDON_PENALTY_WINDOW_MS: '60000',
        ABANDON_PENALTY_SECONDS: '0,2,4,invalid,999999'
      })
    ).toEqual({ windowMs: 60_000, penaltyMs: [0, 2_000, 4_000] })
  })

  it('caps the abandon count at the final source penalty entry', () => {
    expect(abandonPenaltyForCount([0, 2_000, 4_000], 1)).toBe(0)
    expect(abandonPenaltyForCount([0, 2_000, 4_000], 2)).toBe(2_000)
    expect(abandonPenaltyForCount([0, 2_000, 4_000], 99)).toBe(4_000)
  })

  it('only penalizes ranked and conquest modes', () => {
    expect(isLeavePenaltyMode(GameMode.RANKED_CONSTRUCTED)).toBe(true)
    expect(isLeavePenaltyMode(GameMode.RANKED_DISCOVERY)).toBe(true)
    expect(isLeavePenaltyMode(GameMode.CONQUEST_CONSTRUCTED)).toBe(true)
    expect(isLeavePenaltyMode(GameMode.PRACTICE_PVP)).toBe(false)
    expect(isLeavePenaltyMode(GameMode.CHALLENGE_CONSTRUCTED)).toBe(false)
  })
})
