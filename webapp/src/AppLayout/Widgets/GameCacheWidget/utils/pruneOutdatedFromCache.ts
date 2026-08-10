import AssetHashManifest from '@opensky/shared/AssetHashManifest'
import { CacheNames } from '@opensky/shared/cacheFilters'
import { delayPromise } from '@opensky/shared/utils/async'

import env from '~/env'
import { getAssetManifest } from '~/shared/queries/useAssetManifest'

const getManifestUrlSegment = (url: string) => {
  const segments = url.split('/')

  const assetRepoSegmentIndex = segments.findIndex((segment) =>
    segment.includes('assets.opensky')
  )

  if (assetRepoSegmentIndex === -1) return

  return segments
    .filter((_, i) => {
      return i > assetRepoSegmentIndex + 1
    })
    .join('/')
}

const pruneAssets = async (cacheName: CacheNames, manifest: AssetHashManifest) => {
  try {
    if (!window.caches) {
      return
    }
    if (!(await window.caches.has(cacheName))) {
      console.error(`No cache named ${cacheName}`)
      return
    }
    const cache = await window.caches.open(cacheName)

    const keys = await cache.keys()

    let numPruned = 0

    for (const key of keys) {
      let shouldPrune = false
      let pruneReason = ''
      const assetManifestCheckString = getManifestUrlSegment(key.url)
      if (!assetManifestCheckString) {
        shouldPrune = true
        pruneReason = 'Not a OpenSky file.'
      } else {
        const fullManifestUrl = manifest.getFullUrl(assetManifestCheckString)

        if (!fullManifestUrl || fullManifestUrl.includes('hash-not-found')) {
          pruneReason = 'Unable to find file in manifest.'
        } else if (!!fullManifestUrl && fullManifestUrl !== key.url) {
          pruneReason = 'File has a newer version in manifest.'
        }

        shouldPrune =
          !fullManifestUrl ||
          fullManifestUrl.includes('hash-not-found') ||
          fullManifestUrl !== key.url
      }
      if (shouldPrune) {
        console.warn(`FOUND CACHED RESOURCE (${cacheName}) TO PRUNE: ${pruneReason}`)
        try {
          await cache.delete(key)
          numPruned += 1
        } catch (error2) {
          console.error(`Error deleting ${key}`, error2)
        }
      }
    }
    console.warn(`Found ${numPruned} ${cacheName} assets to prune.`)
  } catch (error) {
    console.error(`Error pruning ${cacheName} assets`, error)
  }
}

const checkIfOldCachesExist = async () => {
  const cachesNames = ['@opensky/v1/game', '@opensky/v1/webapp']

  if (!window.caches) {
    return
  }

  await Promise.all(
    cachesNames.map(async (cacheName) => {
      const hasCache = await window.caches.has(cacheName)
      if (hasCache) {
        console.warn('Found old cache key, deleting: ', cacheName)
        window.caches.delete(cacheName)
      }
    })
  )
}

const pruneAssetManifests = async (cacheName: CacheNames) => {
  try {
    if (!window.caches) {
      return
    }
    if (!(await window.caches.has(cacheName))) {
      console.error(`No cache named ${cacheName}`)
      return
    }

    const cache = await window.caches.open(cacheName)

    const keys = await cache.keys()

    let numPruned = 0

    const validAssetManifests = [
      env.ASSETS_MANIFEST_GAME_HASH,
      env.ASSETS_MANIFEST_WEBAPP_HASH
    ]

    for (const key of keys) {
      let isCurrentManifest = false
      for (const hash of validAssetManifests) {
        if (key.url.includes(hash)) {
          isCurrentManifest = true
          break
        }
      }
      if (!isCurrentManifest) {
        try {
          await cache.delete(key)
          numPruned += 1
        } catch (error2) {
          console.error(`Error deleting ${key}`, error2)
        }
      }
    }
    console.warn(`Found ${numPruned} asset manifests to prune.`)
  } catch (error) {
    console.error(`Error pruning asset manifests`, error)
  }
}

export const pruneOutdatedFromCache = async () => {
  await delayPromise(5000) //do not prune right away, let the app load
  const [gameManifest, webappManifest] = await Promise.all([
    getAssetManifest('game'),
    getAssetManifest('webapp')
  ])

  await checkIfOldCachesExist()
  await pruneAssets(CacheNames.GAME_RESOURCES, gameManifest)
  await pruneAssets(CacheNames.WEBAPP_IMAGES, webappManifest)
  await pruneAssetManifests(CacheNames.ASSET_MANIFESTS)
}
