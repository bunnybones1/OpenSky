import AssetHashManifest from '@opensky/shared/AssetHashManifest'
import { useQuery } from '@tanstack/react-query'

import env from '~/env'
import { getAssetManifestKey } from '~/shared/constants/react-query-keys'

const getProxyServerUrl = () => {
  const RE_PROXY_SERVER_URL = /proxyServerUrl=(.+)/gi

  const match = RE_PROXY_SERVER_URL.exec(window.navigator.userAgent.toLowerCase())

  if (!match) {
    return null
  }

  return match[1] || null
}

const getAssetsUrlPrefix = () => {
  const proxyUrl = getProxyServerUrl()

  if (!!proxyUrl) {
    return `${proxyUrl}?path=${env.ASSETS_URL}`
  }

  return env.ASSETS_URL
}

export const useAssetManifest = (type: 'webapp' | 'game') => {
  return useQuery(
    getAssetManifestKey(type),
    async () => {
      return await getAssetManifest(type)
    },
    {
      staleTime: Infinity
    }
  )
}

const __pendingManifests: Map<
  'webapp' | 'game',
  Promise<AssetHashManifest>
> = new Map()

export const getAssetManifest = (
  type: 'webapp' | 'game'
): Promise<AssetHashManifest> => {
  if (!__pendingManifests.has(type)) {
    const p = new Promise<AssetHashManifest>((resolve) => {
      fetch(
        `${env.ASSETS_URL}/asset-manifests/assets-manifest.${type}.tree.${
          type === 'webapp'
            ? env.ASSETS_MANIFEST_WEBAPP_HASH
            : env.ASSETS_MANIFEST_GAME_HASH
        }.json`
      )
        .then((res) => res.json())
        .then((json) => new AssetHashManifest(getAssetsUrlPrefix(), json))
        .then(resolve)
    })
    __pendingManifests.set(type, p)
  }
  return __pendingManifests.get(type)!
}
