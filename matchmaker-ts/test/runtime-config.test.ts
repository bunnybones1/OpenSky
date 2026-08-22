import { PlayerRank } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { readMinimumConquestRank, readRelaxMatchingRuleIntervals } from '../src'

describe('source relax-matching interval configuration', () => {
  it('keeps independent intervals for every source-selected game mode', () => {
    expect(
      readRelaxMatchingRuleIntervals({
        RELAX_MATCHING_INTERVAL_MS: '11000',
        RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS: '12000',
        RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS: '13000',
        RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS: '14000',
        RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS: '15000'
      })
    ).toEqual({
      defaultMs: 11_000,
      rankedConstructedMs: 12_000,
      rankedDiscoveryMs: 13_000,
      conquestConstructedMs: 14_000,
      conquestDiscoveryMs: 15_000
    })
  })

  it('preserves the reviewed default for absent or invalid mode overrides', () => {
    expect(
      readRelaxMatchingRuleIntervals({
        RELAX_MATCHING_INTERVAL_MS: '17000',
        RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS: '0',
        RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS: 'invalid',
        RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS: '600001'
      })
    ).toEqual({
      defaultMs: 17_000,
      rankedConstructedMs: 17_000,
      rankedDiscoveryMs: 17_000,
      conquestConstructedMs: 17_000,
      conquestDiscoveryMs: 17_000
    })

    expect(readRelaxMatchingRuleIntervals({})).toEqual({
      defaultMs: 30_000,
      rankedConstructedMs: 30_000,
      rankedDiscoveryMs: 30_000,
      conquestConstructedMs: 30_000,
      conquestDiscoveryMs: 30_000
    })
  })
})

describe('source Conquest rank configuration', () => {
  it('maps source ordinals and rejects malformed production policy', () => {
    expect(readMinimumConquestRank('4')).toBe(PlayerRank.APPRENTICE)
    expect(readMinimumConquestRank('7')).toBe(PlayerRank.GRANDWEAVER)
    expect(readMinimumConquestRank(undefined)).toBe(PlayerRank.UNKNOWN)
    for (const value of ['', '-1', '4.0', '8', 'APPRENTICE']) {
      expect(() => readMinimumConquestRank(value)).toThrow(
        'MIN_RANK_TO_PLAY_CONQUEST must be a source rank ordinal'
      )
    }
  })
})
