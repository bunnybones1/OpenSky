import { useMemo } from 'react'

import { Account, GameMode, PlayerRank } from '~/lib/proto'
import { RANKS } from '~/shared/constants/accounts'

interface HighestRank {
  mode: GameMode | undefined
  rank: PlayerRank | undefined
}

const computeHighestRank = (account?: Account | null) => {
  if (!account) return undefined
  const discoveryRank = account.stats?.rankedDiscovery
    ? account.stats?.rankedDiscovery.playerRank
    : undefined
  const constructedRank = account.stats?.rankedConstructed
    ? account.stats?.rankedConstructed.playerRank
    : undefined

  if (!discoveryRank && !constructedRank) return { mode: undefined, rank: undefined }

  const discoveryIndex = discoveryRank ? RANKS.indexOf(discoveryRank) : -1
  const constructedIndex = constructedRank ? RANKS.indexOf(constructedRank) : -1

  if (discoveryIndex > constructedIndex)
    return { mode: GameMode.RANKED_DISCOVERY, rank: discoveryRank }
  return { mode: GameMode.RANKED_CONSTRUCTED, rank: constructedRank }
}

export const useAccountsHighestRank = (account?: Account | null) => {
  return useMemo<HighestRank | undefined>(
    () => computeHighestRank(account),
    [account]
  )
}

export const getAccountsHighestRank = (account?: Account | null) =>
  computeHighestRank(account)
