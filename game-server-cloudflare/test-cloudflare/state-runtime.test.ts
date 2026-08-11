import { env } from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'

import { GameServerEnv } from '../src/game-match'
import { AuthoritativeMatchRuntime } from '../src/state-runtime'
import { createMatchFixture } from './fixture'

const runtimes: AuthoritativeMatchRuntime[] = []

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.free()
})

describe('Cloudflare authoritative state runtime', () => {
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

    expect(stage('inspect initial state', () => runtime.stateInfo())).toMatchObject({
      hasState: false,
      pendingPlayer: 0
    })
    const emitted = stage('dispatch commit-reveal timeout', () =>
      runtime.dispatchTimeout()
    )
    expect(emitted).toHaveLength(1)
    expect(stage('inspect advanced state', () => runtime.stateInfo())).toMatchObject({
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
})

const stage = <T>(name: string, action: () => T): T => {
  try {
    return action()
  } catch (error) {
    throw new Error(`${name}: ${String(error)}`)
  }
}
