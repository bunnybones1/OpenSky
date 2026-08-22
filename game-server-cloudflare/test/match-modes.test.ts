import { GameMode } from '@opensky/proto'
import { sourceGameServerMode } from '@opensky/shared/match-modes'
import { describe, expect, it } from 'vitest'

describe('source game-server mode', () => {
  it('retains equal modes and maps either mixed ordering to UNKNOWN', () => {
    expect(
      sourceGameServerMode([
        GameMode.RANKED_CONSTRUCTED,
        GameMode.RANKED_CONSTRUCTED
      ])
    ).toBe(GameMode.RANKED_CONSTRUCTED)
    expect(
      sourceGameServerMode([GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED])
    ).toBe(GameMode.UNKNOWN)
    expect(
      sourceGameServerMode([GameMode.RANKED_CONSTRUCTED, GameMode.PRACTICE_PVP])
    ).toBe(GameMode.UNKNOWN)
  })
})
