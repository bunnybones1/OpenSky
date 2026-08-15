import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceGameModeStatusHistoryWire,
  sourceNullableGameModeStatusHistoryListWire
} from '../src/game-mode-history-wire'

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
