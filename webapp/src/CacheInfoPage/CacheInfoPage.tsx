import { supportsAssetCacheProxy } from '@opensky/shared/check-asset-cache-proxy-support'
import { memo } from 'react'

import { FlexBox } from '~/shared/components/Base'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'

import { CacheInfoPageStyle } from './CacheInfoPage.css'
import { AdditionalTechnicalInfo } from './components/AdditionalTechnicalInfo'
import { AllStorageInfo } from './components/AllStorageInfo'
import { AndroidNativeCacheInfo } from './components/AndroidNativeCacheInfo'
import { GameStorageInfo } from './components/GameStorageInfo'

const CacheInfo = memo(() => {
  return (
    <FlexBox
      width="100%"
      className={CacheInfoPageStyle}
      pl={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      pb={[0, 0, 0, 24]}
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
    >
      {supportsAssetCacheProxy() ? <AndroidNativeCacheInfo /> : <AllStorageInfo />}
      <>
        <GameStorageInfo />
        <AdditionalTechnicalInfo />
      </>
    </FlexBox>
  )
})

CacheInfo.displayName = 'CacheInfo'

export default CacheInfo
