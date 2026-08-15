import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceGameModeStatusHistoryWire,
  sourceGameModesStatusWire,
  sourceNullableGameModeStatusHistoryListWire
} from '../src/game-mode-history-wire'

describe('source game-mode status JSON wire', () => {
  it('emits exactly the ten generated Go fields and strips upstream metadata', () => {
    expect(
      sourceGameModesStatusWire({
        tutorial: true,
        practicePVP: true,
        practiceBot: true,
        warmUp: false,
        rankedConstructed: true,
        rankedDiscovery: false,
        conquestConstructed: true,
        conquestDiscovery: false,
        challengeConstructed: true,
        challengeDiscovery: false,
        internalStatusRevision: 'private'
      } as Parameters<typeof sourceGameModesStatusWire>[0] & {
        internalStatusRevision: string
      })
    ).toEqual({
      tutorial: true,
      practicePVP: true,
      practiceBot: true,
      warmUp: false,
      rankedConstructed: true,
      rankedDiscovery: false,
      conquestConstructed: true,
      conquestDiscovery: false,
      challengeConstructed: true,
      challengeDiscovery: false
    })
  })

  it('uses Go zero values for a directly projected empty struct', () => {
    expect(sourceGameModesStatusWire({})).toEqual({
      tutorial: false,
      practicePVP: false,
      practiceBot: false,
      warmUp: false,
      rankedConstructed: false,
      rankedDiscovery: false,
      conquestConstructed: false,
      conquestDiscovery: false,
      challengeConstructed: false,
      challengeDiscovery: false
    })
  })
})

describe('source game-mode status history JSON wire', () => {
  it('emits required enum and time pointers as explicit null', () => {
    expect(sourceGameModeStatusHistoryWire({})).toEqual({
      id: 0,
      gameMode: null,
      enabled: false,
      createdAt: null
    })
  })

  it('preserves a populated row without private account or cursor fields', () => {
    expect(
      sourceGameModeStatusHistoryWire({
        id: 7,
        gameMode: GameMode.PRACTICE_PVP,
        enabled: true,
        createdAt: '2026-08-15T00:00:00.000Z'
      })
    ).toEqual({
      id: 7,
      gameMode: 'PRACTICE_PVP',
      enabled: true,
      createdAt: '2026-08-15T00:00:00.000Z'
    })
  })

  it('preserves the source nil list output', () => {
    expect(sourceNullableGameModeStatusHistoryListWire([])).toBeNull()
  })
})
