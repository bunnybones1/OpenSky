import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  findWindowForMode,
  MATCH_FIND_WINDOWS,
  matchFindWindowIntervalMs,
  nextMatchFindWindowDeadline,
  readMatchCadence
} from '../src'

describe('matchmaker effect cadence', () => {
  it('preserves every player-visible interval boundary and fallback', () => {
    const configured = readMatchCadence({
      MATCH_INTERVAL_PRACTICE_BOT_MS: '1100',
      MATCH_INTERVAL_PRACTICE_PVP_MS: '1200',
      MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS: '1300',
      MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS: '1400',
      MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS: '1500',
      MATCH_INTERVAL_MAKE_MATCH_MS: '1600'
    })
    expect(configured).toEqual({
      practiceBotMs: 1_100,
      practicePvpMs: 1_200,
      conquestConstructedMs: 1_300,
      challengeConstructedMs: 1_400,
      challengeDiscoveryMs: 1_500,
      makeMatchMs: 1_600
    })
    expect(readMatchCadence({})).toEqual({
      practiceBotMs: 5_000,
      practicePvpMs: 5_000,
      conquestConstructedMs: 2_000,
      challengeConstructedMs: 2_000,
      challengeDiscoveryMs: 2_000,
      makeMatchMs: 2_000
    })
    expect(
      readMatchCadence({
        MATCH_INTERVAL_PRACTICE_BOT_MS: '0',
        MATCH_INTERVAL_PRACTICE_PVP_MS: 'invalid',
        MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS: '30001'
      })
    ).toMatchObject({
      practiceBotMs: 5_000,
      practicePvpMs: 5_000,
      conquestConstructedMs: 2_000
    })
  })

  it('maps the five compatible find windows without inventing Conquest Discovery', () => {
    expect(
      MATCH_FIND_WINDOWS.map(window => ({
        id: window.id,
        groups: window.groups,
        directBot: window.directBot
      }))
    ).toEqual([
      {
        id: 'find-practice-bot',
        groups: [[GameMode.PRACTICE_BOT], [GameMode.WARM_UP]],
        directBot: true
      },
      {
        id: 'find-practice-pvp',
        groups: [
          [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
          [GameMode.RANKED_DISCOVERY]
        ],
        directBot: false
      },
      {
        id: 'find-conquest-constructed',
        groups: [[GameMode.CONQUEST_CONSTRUCTED]],
        directBot: false
      },
      {
        id: 'find-challenge-constructed',
        groups: [[GameMode.CHALLENGE_CONSTRUCTED]],
        directBot: false
      },
      {
        id: 'find-challenge-discovery',
        groups: [[GameMode.CHALLENGE_DISCOVERY]],
        directBot: false
      }
    ])
    expect(findWindowForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()
  })

  it('uses group-specific boundaries and advances a delayed window beyond now', () => {
    const cadence = readMatchCadence({})
    expect(
      matchFindWindowIntervalMs(
        findWindowForMode(GameMode.PRACTICE_BOT)!,
        cadence
      )
    ).toBe(5_000)
    expect(
      matchFindWindowIntervalMs(
        findWindowForMode(GameMode.CHALLENGE_DISCOVERY)!,
        cadence
      )
    ).toBe(2_000)
    expect(nextMatchFindWindowDeadline(10_000, 2_000, 10_000)).toBe(12_000)
    expect(nextMatchFindWindowDeadline(10_000, 2_000, 14_500)).toBe(16_000)
    expect(nextMatchFindWindowDeadline(20_000, 2_000, 14_500)).toBe(20_000)
  })
})
