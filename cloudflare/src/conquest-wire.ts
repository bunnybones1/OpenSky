import type { Conquest } from '@opensky/proto'

// The generated TypeScript declarations model RIDL pointers as optional
// properties, but encoding/json emits every field because the Go struct does
// not use omitempty. Keep the runtime wire exact even when a pointer is nil.
export const sourceConquestWire = (conquest: Conquest): Conquest =>
  ({
    id: conquest.id,
    status: conquest.status,
    nonce: conquest.nonce,
    mode: conquest.mode,
    hero: conquest.hero,
    deckClass: conquest.deckClass ?? null,
    matchProgress: conquest.matchProgress,
    createdAt: conquest.createdAt ?? null,
    endedAt: conquest.endedAt ?? null
  }) as unknown as Conquest
