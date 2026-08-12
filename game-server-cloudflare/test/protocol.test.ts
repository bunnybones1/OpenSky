import { describe, expect, it } from 'vitest'

import { GameProtocolError, parseClientMessage } from '../src/protocol'

const joinMessage = (loadingProgress: unknown = 0.5) => ({
  type: 'join_server',
  authToken: 'legacy-token',
  loadingProgress,
  subkeyCertification: {
    player: Array(20).fill(1),
    subkey: Array(20).fill(2),
    signature: Array(65).fill(3)
  }
})

describe('game WebSocket protocol validation', () => {
  it('accepts source-compatible join and spectate messages', () => {
    expect(parseClientMessage(JSON.stringify(joinMessage()))).toMatchObject({
      type: 'join_server',
      loadingProgress: 0.5
    })
    expect(
      parseClientMessage(
        JSON.stringify({
          type: 'spectate_server',
          spectateToken: 'identity:player.private-code',
          authToken: null
        })
      )
    ).toEqual({
      type: 'spectate_server',
      spectateToken: 'identity:player.private-code',
      authToken: null
    })
  })

  it('rejects invalid join loading state before it reaches durable storage', () => {
    const missing = joinMessage()
    delete (missing as { loadingProgress?: unknown }).loadingProgress
    expect(() => parseClientMessage(JSON.stringify(missing))).toThrow(
      GameProtocolError
    )
    for (const progress of [null, Number.NaN, -0.1, 1.1]) {
      expect(() => parseClientMessage(JSON.stringify(joinMessage(progress)))).toThrow(
        GameProtocolError
      )
    }
  })

  it('accepts only non-empty, byte-aligned hexadecimal gameplay diffs', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'gameplay', data: ['0x00ff'] }))
    ).toEqual({ type: 'gameplay', data: ['0x00ff'] })
    for (const diff of ['0x', '0x0', '0xgg', '00ff']) {
      expect(() =>
        parseClientMessage(JSON.stringify({ type: 'gameplay', data: [diff] }))
      ).toThrow(GameProtocolError)
    }
  })

  it('requires emotes to use exactly one source union variant', () => {
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'emote', sticker: 5 })
      )
    ).toEqual({ type: 'emote', sticker: 5 })
    for (const message of [
      { type: 'emote' },
      { type: 'emote', emote: 'gg', sticker: 5 },
      { type: 'emote', chat: 'hello', emote: 'hello' },
      { type: 'emote', sticker: Number.MAX_SAFE_INTEGER + 1 }
    ]) {
      expect(() => parseClientMessage(JSON.stringify(message))).toThrow(
        'invalid emote'
      )
    }
  })

  it('rejects binary, malformed, and unsupported messages', () => {
    expect(() => parseClientMessage(new ArrayBuffer(1))).toThrow(
      'binary messages are not supported'
    )
    expect(() => parseClientMessage('{')).toThrow('message is not valid JSON')
    expect(() => parseClientMessage('{"type":"abandon_match"}')).toThrow(
      'unsupported message type'
    )
    expect(() => parseClientMessage('{"type":"spectate_server"}')).toThrow(
      'invalid spectate request'
    )
    for (const spectateToken of [
      '',
      `.code`,
      `player.${'a'.repeat(51)}`,
      'player.one.two.three'
    ]) {
      expect(() =>
        parseClientMessage(
          JSON.stringify({
            type: 'spectate_server',
            spectateToken,
            authToken: null
          })
        )
      ).toThrow(GameProtocolError)
    }
  })
})
