import type { AccountStat } from '@opensky/proto'

type SourceAccountStatInput = Omit<AccountStat, 'createdAt'> & {
  createdAt?: string
}

// Go's encoding/json emits the six non-omitempty AccountStat pointers even
// when nil. The internal rank state is the sole public-tagged omitempty field:
// public RPCs omit it, while the internal match profile may opt into it.
export const sourceAccountStatWire = (
  stat: SourceAccountStatInput
): AccountStat =>
  ({
    gameMode: stat.gameMode,
    winCount: stat.winCount,
    lossCount: stat.lossCount,
    tieCount: stat.tieCount,
    forfeitCount: stat.forfeitCount,
    abandonCount: stat.abandonCount,
    winRatio: stat.winRatio,
    gamesPlayed: stat.gamesPlayed,
    experience: stat.experience ?? null,
    score: stat.score ?? null,
    createdAt: stat.createdAt ?? null,
    rank: stat.rank ?? null,
    rankProgress: stat.rankProgress ?? null,
    playerRank: stat.playerRank,
    playerRankStage: stat.playerRankStage,
    ...(stat.playerRankState !== undefined
      ? { playerRankState: stat.playerRankState }
      : {}),
    winStreak: stat.winStreak,
    lossStreak: stat.lossStreak,
    season: stat.season ?? null
  }) as unknown as AccountStat
