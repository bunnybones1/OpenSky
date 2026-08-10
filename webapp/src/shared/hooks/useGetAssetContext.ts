import { useContext } from 'react'

import { DEFAULT_GET_ASSET_CONTEXT } from '~/components/GetAssetProvider/constants'
import { GetAssetContext } from '~/components/GetAssetProvider/GetAssetProvider'

export const useGetAssetContext = () => {
  const context = useContext(GetAssetContext)

  if (context === DEFAULT_GET_ASSET_CONTEXT) {
    console.error('USING WEAVE CONTEXT WITHOUT ADDING PROVIDER')
  }

  return context
}
