import { createContext, memo, ReactNode, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { AssetClient } from '~/shared/clients'
import { uiState } from '~/shared/state/ui/ui-state'

import { DEFAULT_GET_ASSET_CONTEXT } from './constants'

export const GetAssetContext = createContext(DEFAULT_GET_ASSET_CONTEXT)

interface GetAssetProviderProps {
  children: ReactNode
}

export const GetAssetProvider = memo(({ children }: GetAssetProviderProps) => {
  const { isManifestLoaded } = useSnapshot(uiState)

  const value = useMemo(() => {
    return {
      getAssetUrl:
        !!isManifestLoaded && !!AssetClient.manifest
          ? (path: string) => AssetClient.getAssetUrl(path)
          : undefined
    }
  }, [isManifestLoaded])

  return <GetAssetContext.Provider value={value}>{children}</GetAssetContext.Provider>
})

GetAssetProvider.displayName = 'GetAssetProvider'
