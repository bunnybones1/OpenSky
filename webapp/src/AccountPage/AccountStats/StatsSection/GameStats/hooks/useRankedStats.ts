import { useMemo } from 'react'

import { Account } from '~/lib/proto'
import { useAccountStats } from '~/shared/queries/useAccountStats'

export const useRankedStats = (account?: Account | null) => {
  const { data: stats } = useAccountStats(account?.address)
  stats?.constructedStats

  return useMemo(() => {
    const wins = stats
      ? [...stats.constructedStats, ...stats.discoveryStats].reduce(
          (total, stat) => total + stat.winCount,
          0
        )
      : 0
    const losses = stats
      ? [...stats.constructedStats, ...stats.discoveryStats].reduce(
          (total, stat) => total + stat.lossCount,
          0
        )
      : 0
    const gamesPlayed = stats
      ? [...stats.constructedStats, ...stats.discoveryStats].reduce(
          (total, stat) => total + stat.gamesPlayed,
          0
        )
      : 0

    const accountSince = (account ? new Date(account.createdAt) : new Date())
      .toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      .toUpperCase()

    const globalStats = {
      wins,
      losses,
      gamesPlayed,
      winRate:
        wins + losses === 0 ? '0%' : `${Math.round((wins / (wins + losses)) * 100)}%`,
      accountSince
    }

    return globalStats
  }, [account, stats])
}
