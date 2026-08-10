import { PathWithCacheStatus } from '@opensky/shared/cache'
import { CacheNames } from '@opensky/shared/cacheFilters'
import { supportsAssetCacheProxy } from '@opensky/shared/check-asset-cache-proxy-support'
import { isAndroidNativeApp } from '@opensky/shared/check-mobile-app-type'
import { getMobileMessenger } from '@opensky/shared/native'
import { getLocalWebServer } from '@opensky/shared/opensky-webserver/index'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import chunk from 'lodash-es/chunk'
import { useCallback, useEffect, useRef } from 'react'
import { useUnmount } from 'react-use'

import { getGameAssetCache } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { useGameAssetCachePaths } from '~/shared/queries/useGameAssetCachePaths'

import { uiState, updateUIState } from '../state/ui/ui-state'

/**
 *
 * Fetches a single game asset, and updates its cache status.
 */
const usePrefetchGameAsset = () => {
  const queryClient = useQueryClient()
  return useMutation(
    async (url: string) => {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('not_fetched')
      }
    },
    {
      onSettled: (_, error, url) => {
        if (!error) {
          queryClient.setQueryData<PathWithCacheStatus[] | undefined>(
            getGameAssetCache('game'),
            (data) => {
              if (!data) return

              return data.map((pathWithCacheInfo) => {
                if (pathWithCacheInfo.url === url) {
                  return {
                    ...pathWithCacheInfo,
                    isCached: true
                  }
                }
                return pathWithCacheInfo
              })
            }
          )
        }
      }
    }
  )
}

/**
 *
 * Fetches all un-cached game assets
 */
export const usePrefetchGameAssets = () => {
  const { data: gameAssetCachePaths, refetch: refetchGameAssetPaths } =
    useGameAssetCachePaths()
  const prefetchGameAsset = usePrefetchGameAsset()

  const pathsToFetchRef = useRef<PathWithCacheStatus[][] | undefined>()
  const timerRef = useRef<number | null>(null)

  useUnmount(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
  })

  useEffect(() => {
    if (gameAssetCachePaths) {
      // Browser can only handle 6 requests at a time.
      pathsToFetchRef.current = chunk(
        gameAssetCachePaths.filter((path) => !path.isCached),
        6
      )
    }
  }, [gameAssetCachePaths])

  const cancelGameAssetCache = useCallback(() => {
    updateUIState('isCacheDownloadInProgress', false)
  }, [])

  const cacheGameAssets = useCallback(
    async (onDone?: () => void) => {
      try {
        if (!!pathsToFetchRef.current && !!pathsToFetchRef.current.length) {
          const cachePaths = pathsToFetchRef.current
          updateUIState('isCacheDownloadInProgress', true)
          for (const pathChunk of cachePaths) {
            const isDownloadInProgress = uiState.isCacheDownloadInProgress
            if (isDownloadInProgress) {
              await Promise.all(
                pathChunk.map((path) => prefetchGameAsset.mutateAsync(path.url))
              )
            }
          }
          if (onDone) {
            onDone()
          }
          if (isAndroidNativeApp()) {
            getMobileMessenger().postMessage({ action: 'requestDeviceStorageInfo' })
          }
          updateUIState('isCacheDownloadInProgress', false)
        }
      } catch (error) {
        updateUIState('isCacheDownloadInProgress', false)
        captureError(error, 'Error fetching game assets.')
      }
    },
    [prefetchGameAsset]
  )

  const deleteCachedGameAssets = useCallback(async () => {
    try {
      if (supportsAssetCacheProxy()) {
        const cacheFileHashes = await getLocalWebServer().getCachedFileHashes()

        const invalidateSuccess =
          await getLocalWebServer().invalidateCachedFilesByHash({
            sha256Hashes: cacheFileHashes.sha256Hashes
          })

        if (invalidateSuccess) await getLocalWebServer().purgeInvalidCachedFiles()
      }
      const gameCache = await window.caches.open(CacheNames.GAME_RESOURCES)

      const keys = await gameCache.keys()

      await Promise.all(keys.map((key) => gameCache.delete(key)))

      refetchGameAssetPaths()
    } catch (error) {
      captureError(error, 'Error deleting game asset cache.')
    }
  }, [refetchGameAssetPaths])

  return {
    deleteCachedGameAssets,
    cacheGameAssets,
    cancelGameAssetCache
  }
}
