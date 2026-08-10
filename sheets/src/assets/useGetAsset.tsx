import { useContext } from 'react'

import { DEFAULT_GET_ASSET_CONTEXT } from './constants'
import { GetAssetContext } from './GetAssetProvider'

export const useGetAsset = () => {
  const context = useContext(GetAssetContext)

  if (context === DEFAULT_GET_ASSET_CONTEXT) {
    console.error(
      'Asset fetching context not found, will return empty for all assets'
    )
  }

  return context
}
