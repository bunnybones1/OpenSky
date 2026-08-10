import {
  CacheNames,
  findCacheNameForFile,
  MATCH_OPTIONS
} from '../cacheFilters'

type CacheListener = (c: Cache | undefined) => void
const __caches: Map<CacheNames, Cache> = new Map()
const __cacheListeners: Map<CacheNames, Array<CacheListener>> = new Map()
const __cachePromises: Map<CacheNames, Promise<Cache>> = new Map()
function __initCache(cacheName: CacheNames) {
  if (!__cachePromises.has(cacheName)) {
    const cachePromise = caches.open(cacheName)
    cachePromise.then(c => {
      __caches.set(cacheName, c)
      const listeners = __cacheListeners.get(cacheName)!
      for (const cb of listeners) {
        cb(c)
      }
      listeners.length = 0
    })
  }
}

export function lookInCache(
  cacheName: CacheNames | undefined,
  cb: CacheListener
) {
  if (!cacheName) {
    cb(undefined)
    return
  }
  if (!__caches.has(cacheName)) {
    if (!__cacheListeners.has(cacheName)) {
      __cacheListeners.set(cacheName, [cb])
    } else {
      __cacheListeners.get(cacheName)!.push(cb)
    }
    __initCache(cacheName)
  } else {
    cb(__caches.get(cacheName))
  }
}

let __cacheyFetchInited = false
export function installCacheyFetchShim() {
  if (__cacheyFetchInited) {
    return
  }
  __cacheyFetchInited = true
  const originalFetch = window.fetch
  function cacheyFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return new Promise(resolve => {
      let href = ''
      if (input instanceof URL) {
        href = input.href
      } else {
        href = input as string
      }
      const cacheName = findCacheNameForFile(href)
      if (cacheName) {
        lookInCache(cacheName, async cache => {
          let response = cache
            ? await cache.match(input, MATCH_OPTIONS)
            : undefined
          if (!response) {
            response = await originalFetch(input, init)
            if (cache && response.ok) {
              cache.put(input, response.clone())
            }
          }
          resolve(response.clone()!)
        })
      } else {
        originalFetch(input, init).then(response => resolve(response))
      }
    })
  }
  window.fetch = cacheyFetch
}
