export enum CacheNames {
  ASSET_MANIFESTS = 'asset-manifests',
  GAME_RESOURCES = 'game-resources',
  WEBAPP_IMAGES = 'webapp-images',
  JS_FILES = 'js-files',
  CSS_FILES = 'css-files'
}

const isImageToCache = (path: string) => {
  return (
    path.endsWith('jpg') ||
    path.endsWith('jpeg') ||
    path.endsWith('png') ||
    path.endsWith('gif') ||
    path.endsWith('webp')
  )
}

const isOpenSkyAsset = (href: string) => {
  return href.includes('assets.opensky') || href.includes('localhost:4001')
}

export type CacheHrefMatch = (url: string) => boolean

export const cacheFilters = new Map<CacheNames, CacheHrefMatch>()

cacheFilters.set(
  CacheNames.WEBAPP_IMAGES,
  href =>
    href.includes('/webapp/') && isOpenSkyAsset(href) && (isImageToCache(href) || href.endsWith('css'))
)

cacheFilters.set(
  CacheNames.CSS_FILES,
  href => href.endsWith('css')
)

cacheFilters.set(
  CacheNames.GAME_RESOURCES,
  href => href.includes('/game/') && isOpenSkyAsset(href)
)

cacheFilters.set(CacheNames.ASSET_MANIFESTS, href => href.includes('.tree.'))

cacheFilters.set(
  CacheNames.JS_FILES,
  href =>
    href.endsWith('.js') &&
    (href.includes('main-') ||
      href.includes('state-') ||
      href.includes('vendors-') ||
      href.includes('bundle') ||
      href.includes('/assets/'))
)

const keys = Array.from(cacheFilters.keys())
export function findCacheNameForFile(href: string) {
  for (const key of keys) {
    if (cacheFilters.get(key)!(href)) {
      return key
    }
  }
  return undefined
}

export const MATCH_OPTIONS = { ignoreVary: true }
