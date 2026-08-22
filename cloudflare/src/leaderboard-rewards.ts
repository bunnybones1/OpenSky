const REWARDED_RANKS = 500
const SILVER_REWARDED_RANKS = 100
const SILVER_REWARD_BASE = 1.7
const SILVER_REWARD_NUMERATOR = 120
const SILVER_REWARD_DENOMINATOR = 26

export interface LeaderboardRewards {
  silverCards: number
  conquestTickets: number
}

/**
 * Project the rewards displayed beside a ranked leaderboard entry.
 *
 * This is a direct port of api/lib/rewards/rewards.go. It does not grant the
 * rewards; the weekly distribution worker remains a separate rollout gate.
 */
export const leaderboardRewardsForRank = (
  rank: number
): LeaderboardRewards => {
  if (!Number.isSafeInteger(rank) || rank < 1 || rank > REWARDED_RANKS) {
    return { silverCards: 0, conquestTickets: 0 }
  }

  const silverCards =
    rank <= SILVER_REWARDED_RANKS
      ? Math.floor(
          Math.pow(
            SILVER_REWARD_BASE,
            SILVER_REWARD_NUMERATOR / (rank + SILVER_REWARD_DENOMINATOR)
          )
        )
      : 0
  const conquestTickets = rank <= 100 ? 2 : rank <= 250 ? 1 : 0

  return { silverCards, conquestTickets }
}
