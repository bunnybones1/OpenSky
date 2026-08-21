import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { deriveGamePrincipal, isGamePrincipal } from '../src/identity'
import {
  errorMessage,
  MAX_CLIENT_MESSAGE_BYTES,
  parseClientCommand,
  ProtocolError
} from '../src/protocol'

const findMatch = {
  type: 'find_match',
  privateSeed: { prisms: ['str'] },
  sessionID: 'abc',
  mode: GameMode.RANKED_CONSTRUCTED,
  versionHash: 'ABCDEF',
  playerSessionID: 'FCEA164C-7449-449C-9718-27B98BD18C64'
}

describe('matchmaker protocol boundary', () => {
  it('aliases the source error message to its reason', () => {
    expect(errorMessage('RANK_TOO_LOW')).toEqual({
      type: 'error',
      reason: 'RANK_TOO_LOW',
      message: 'RANK_TOO_LOW',
      level: 'server'
    })
  })

  it('normalizes the source wire command', () => {
    expect(parseClientCommand(JSON.stringify(findMatch))).toMatchObject({
      sessionID: 'ABC',
      versionHash: 'abcdef',
      playerSessionID: 'fcea164c-7449-449c-9718-27b98bd18c64'
    })
  })

  it.each([
    'fcea164c7449449c971827b98bd18c64',
    '{fcea164c-7449-449c-9718-27b98bd18c64}',
    'URN:UUID:fcea164c-7449-449c-9718-27b98bd18c64'
  ])(
    'normalizes the UUID forms accepted by the Go decoder: %s',
    playerSessionID => {
      expect(
        parseClientCommand(JSON.stringify({ ...findMatch, playerSessionID }))
      ).toMatchObject({
        playerSessionID: 'fcea164c-7449-449c-9718-27b98bd18c64'
      })
    }
  )

  it.each([
    'session-1',
    'fcea164c-7449-449c-9718-27b98bd18c6z',
    'fcea164c7449-449c-9718-27b98bd18c64'
  ])(
    'rejects a player session the Go UUID decoder rejects: %s',
    playerSessionID => {
      expect(() =>
        parseClientCommand(JSON.stringify({ ...findMatch, playerSessionID }))
      ).toThrow('playerSessionID must be a UUID')
    }
  )

  it('accepts the original browser heartbeat without inventing a response type', () => {
    expect(parseClientCommand('PING')).toEqual({ type: 'ping' })
  })

  it('accepts source-compatible binary JSON payloads', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(findMatch))
    expect(parseClientCommand(bytes.buffer as ArrayBuffer)).toMatchObject({
      type: 'find_match',
      sessionID: 'ABC',
      versionHash: 'abcdef'
    })
  })

  it('pins the source 32 KiB message boundary', () => {
    expect(MAX_CLIENT_MESSAGE_BYTES).toBe(32 * 1024)
    const encoded = JSON.stringify(findMatch)
    const atLimit = encoded.padEnd(MAX_CLIENT_MESSAGE_BYTES, ' ')
    expect(parseClientCommand(atLimit)).toMatchObject({ type: 'find_match' })
    expect(() => parseClientCommand(`${atLimit} `)).toThrow(
      'message is too large'
    )
  })

  it('rejects unsupported modes and structurally invalid input', () => {
    expect(() =>
      parseClientCommand(
        JSON.stringify({ ...findMatch, mode: GameMode.TUTORIAL })
      )
    ).toThrow(ProtocolError)
    expect(() => parseClientCommand(new ArrayBuffer(4))).toThrow(ProtocolError)
  })

  it('derives deterministic, domain-separated 20-byte game principals', async () => {
    const first = await deriveGamePrincipal('identity-user-123')
    const second = await deriveGamePrincipal('identity-user-123')
    expect(first).toBe(second)
    expect(isGamePrincipal(first)).toBe(true)
    expect(first).not.toBe(await deriveGamePrincipal('identity-user-124'))
  })
})
