import { PathWithCacheStatus } from '@opensky/shared/cache'
import { useMemo } from 'react'

import { useGameAssetCachePaths } from '~/shared/queries/useGameAssetCachePaths'

export const getGameCacheTotals = (gameAssetCachePaths: PathWithCacheStatus[]) => {
  let cached = 0
  let toCache = 0
  let numHashNotFound = 0

  gameAssetCachePaths.forEach((path) => {
    if (path.size === 0) {
      numHashNotFound++
    } else {
      if (path.isCached) {
        cached += path.size
      } else {
        toCache += path.size
      }
    }
  })

  const cachedPercent = Math.round((cached / (toCache + cached)) * 1000) / 10

  return {
    cached,
    toCache,
    numHashNotFound,
    cachedPercent
  }
}

export const useGameCacheTotals = () => {
  const { data: gameAssetCachePaths } = useGameAssetCachePaths()

  return useMemo<
    | undefined
    | {
        cached: number
        toCache: number
        numHashNotFound: number
        cachedPercent: number
      }
  >(() => {
    if (!gameAssetCachePaths) return

    return getGameCacheTotals(gameAssetCachePaths)
  }, [gameAssetCachePaths])
}
