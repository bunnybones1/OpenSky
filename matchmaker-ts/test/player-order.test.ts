import { describe, expect, it } from 'vitest'

import { orderParticipantsForGame } from '../src/player-order'

const first = { player: { address: '0x1111111111111111111111111111111111111111' } }
const second = { player: { address: '0x2222222222222222222222222222222222222222' } }

describe('source-compatible game player ordering', () => {
  it('is stable across retry and incoming queue order', async () => {
    const forward = await orderParticipantsForGame('proposal-stable', [
      first,
      second
    ])
    const retry = await orderParticipantsForGame('proposal-stable', [
      first,
      second
    ])
    const reversedInput = await orderParticipantsForGame('proposal-stable', [
      second,
      first
    ])
    expect(retry).toEqual(forward)
    expect(reversedInput).toEqual(forward)
  })

  it('assigns both possible player sides across random proposal IDs', async () => {
    const playerOnFirstSide = new Set<string>()
    for (let index = 0; index < 32; index += 1) {
      const ordered = await orderParticipantsForGame(`proposal-${index}`, [
        first,
        second
      ])
      playerOnFirstSide.add(ordered[0].player.address)
    }
    expect(playerOnFirstSide).toEqual(
      new Set([first.player.address, second.player.address])
    )
  })
})
