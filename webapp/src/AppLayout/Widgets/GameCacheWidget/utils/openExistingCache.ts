export type CacheStorageReader<CacheValue> = {
  has: (cacheName: string) => Promise<boolean>
  open: (cacheName: string) => Promise<CacheValue>
}

export const openExistingCache = async <CacheValue>(
  cacheStorage: CacheStorageReader<CacheValue>,
  cacheName: string
): Promise<CacheValue | undefined> => {
  if (!(await cacheStorage.has(cacheName))) return undefined
  return cacheStorage.open(cacheName)
}
