let supportsAssetCacheProxyCached: boolean | undefined = undefined
export const supportsAssetCacheProxy = () => {
  if (supportsAssetCacheProxyCached === undefined) {
    supportsAssetCacheProxyCached = navigator.userAgent
      .toLowerCase()
      .includes('with-asset-cache-proxy') //TODO change this to use custom `with-proxy-asset-cache` when it's ready
  }
  return supportsAssetCacheProxyCached
}
