import AssetHashManifest from './AssetHashManifest'
import { supportsAssetCacheProxy } from './check-asset-cache-proxy-support'
import { CacheNames, MATCH_OPTIONS } from './cacheFilters'
import { getLocalWebServer } from './opensky-webserver'
import { sha256 } from 'hash.js'

export interface CacheInfo {
  method: 'webCache' | 'androidNative' | 'iOSNative' | 'desktopNative'
  cacheSizesBreakdown: { [key: string]: number }
  cacheLimit?: number
}

let currentRequest: Promise<CacheInfo> | undefined

export async function getExhaustiveAndExpensiveCacheStorageInfo() {
  if (!currentRequest) {
    currentRequest = getCacheInfoInternal()
  }
  const result = await currentRequest!
  currentRequest = undefined
  return result
}

async function getCacheInfoInternal(): Promise<CacheInfo> {
  if (window.caches) {
    let cacheLimit: number | undefined

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate()
      cacheLimit = quota
    }

    const cacheNames = await window.caches.keys()

    const cacheSizesBreakdown: CacheInfo['cacheSizesBreakdown'] = {}

    await Promise.all(
      cacheNames.map(async cacheName => {
        const cache = await window.caches.open(cacheName)
        const keys = await cache.keys()
        let cacheSize = 0

        await Promise.all(
          keys.map(async key => {
            const response = await cache.match(key, MATCH_OPTIONS)

            if (response) {
              const blob = await response.clone().blob()
              cacheSize += blob.size
            }
          })
        )
        cacheSizesBreakdown[cacheName] = cacheSize
      })
    )

    return {
      method: 'webCache',
      cacheSizesBreakdown,
      cacheLimit
    }
  } else {
    throw new Error('This browser has not implemented cache storage.')
  }
}

export interface PathWithCacheStatus {
  url: string
  basePath: string
  isCached: boolean
  size: number
}

export interface CacheMethod {
  method: 'proxy' | 'browser'
}

class CacheProgress {
  totalFiles = 0
  totalBytes = 0
}

class CacheCheck {
  progress = {
    cached: new CacheProgress(),
    notCached: new CacheProgress()
  }
  data: Promise<PathWithCacheStatus[]>
  error = ''
}

let lastCacheCheck: CacheCheck | undefined

export function getCacheStatuses(
  paths: string[],
  manifest: AssetHashManifest
): CacheCheck {
  if (lastCacheCheck) {
    return lastCacheCheck
  }
  const cacheCheck = new CacheCheck()
  lastCacheCheck = cacheCheck
  setTimeout(() => {
    lastCacheCheck = undefined
  }, 30000)
  const prog = cacheCheck.progress
  const allData: PathWithCacheStatus[] = []
  function register(data: PathWithCacheStatus) {
    allData.push(data)
    const targetProgress = data.isCached ? prog.cached : prog.notCached
    targetProgress.totalBytes += data.size
    targetProgress.totalFiles++
  }
  if (supportsAssetCacheProxy()) {
    cacheCheck.data = new Promise<PathWithCacheStatus[]>(resolve => {
      async function doTheWork() {
        const cachedFiles = await getLocalWebServer().getCachedFileHashes()
        await Promise.all(
          paths.map(async basePath => {
            const url = manifest.getFullUrl(basePath)
            // TODO: find a cleaner way to get the full URL without the asset proxy prefix.
            const baseURL = url.replace(/[^_]+_proxy\//, '')
            const basePathHash = sha256().update(baseURL).digest('hex')
            const cacheStatus = cachedFiles.sha256Hashes.includes(basePathHash)

            const size = manifest.getFilesize(basePath)

            register({
              url,
              basePath,
              isCached: !!cacheStatus,
              size
            })
          })
        )
      }
      doTheWork().then(() => resolve(allData))
    })
    return cacheCheck
  } else {
    cacheCheck.data = new Promise(resolve => {
      async function doTheWork() {
        const cache = window.caches
          ? await window.caches.open(CacheNames.GAME_RESOURCES)
          : null
        await Promise.all(
          paths.map(async basePath => {
            const url = manifest.getFullUrl(basePath)
            const cacheStatus = !cache
              ? undefined
              : await cache.match(url, MATCH_OPTIONS)

            const size = manifest.getFilesize(basePath)

            register({
              url,
              basePath,
              isCached: !!cacheStatus,
              size
            })
          })
        )
      }
      doTheWork().then(() => resolve(allData))
    })
    return cacheCheck
  }
}

export function getCacheMethod(): CacheMethod {
  if (supportsAssetCacheProxy()) {
    return { method: 'proxy' }
  } else {
    return { method: 'browser' }
  }
}
