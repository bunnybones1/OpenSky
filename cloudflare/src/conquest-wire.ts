import type { Conquest, WeeklyGolds } from '@opensky/proto'

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

// WeeklyGolds has four required, non-pointer fields in the generated Go
// contract. Project it explicitly so D1/pool implementation metadata can never
// escape through the public Conquest reward catalog.
export const sourceWeeklyGoldsWire = (reward: WeeklyGolds): WeeklyGolds => ({
  startAt: reward.startAt,
  endAt: reward.endAt,
  tokenId: reward.tokenId,
  totalSupply: reward.totalSupply
})

export const sourceWeeklyGoldsListWire = (
  rewards: WeeklyGolds[]
): WeeklyGolds[] => rewards.map(sourceWeeklyGoldsWire)
