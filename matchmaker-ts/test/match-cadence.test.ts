import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  findRunnerForMode,
  makeRunnerForMode,
  matchRunnerIntervalMs,
  nextMatchRunnerDeadline,
  readMatchCadence,
  SOURCE_MATCH_RUNNERS
} from '../src'

describe('source matchmaker cadence', () => {
  it('preserves every independent source interval and fallback', () => {
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

  it('maps the exact nine source runners without inventing Conquest Discovery', () => {
    expect(
      SOURCE_MATCH_RUNNERS.map(runner => ({
        id: runner.id,
        phase: runner.phase,
        groups: runner.groups
      }))
    ).toEqual([
      {
        id: 'find-practice-bot',
        phase: 'find',
        groups: [[GameMode.PRACTICE_BOT], [GameMode.WARM_UP]]
      },
      {
        id: 'find-practice-pvp',
        phase: 'find',
        groups: [
          [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
          [GameMode.RANKED_DISCOVERY]
        ]
      },
      {
        id: 'find-conquest-constructed',
        phase: 'find',
        groups: [[GameMode.CONQUEST_CONSTRUCTED]]
      },
      {
        id: 'find-challenge-constructed',
        phase: 'find',
        groups: [[GameMode.CHALLENGE_CONSTRUCTED]]
      },
      {
        id: 'find-challenge-discovery',
        phase: 'find',
        groups: [[GameMode.CHALLENGE_DISCOVERY]]
      },
      {
        id: 'make-practice-pvp',
        phase: 'make',
        groups: [
          [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
          [GameMode.RANKED_DISCOVERY]
        ]
      },
      {
        id: 'make-conquest-constructed',
        phase: 'make',
        groups: [[GameMode.CONQUEST_CONSTRUCTED]]
      },
      {
        id: 'make-challenge-constructed',
        phase: 'make',
        groups: [[GameMode.CHALLENGE_CONSTRUCTED]]
      },
      {
        id: 'make-challenge-discovery',
        phase: 'make',
        groups: [[GameMode.CHALLENGE_DISCOVERY]]
      }
    ])
    expect(findRunnerForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()
    expect(makeRunnerForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()
  })

  it('uses runner-specific intervals and advances a delayed ticker by phase', () => {
    const cadence = readMatchCadence({})
    expect(
      matchRunnerIntervalMs(findRunnerForMode(GameMode.PRACTICE_BOT)!, cadence)
    ).toBe(5_000)
    expect(
      matchRunnerIntervalMs(
        findRunnerForMode(GameMode.CHALLENGE_DISCOVERY)!,
        cadence
      )
    ).toBe(2_000)
    expect(nextMatchRunnerDeadline(10_000, 2_000, 10_000)).toBe(12_000)
    expect(nextMatchRunnerDeadline(10_000, 2_000, 14_500)).toBe(16_000)
    expect(nextMatchRunnerDeadline(20_000, 2_000, 14_500)).toBe(20_000)
  })
})
