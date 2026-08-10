import { useCallback } from 'react'

import { useGameAssetCachePaths } from '../queries/useGameAssetCachePaths'
import { useAuthedAccount } from './useAuthedAccount'
import { getGameCacheTotals } from './useGameCacheTotals'

export const useGetHasEnoughCachedAssets = () => {
  const { data: gamePaths } = useGameAssetCachePaths()
  const { data: authedAccount } = useAuthedAccount()

  return useCallback(() => {
    // We dont want to show the asset download warning until the user has been
    // onboarded.
    if (!authedAccount || authedAccount.level <= 5) return true

    if (!gamePaths) return false

    const cacheInfo = getGameCacheTotals(gamePaths)

    return cacheInfo.toCache < 5_000_000
  }, [gamePaths, authedAccount])
}
