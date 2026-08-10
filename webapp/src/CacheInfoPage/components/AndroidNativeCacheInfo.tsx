import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { MobileClient } from '~/shared/clients'
import { FlexBox, Text } from '~/shared/components/Base'

export const AndroidNativeCacheInfo = memo(() => {
  const { t } = useTranslation()

  return (
    <FlexBox
      type="centered-start-column"
      maxWidth={800}
      width="100%"
      px={48}
      pt={[32, 32, 32, 64]}
    >
      <Text color="cold6" fontSize={24} fontWeight="bold">
        {t('cache.cacheOverview')}
      </Text>
      <Text
        mb="18px"
        fontFamily="mono"
        color="white"
        fontWeight="medium"
        fontSize={18}
        mt={24}
      >
        {t('cache.usingDiskSpaceWithArgs', {
          used: MobileClient.androidCacheSizeInMegabytes || 0,
          total: MobileClient.freeDiskSpaceInMegabytes || 0
        })}
      </Text>
    </FlexBox>
  )
})

AndroidNativeCacheInfo.displayName = 'AllStorageInfo'
