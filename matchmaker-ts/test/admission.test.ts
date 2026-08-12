import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { validateGameModeDataConsistency } from '../src/admission'
import { FindMatchCommand, ProtocolError } from '../src/protocol'

const command = (
  mode: GameMode,
  cards: string[],
  sessionID = ''
): FindMatchCommand => ({
  type: 'find_match',
  privateSeed: { cards, prisms: ['str'] },
  sessionID,
  mode,
  versionHash: 'release-1',
  playerSessionID: 'player-session-1'
})

const reason = (run: () => void) => {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ProtocolError)
    return (error as ProtocolError).reason
  }
  return undefined
}

describe('source game-mode data consistency', () => {
  it.each([
    GameMode.RANKED_DISCOVERY,
    GameMode.CONQUEST_DISCOVERY
  ])('requires a random deck for %s', mode => {
    expect(() =>
      validateGameModeDataConsistency(command(mode, []))
    ).not.toThrow()
    expect(
      reason(() => validateGameModeDataConsistency(command(mode, ['6'])))
    ).toBe('DECK_IS_NOT_RANDOM')
  })

  it('requires a session for constructed challenges', () => {
    expect(
      reason(() =>
        validateGameModeDataConsistency(
          command(GameMode.CHALLENGE_CONSTRUCTED, ['6'])
        )
      )
    ).toBe('SESSION_IS_EMPTY')
    expect(() =>
      validateGameModeDataConsistency(
        command(GameMode.CHALLENGE_CONSTRUCTED, ['6'], 'WEASEL')
      )
    ).not.toThrow()
  })

  it('checks a challenge-discovery session before deck randomness', () => {
    expect(
      reason(() =>
        validateGameModeDataConsistency(
          command(GameMode.CHALLENGE_DISCOVERY, ['6'])
        )
      )
    ).toBe('SESSION_IS_EMPTY')
    expect(
      reason(() =>
        validateGameModeDataConsistency(
          command(GameMode.CHALLENGE_DISCOVERY, ['6'], 'WEASEL')
        )
      )
    ).toBe('DECK_IS_NOT_RANDOM')
    expect(() =>
      validateGameModeDataConsistency(
        command(GameMode.CHALLENGE_DISCOVERY, [], 'WEASEL')
      )
    ).not.toThrow()
  })

  it('leaves other game modes unchanged', () => {
    expect(() =>
      validateGameModeDataConsistency(
        command(GameMode.PRACTICE_PVP, ['6'])
      )
    ).not.toThrow()
  })
})
