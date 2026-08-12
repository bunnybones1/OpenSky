import { describe, expect, it } from 'vitest'

import { leaderboardRewardsForRank } from '../src/leaderboard-rewards'

describe('leaderboard reward projections', () => {
  it('matches the source rank boundaries', () => {
    expect(leaderboardRewardsForRank(1)).toEqual({
      silverCards: 10,
      conquestTickets: 2
    })
    expect(leaderboardRewardsForRank(100)).toEqual({
      silverCards: 1,
      conquestTickets: 2
    })
    expect(leaderboardRewardsForRank(101)).toEqual({
      silverCards: 0,
      conquestTickets: 1
    })
    expect(leaderboardRewardsForRank(250)).toEqual({
      silverCards: 0,
      conquestTickets: 1
    })
    expect(leaderboardRewardsForRank(251)).toEqual({
      silverCards: 0,
      conquestTickets: 0
    })
    expect(leaderboardRewardsForRank(500)).toEqual({
      silverCards: 0,
      conquestTickets: 0
    })
    expect(leaderboardRewardsForRank(501)).toEqual({
      silverCards: 0,
      conquestTickets: 0
    })
  })

  it('matches the source totals for each leaderboard', () => {
    const totals = Array.from({ length: 500 }, (_, index) =>
      leaderboardRewardsForRank(index + 1)
    ).reduce(
      (sum, rewards) => ({
        silverCards: sum.silverCards + rewards.silverCards,
        conquestTickets: sum.conquestTickets + rewards.conquestTickets
      }),
      { silverCards: 0, conquestTickets: 0 }
    )

    expect(totals).toEqual({ silverCards: 250, conquestTickets: 350 })
  })

  it('does not project rewards for invalid ranks', () => {
    for (const rank of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(leaderboardRewardsForRank(rank)).toEqual({
        silverCards: 0,
        conquestTickets: 0
      })
    }
  })
})
