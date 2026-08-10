import { formatBytes } from '@opensky/shared/formatBytes'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'

import { useCacheInfo } from '../queries/useCacheInfo'

export const AllStorageInfo = memo(() => {
  const { t } = useTranslation()
  const { data: cacheInfo, error, isLoading } = useCacheInfo()

  const StorageInfo = useMemo(() => {
    if (isLoading) {
      return (
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={18}>
          {t('cache.loadingCacheInfo')}
        </Text>
      )
    }
    if (error) {
      return (
        <Text fontFamily="mono" color="warm8" fontWeight="medium" fontSize={18}>
          {t('cache.errorFetching')}: {error.message}
        </Text>
      )
    }
    if (cacheInfo) {
      const totalSize = formatBytes(
        Object.keys(cacheInfo.cacheSizesBreakdown)
          .map((key) => cacheInfo.cacheSizesBreakdown[key])
          .reduce((prev, curr) => prev + curr, 0)
      )

      return (
        <>
          {cacheInfo.cacheLimit ? (
            <Text
              mb="24px"
              fontFamily="mono"
              color="white"
              fontWeight="medium"
              fontSize={18}
            >
              {`Using ${totalSize} of ${formatBytes(cacheInfo.cacheLimit)}`}
            </Text>
          ) : (
            <Text
              mb="24px"
              fontFamily="mono"
              color="white"
              fontWeight="medium"
              fontSize={18}
            >
              {t('cache.unableToFetch')}
            </Text>
          )}
          {Object.keys(cacheInfo.cacheSizesBreakdown).map((key) => {
            const cacheSize = cacheInfo.cacheSizesBreakdown[key]

            return (
              <FlexBox
                alignItems="center"
                justifyContent="flex-start"
                width="100%"
                key={key}
                flexWrap="nowrap"
              >
                <Text
                  mb="16px"
                  fontFamily="mono"
                  color="purple9"
                  fontWeight="medium"
                  fontSize={16}
                  mr="auto"
                  textWrap
                >
                  {`${key}:`}
                </Text>
                <Text
                  mb="16px"
                  fontFamily="mono"
                  color="white"
                  fontWeight="medium"
                  fontSize={16}
                  flexShrink={0}
                >
                  {formatBytes(cacheSize)}
                </Text>
              </FlexBox>
            )
          })}
        </>
      )
    }
    return null
  }, [cacheInfo, error, isLoading, t])

  return (
    <FlexBox
      type="centered-start-column"
      maxWidth={800}
      width="100%"
      px={48}
      pt={[8, 32, 32, 8]}
    >
      <Text color="cold6" fontSize={24} fontWeight="bold">
        {t('cache.cacheOverview')}
      </Text>
      {StorageInfo}
    </FlexBox>
  )
})

AllStorageInfo.displayName = 'AllStorageInfo'
