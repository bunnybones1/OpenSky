import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  normalizePrivateSeedForIdentity,
  validateGameModeDataConsistency
} from '../src/admission'
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

describe('identity-native private seed normalization', () => {
  const valid = (): FindMatchCommand => ({
    ...command(GameMode.PRACTICE_PVP, ['+6', '030']),
    privateSeed: {
      player: 'forged-browser-claim',
      subkey: Array(20).fill(2),
      signature: 'not-a-signature',
      prisms: ['STR'],
      cards: ['+6', '030'],
      randomSeed: Array(16).fill(3),
      cardRarities: { 6: 'gold' }
    }
  })

  it('replaces browser identity claims and canonicalizes source wire types', () => {
    const normalized = normalizePrivateSeedForIdentity(
      valid(),
      '0x1111111111111111111111111111111111111111'
    )
    expect(normalized.privateSeed).toMatchObject({
      player: Array(20).fill(0x11),
      subkey: Array(20).fill(2),
      signature: Array(65).fill(0),
      prisms: ['str'],
      cards: ['6', '30'],
      randomSeed: Array(16).fill(3),
      cardRarities: {}
    })
  })

  it.each([
    ['short subkey', { subkey: [1] }],
    ['short random seed', { randomSeed: [1] }],
    ['unknown prism', { prisms: ['cloud'] }],
    ['duplicate prism class', { prisms: ['str', 'str'] }],
    ['negative card', { cards: ['-1'] }],
    ['uint64 overflow', { cards: ['18446744073709551616'] }]
  ])('rejects %s', (_name, replacement) => {
    const input = valid()
    input.privateSeed = { ...input.privateSeed, ...replacement }
    expect(
      reason(() =>
        normalizePrivateSeedForIdentity(
          input,
          '0x1111111111111111111111111111111111111111'
        )
      )
    ).toBe('INVALID_PRIVATE_SEED')
  })
})
