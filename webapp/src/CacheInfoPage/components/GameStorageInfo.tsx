import { supportsAssetCacheProxy } from '@opensky/shared/check-asset-cache-proxy-support'
import { formatBytes } from '@opensky/shared/formatBytes'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'
import { useGameCacheTotals } from '~/shared/hooks/useGameCacheTotals'

export const GameStorageInfo = memo(() => {
  const { t } = useTranslation()
  const gameCacheInfo = useGameCacheTotals()

  const method = supportsAssetCacheProxy() ? 'proxy' : 'browser'

  return (
    <FlexBox
      type="centered-start-column"
      px={48}
      pt={[16, 32, 32, 16]}
      width="100%"
      maxWidth={800}
      pb={[16, 32, 32, 16]}
    >
      <Text color="cold6" fontSize={24} fontWeight="bold" mb="16px">
        {t('cache.gameCacheInfo')}
      </Text>
      {!gameCacheInfo ? (
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={18}>
          {t('cache.fetchingGameCacheInfo')}
        </Text>
      ) : (
        <>
          {method && (
            <FlexBox
              alignItems="center"
              justifyContent="flex-start"
              width="100%"
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
                {t('cache.cacheType')}:
              </Text>
              <Text
                mb="16px"
                fontFamily="mono"
                color="white"
                fontWeight="medium"
                fontSize={16}
                flexShrink={0}
              >
                {method}
              </Text>
            </FlexBox>
          )}
          <FlexBox
            width="100%"
            alignItems="center"
            justifyContent="flex-start"
            mb="16px"
          >
            <Text
              mr="auto"
              fontFamily="mono"
              color="purple9"
              fontWeight="medium"
              fontSize={16}
            >
              {t('cache.cached')}:
            </Text>
            <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
              {formatBytes(gameCacheInfo.cached)}
            </Text>
          </FlexBox>
          <FlexBox
            width="100%"
            alignItems="center"
            justifyContent="flex-start"
            mb="16px"
          >
            <Text
              mr="auto"
              fontFamily="mono"
              color="purple9"
              fontWeight="medium"
              fontSize={16}
            >
              {t('cache.needsToBeCached')}:
            </Text>
            <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
              {formatBytes(gameCacheInfo.toCache)}
            </Text>
          </FlexBox>
          <FlexBox width="100%" alignItems="center" justifyContent="flex-start">
            <Text
              mr="auto"
              fontFamily="mono"
              color="purple9"
              fontWeight="medium"
              fontSize={16}
            >
              {t('cache.unableToGetSize')}:
            </Text>
            <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
              {gameCacheInfo.numHashNotFound}
            </Text>
          </FlexBox>
        </>
      )}
    </FlexBox>
  )
})

GameStorageInfo.displayName = 'GameStorageInfo'
