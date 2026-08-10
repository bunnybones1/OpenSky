import { getCacheStatuses, PathWithCacheStatus } from '@opensky/shared/cache'
import { getAssetPaths } from '@opensky/shared/naiveGameAssets'
import { useQuery } from '@tanstack/react-query'

import {
  getGameAssetCache,
  getGameAssetCacheError
} from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { getAssetManifest } from '~/shared/queries/useAssetManifest'

export const useGameAssetCachePaths = () => {
  return useQuery<PathWithCacheStatus[] | undefined>(
    getGameAssetCache('game'),
    async () => {
      const manifest = await getAssetManifest('game')

      const paths = getAssetPaths('current_device')

      const cacheCheck = getCacheStatuses(paths, manifest)
      return await cacheCheck.data
    },
    {
      staleTime: ONE_DAY
    }
  )
}

export const useGameAssetCacheError = () => {
  return useQuery<string>(
    getGameAssetCacheError('game'),
    async () => {
      const manifest = await getAssetManifest('game')

      const paths = getAssetPaths('current_device')

      const cacheCheck = getCacheStatuses(paths, manifest)
      await cacheCheck.data
      return cacheCheck.error
    },
    {
      staleTime: ONE_DAY
    }
  )
}
