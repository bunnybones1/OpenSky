import { useMemo } from 'react'

import { AccountStat, GameMode } from '~/lib/proto'
import { DefaultAccountStats } from '~/shared/constants/accounts'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useAccountStats } from '~/shared/queries/useAccountStats'

export const useSeasonStats = (season?: number) => {
  const { data: account } = useActiveAccount()
  const { data: stats } = useAccountStats(account?.address)

  return useMemo(() => {
    let constructedStat: AccountStat | undefined = undefined
    let discoveryStat: AccountStat | undefined = undefined

    if (!account) return { constructedStat, discoveryStat }

    if (!season) {
      discoveryStat = account.stats?.rankedDiscovery
      constructedStat = account.stats?.rankedConstructed
    } else {
      const discoveryStats = !!stats?.discoveryStats
        ? stats.discoveryStats.filter((a) => a.season && a.season == season)
        : []

      const constructedStats = !!stats?.constructedStats
        ? stats.constructedStats.filter((a) => a.season && a.season == season)
        : []

      if (discoveryStats.length > 0) {
        discoveryStat = discoveryStats[0]
      } else {
        discoveryStat = DefaultAccountStats(
          account.address,
          GameMode.RANKED_DISCOVERY,
          season
        )
      }

      if (constructedStats.length > 0) {
        constructedStat = constructedStats[0]
      } else {
        constructedStat = DefaultAccountStats(
          account.address,
          GameMode.RANKED_CONSTRUCTED,
          season
        )
      }
    }

    return {
      discoveryStat,
      constructedStat
    }
  }, [account, season, stats])
}
