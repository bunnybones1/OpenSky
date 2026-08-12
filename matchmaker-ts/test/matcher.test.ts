import { GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  combinePlayers,
  createBotForPlayer,
  createBotPlayer,
  createPlayer,
  MatchProposalStatus,
  processCombinations
} from '../src'

const now = 1_000_000

describe('Go player combinator and proposal compatibility', () => {
  it('copies the source release and queue timestamp into replacement bots', () => {
    const player = createPlayer({
      address: '0x01',
      mode: GameMode.PRACTICE_BOT,
      clientVersionHash: 'release-1',
      initTimestampMs: now - 25_000
    })
    expect(createBotForPlayer(player)).toMatchObject({
      mode: GameMode.PRACTICE_BOT,
      clientVersionHash: 'release-1',
      initTimestampMs: now - 25_000
    })
  })

  it('requires two players and skips duplicate addresses', () => {
    const player = createPlayer({ address: '0x01' })
    expect(() => combinePlayers([player], () => true, [], () => now)).toThrow(
      'expecting at least 2 players'
    )
    expect(
      combinePlayers([player, player], () => true, [() => true], () => now).players()
    ).toEqual([])
  })

  it('prioritizes wait time and retains only pairs that pass every validator', () => {
    const oldest = createPlayer({ address: '0x01', initTimestampMs: now - 20_000 })
    const middle = createPlayer({ address: '0x02', initTimestampMs: now - 10_000 })
    const newest = createPlayer({ address: '0x03', initTimestampMs: now - 1_000 })
    const combinations = combinePlayers(
      [newest, oldest, middle],
      () => true,
      [(left, right) => !(left === oldest && right === newest)],
      () => now
    )
    expect(combinations.players().map((player) => player.address)).toEqual([
      oldest.address,
      middle.address,
      newest.address
    ])
    expect(combinations.candidates(oldest).map((player) => player.address)).toEqual([
      middle.address
    ])
  })

  it('forms proposals oldest-first and chooses the lowest-quality candidate', () => {
    const oldest = createPlayer({ address: '0x01', initTimestampMs: now - 20_000 })
    const worse = createPlayer({ address: '0x02', initTimestampMs: now - 10_000 })
    const best = createPlayer({ address: '0x03', initTimestampMs: now - 1_000 })
    const combinations = combinePlayers(
      [best, worse, oldest],
      () => true,
      [() => true],
      () => now
    )
    const proposals = processCombinations(
      combinations,
      { createRegistered: () => createBotPlayer(GameMode.RANKED_CONSTRUCTED) },
      () => 'proposal-1',
      (_player, candidates) => candidates.sort((left) => (left === best ? -1 : 1))
    )
    expect(proposals).toHaveLength(1)
    expect(proposals[0].addresses).toEqual([oldest.address, best.address])
    expect(proposals[0].status).toBe(MatchProposalStatus.FOUND)
    proposals[0].accept(oldest)
    expect(proposals[0].haveAllAccepted()).toBe(false)
    proposals[0].accept(best)
    expect(proposals[0].haveAllAccepted()).toBe(true)
    expect(proposals[0].opponent(oldest)).toBe(best)
    proposals[0].setAccepted()
    expect(proposals[0].isAccepted()).toBe(true)
    proposals[0].setToBeMade()
    expect(proposals[0].isToBeMade()).toBe(true)
    expect(proposals[0].playersCount()).toBe(2)
  })

  it('uses the bot-only validator and replaces a catch-all bot', () => {
    const player = createPlayer({ address: '0x01' })
    const catchAllBot = createBotPlayer(GameMode.RANKED_CONSTRUCTED)
    const registeredBot = createPlayer({ address: '0xbot' })
    const combinations = combinePlayers(
      [player, catchAllBot],
      () => true,
      [() => false],
      () => now
    )
    const proposals = processCombinations(
      combinations,
      { createRegistered: () => registeredBot },
      () => 'proposal-bot'
    )
    expect(proposals[0].players).toEqual([player, registeredBot])
  })
})
