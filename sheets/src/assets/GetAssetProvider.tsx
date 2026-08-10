import { fetch as tauriFetch } from '@tauri-apps/api/http'
import { createContext, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { store } from '../stores/designData'
import { UserSettings, userSettings } from '../stores/userSettings'
import { DEFAULT_GET_ASSET_CONTEXT } from './constants'
import {
  AssetHashManifest,
  AssetHashManifestBypass,
  AssetsManifestTree,
  IAssetHashManifest
} from './helpers'

export const GetAssetContext = createContext(DEFAULT_GET_ASSET_CONTEXT)

interface GetAssetProviderProps {
  children: ReactNode
}

const assetsBaseURLs: { [K in UserSettings['assetsMode']]: string } = {
  local: '/assets',
  remote: 'https://assets.skyweaver.net',
  compose: 'https://local-assets.0xhorizon.net'
}

export function GetAssetProvider({ children }: GetAssetProviderProps) {
  const { assetsMode } = useSnapshot(userSettings)
  const assetsUrlBase = assetsBaseURLs[assetsMode]
  const {
    value: { assetsHash }
  } = useSnapshot(store)
  const [manifest, setManifest] = useState<IAssetHashManifest | null>(null)

  const fetchedManifest = useRef<IAssetHashManifest | null>(null)

  useEffect(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    if (assetsHash.length !== 32) {
      return
    }
    if (assetsMode === 'remote') {
      const fetchManifest = async () => {
        console.log('fetching manifest!', { assetsMode, assetsUrlBase })
        const assetsURL = `${assetsUrlBase}/asset-manifests/assets-manifest.rawPreviews.tree.${assetsHash}.json`
        console.log(
          `fetching manifest from ${assetsUrlBase}, hash ${assetsHash}, final url ${assetsURL}`
        )
        try {
          if (window.STATIC_DESIGN_DATA) {
            const res = await fetch(assetsURL)
            const data: AssetsManifestTree = await res.json()

            const manifest = new AssetHashManifest(assetsUrlBase, data)
            setManifest(manifest)

            fetchedManifest.current = manifest
          } else {
            const { data } = await tauriFetch<AssetsManifestTree>(assetsURL)

            const manifest = new AssetHashManifest(assetsUrlBase, data)
            setManifest(manifest)

            fetchedManifest.current = manifest
          }
        } catch (error) {
          console.error('FETCH MANIFEST ERROR => ', error)
        }
      }
      fetchManifest()
    } else {
      const manifest = new AssetHashManifestBypass(assetsUrlBase)
      setManifest(manifest)
      fetchedManifest.current = manifest
    }
  }, [assetsMode, assetsHash, assetsUrlBase])

  const value = useMemo(() => {
    return {
      getAssetUrl: !!manifest
        ? (path: string) => manifest.getFullUrl(path)
        : undefined
    }
  }, [manifest])

  return <GetAssetContext.Provider value={value}>{children}</GetAssetContext.Provider>
}
