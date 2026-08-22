import { describe, expect, it } from 'vitest'

import { runStateRuntimeProbe } from '../src/multiplayer/state-runtime'

describe('authoritative game-state Workers runtime', () => {
  it('executes and restores the existing game WASM deterministically', () => {
    const first = runStateRuntimeProbe()
    const second = runStateRuntimeProbe()

    expect(first.version).toMatch(/^0x[0-9a-f]{64}$/)
    expect(first.serialized.byteLength).toBeGreaterThan(100)
    expect(first.restored).toEqual(first.serialized)
    expect(second.serialized).toEqual(first.serialized)
  })
})
