import type {
  Account,
  AccountStat,
  DeckClass,
  DeckRank,
  DeckRankAccount,
  LeaderboardEntry
} from '@opensky/proto'

import { sourceAccountStatWire } from './account-stat-wire'
import { sourceAccountWire } from './account-wire'
import { goFloat32 } from './go-numbers'

export type SourceDeckRankInput = Omit<
  DeckRank,
  'cardIds' | 'score' | 'winRatio' | 'gamesPlayed'
> & {
  cardIds?: number[] | null
  score?: number | null
  winRatio?: number
  gamesPlayed?: number
}

export interface SourceDeckRankAccountInput {
  deckRank?: SourceDeckRankInput | null
  highestPlayer?: Account | null
}

export interface SourceLeaderboardEntryInput {
  account?: Account | null
  accountStat?: AccountStat | null
  rank?: number
  rankedSilverReward?: number
  rankedTicketReward?: number
}

// RIDL models pointers as optional properties for TypeScript callers, while
// Go's encoding/json emits every public DeckRank field. Float columns are
// scanned into float32 in the source repository before they reach the wire.
export const sourceDeckRankWire = (value: SourceDeckRankInput): DeckRank =>
  ({
    deckString: value.deckString ?? '',
    class: value.class ?? ('UNKNOWN_CLASS' as DeckClass),
    cardIds: value.cardIds ?? null,
    winCount: value.winCount ?? 0,
    lossCount: value.lossCount ?? 0,
    forfeitCount: value.forfeitCount ?? 0,
    abandonCount: value.abandonCount ?? 0,
    tieCount: value.tieCount ?? 0,
    winRatio: goFloat32(value.winRatio ?? 0),
    gamesPlayed: goFloat32(value.gamesPlayed ?? 0),
    score: value.score ?? null,
    highestPlayerID: value.highestPlayerID ?? '0',
    highestPlayerAddress: value.highestPlayerAddress ?? ''
  }) as unknown as DeckRank

export const sourceDeckRankAccountWire = (
  value: SourceDeckRankAccountInput
): DeckRankAccount =>
  ({
    deckRank: value.deckRank ? sourceDeckRankWire(value.deckRank) : null,
    highestPlayer: value.highestPlayer
      ? sourceAccountWire(value.highestPlayer)
      : null
  }) as unknown as DeckRankAccount

export const sourceDeckRankListWire = (
  values: SourceDeckRankInput[]
): DeckRank[] => values.map(sourceDeckRankWire)

export const sourceDeckRankAccountListWire = (
  values: SourceDeckRankAccountInput[]
): DeckRankAccount[] => values.map(sourceDeckRankAccountWire)

export const sourceLeaderboardEntryWire = (
  value: SourceLeaderboardEntryInput
): LeaderboardEntry =>
  ({
    account: value.account ? sourceAccountWire(value.account) : null,
    accountStat: value.accountStat
      ? sourceAccountStatWire(value.accountStat)
      : null,
    rank: value.rank ?? 0,
    rankedSilverReward: value.rankedSilverReward ?? 0,
    rankedTicketReward: value.rankedTicketReward ?? 0
  }) as unknown as LeaderboardEntry

export const sourceLeaderboardEntryListWire = (
  values: SourceLeaderboardEntryInput[]
): LeaderboardEntry[] => values.map(sourceLeaderboardEntryWire)
