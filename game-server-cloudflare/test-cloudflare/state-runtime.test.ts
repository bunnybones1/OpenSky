import { env } from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'

import { GameServerEnv } from '../src/game-match'
import {
  AuthoritativeMatchRuntime,
  isCountedPlayerMove
} from '../src/state-runtime'
import { createMatchFixture } from './fixture'

const runtimes: AuthoritativeMatchRuntime[] = []

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.free()
})

describe('Cloudflare authoritative state runtime', () => {
  it('preserves the source per-player move definition', () => {
    expect(isCountedPlayerMove('Attack')).toBe(true)
    expect(isCountedPlayerMove('PlayCard')).toBe(true)
    expect(isCountedPlayerMove('EndTurn')).toBe(false)
    expect(isCountedPlayerMove('CommitCardSelection')).toBe(false)
    expect(isCountedPlayerMove('Timeout')).toBe(false)
  })

  it('advances commit-reveal and serializes the resulting state', () => {
    const runtimeEnv = env as unknown as GameServerEnv
    const { match } = createMatchFixture()
    const runtime = AuthoritativeMatchRuntime.create({
      matchId: match.matchID,
      season: match.matchSettings.season,
      player1Seed: match.player1.privateSeed,
      player2Seed: match.player2.privateSeed,
      heroRarities: ['base', 'base'],
      ownerPrivateKey: runtimeEnv.MATCH_OWNER_PRIVATE_KEY
    })
    runtimes.push(runtime)

    expect(
      stage('inspect initial state', () => runtime.stateInfo())
    ).toMatchObject({
      hasState: false,
      pendingPlayer: 0
    })
    const emitted = stage('dispatch commit-reveal timeout', () =>
      runtime.dispatchTimeout()
    )
    expect(emitted).toHaveLength(1)
    expect(
      stage('inspect advanced state', () => runtime.stateInfo())
    ).toMatchObject({
      hasState: false,
      pendingPlayer: 1
    })

    const snapshot = stage('serialize advanced state', () => runtime.snapshot())
    expect(snapshot.byteLength).toBeGreaterThan(0)
    const restored = AuthoritativeMatchRuntime.restore(
      snapshot,
      runtimeEnv.MATCH_OWNER_PRIVATE_KEY
    )
    runtimes.push(restored)
    expect(restored.stateInfo()).toMatchObject({
      hasState: false,
      pendingPlayer: 1
    })
  })

  it('exposes the engine-filled decks only after state materialization', () => {
    const runtimeEnv = env as unknown as GameServerEnv
    const { match } = createMatchFixture()
    const runtime = AuthoritativeMatchRuntime.create({
      matchId: match.matchID,
      season: match.matchSettings.season,
      player1Seed: match.player1.privateSeed,
      player2Seed: match.player2.privateSeed,
      heroRarities: ['base', 'base'],
      ownerPrivateKey: runtimeEnv.MATCH_OWNER_PRIVATE_KEY
    })
    runtimes.push(runtime)

    expect(match.player1.privateSeed.cards).toEqual([])
    expect(match.player2.privateSeed.cards).toEqual([])
    expect(runtime.authoritativeFilledDecks()).toBeUndefined()
    for (let attempt = 0; !runtime.stateInfo().hasState; attempt += 1) {
      if (attempt >= 6) throw new Error('runtime did not materialize state')
      runtime.dispatchTimeout()
    }

    const filled = runtime.authoritativeFilledDecks()!
    expect(filled.map(cards => cards.length)).toEqual([30, 30])
    expect(filled.map(cards => new Set(cards).size)).toEqual([30, 30])

    const restored = AuthoritativeMatchRuntime.restore(
      runtime.snapshot(),
      runtimeEnv.MATCH_OWNER_PRIVATE_KEY
    )
    runtimes.push(restored)
    expect(restored.authoritativeFilledDecks()).toEqual(filled)
  })
})

const stage = <T>(name: string, action: () => T): T => {
  try {
    return action()
  } catch (error) {
    throw new Error(`${name}: ${String(error)}`)
  }
}
