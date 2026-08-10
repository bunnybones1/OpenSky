import styled from '@emotion/styled'
import { isAndroidNativeApp } from '@opensky/shared/check-mobile-app-type'
import { formatBytes } from '@opensky/shared/formatBytes'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMount } from 'react-use'
import { useSnapshot } from 'valtio'

import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import Glow from '~/shared/components/Glow'
import { Icon } from '~/shared/components/Icon/Icon'
import { WIFI_UPDATE_LS_KEY } from '~/shared/constants/cache'
import { ONE_DAY } from '~/shared/constants/time'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { isLocalHost } from '~/shared/helpers/is-local-host'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGameCacheTotals } from '~/shared/hooks/useGameCacheTotals'
import { usePrefetchGameAssets } from '~/shared/hooks/usePrefetchGameAssets'
import { authenticationState } from '~/shared/state/authentication-state'
import { uiState } from '~/shared/state/ui/ui-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { pruneOutdatedFromCache } from './utils/pruneOutdatedFromCache'

const IconHeights = { base: '20px', tabletWide: '24px' } as const

export const GameCacheWidget = memo(() => {
  const { t } = useTranslation()
  const gameCacheInfo = useGameCacheTotals()
  const { cacheGameAssets, cancelGameAssetCache } = usePrefetchGameAssets()
  const [isDismissed, setIsDismissed] = useState(false)
  const [shouldShowWidget, setShouldShowWidget] = useState(false)
  const hasGameInfoBeenFetched = useRef(false)
  const { isInitializing } = useSnapshot(authenticationState)
  const hasUndismissedBecauseQuota = useRef(false)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { isCacheDownloadInProgress, isCacheQuotaExceeded } = useSnapshot(uiState)

  useEffect(() => {
    // If the user has hit a quota error, but has this widget hidden we want
    // to un-hide it at least once.
    if (isCacheQuotaExceeded && !hasUndismissedBecauseQuota.current && isDismissed) {
      hasUndismissedBecauseQuota.current = true
      setIsDismissed(false)
    }
  }, [isDismissed, isCacheQuotaExceeded])

  const onClick = useCallback(async () => {
    await cacheGameAssets(undefined)
  }, [cacheGameAssets])

  const hasDataToCache = useMemo(() => {
    return !!gameCacheInfo?.toCache
  }, [gameCacheInfo?.toCache])

  useEffect(() => {
    if (!!gameCacheInfo) {
      // We only want this effect to fire when gameCacheInfo has been fetched
      // for the FIRST time, not when it updates. We also dont want to
      // start downloading files while the app is still authenticating,
      // else we could block crucial post-auth requests from being made
      // before the download ends.
      if (!hasGameInfoBeenFetched.current && !isInitializing) {
        hasGameInfoBeenFetched.current = true
        const wifiUpdateCheckedVal = window.localStorage.getItem(WIFI_UPDATE_LS_KEY)

        const wifiUpdateChecked =
          wifiUpdateCheckedVal !== null && wifiUpdateCheckedVal !== 'false'

        if (wifiUpdateChecked && hasDataToCache && !isCacheDownloadInProgress) {
          onClick()
        }
      }
    }
  }, [
    gameCacheInfo,
    hasDataToCache,
    isCacheDownloadInProgress,
    onClick,
    isInitializing
  ])

  useMount(() => {
    // No need to prune the cache on Andriod, the mobile app
    // handles that itself.
    if (!isAndroidNativeApp() && !isLocalHost()) {
      pruneOutdatedFromCache()
    }
    const skipTimestamp = localStorage.getItem('skipTimestamp')

    if (!skipTimestamp) setShouldShowWidget(true)
    else setShouldShowWidget(new Date().getTime() - Number(skipTimestamp) >= ONE_DAY)
  })

  const downloadPercent = useMemo(() => {
    if (!gameCacheInfo) return
    return `${gameCacheInfo.cachedPercent.toFixed(1)}%`
  }, [gameCacheInfo])

  const handleClickSkip = () => {
    const currentTimestamp = new Date().getTime()
    localStorage.setItem('skipTimestamp', currentTimestamp.toString())
    setIsDismissed(true)
  }

  if (isLocalHost()) return null

  if (!hasDataToCache || !shouldShowWidget) {
    return null
  }

  if (
    (isDismissed &&
      (!isCacheDownloadInProgress || !downloadPercent) &&
      !isCacheQuotaExceeded) ||
    (!isCacheDownloadInProgress && gameCacheInfo && gameCacheInfo.cachedPercent > 95)
  ) {
    return null
  }

  if (isDismissed && !!isCacheDownloadInProgress && !!downloadPercent) {
    return (
      <FlexBox
        bg="black"
        position="absolute"
        left={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
        bottom={0}
        type="centered-start-row"
        p="4px"
      >
        <Text color="white" fontFamily="mono" fontWeight="regular" fontSize={10}>
          {t('cache.downloadingUpdate', { percent: downloadPercent })}
        </Text>
      </FlexBox>
    )
  }

  if (isDismissed && isCacheQuotaExceeded) {
    return (
      <FlexBox
        bg="warm4"
        position="absolute"
        left={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
        bottom={0}
        type="centered-start-row"
        p="4px"
      >
        <Text color="white" fontFamily="mono" fontWeight="regular" fontSize={10}>
          {t('cache.storageQuotaExceeded')}
        </Text>
      </FlexBox>
    )
  }

  if (isCacheQuotaExceeded) {
    return (
      <FlexBox
        style={{
          borderRadius: '8px',
          pointerEvents: 'all'
        }}
        p={['12px', '12px', '12px', '16px']}
        maxWidth={[400, 400, 400, 424]}
        bg="purple3"
        position="relative"
        type="centered-start-row"
        border="1px solid"
        borderColor="purple6"
        flexWrap="nowrap"
        mt="16px"
      >
        <Glow
          duration={0.8}
          blur="8px"
          spread="4px"
          borderRadius="8px"
          color="warm9"
        />
        <Text
          color="white"
          fontSize={[12, 12, 12, 14]}
          fontWeight="medium"
          mr={['8px', '8px', '8px', '16px']}
          textWrap
        >
          {t('cache.unableToCacheLineOne')}
          {t('cache.unableToCacheLineTwo')}
        </Text>
        <Box mr="8px">
          <Button
            frameType="default"
            colorType="red"
            text={t('general.Hide')}
            className={Sprinkles({ zIndex: 5 })}
            onClick={() => {
              hasUndismissedBecauseQuota.current = true
              setIsDismissed(true)
            }}
          />
        </Box>
      </FlexBox>
    )
  }

  return (
    <FlexBox
      style={{
        borderRadius: '8px',
        pointerEvents: 'all'
      }}
      p={['12px', '12px', '12px', '16px']}
      maxWidth={[400, 400, 400, 424]}
      bg="purple3"
      position="relative"
      type="centered-start-row"
      border="1px solid"
      borderColor="purple6"
      flexWrap="nowrap"
      mt="16px"
    >
      <Glow
        duration={0.8}
        blur="8px"
        spread="4px"
        borderRadius="8px"
        color={isCacheDownloadInProgress ? 'cold7' : 'forest5'}
      />
      {!isCacheDownloadInProgress ? (
        <>
          {isTabletWide && (
            <Icon height={IconHeights} color="forest5" type="download" />
          )}
          <CacheWarningText
            color="white"
            fontSize={[12, 12, 12, 14]}
            fontWeight="medium"
            mx={['8px', '8px', '8px', '16px']}
            textWrap
            fontFamily="mono"
          >
            {gameCacheInfo?.toCache ? (
              <strong>
                {t('support.updateReadySized', {
                  size: formatBytes(gameCacheInfo.toCache)
                })}
              </strong>
            ) : (
              t('support.updateReadyUnsized')
            )}
          </CacheWarningText>
          <Button
            frameType="default"
            colorType="default"
            text={t('downloadAssets.skip')}
            onClick={handleClickSkip}
            className={Sprinkles({ marginRight: '8px', zIndex: 5 })}
            buttonClassName={Sprinkles({
              paddingX: '16px'
            })}
          />
          <Button
            frameType="default"
            colorType="green"
            text={t('downloadAssets.download')}
            onClick={onClick}
            className={Sprinkles({ zIndex: 5 })}
          />
        </>
      ) : (
        <>
          <Icon color="white" height="24px" type="spinner" />
          <CacheProgressText
            color="white"
            fontSize={[12, 12, 12, 14]}
            fontWeight="medium"
            mx="16px"
            fontFamily="mono"
            textWrap
          >
            {t('cache.updating')}
            {!!downloadPercent && <strong>{downloadPercent}</strong>}
          </CacheProgressText>
          <Box mr="8px">
            <Button
              frameType="default"
              colorType="default"
              text={t('general.Hide')}
              onClick={() => setIsDismissed(true)}
              className={Sprinkles({ zIndex: 5 })}
              buttonClassName={Sprinkles({
                paddingX: '4px'
              })}
            />
          </Box>
          <Button
            frameType="default"
            colorType="blue"
            text={t('general.pause')}
            onClick={cancelGameAssetCache}
            className={Sprinkles({ zIndex: 5 })}
          />
        </>
      )}
    </FlexBox>
  )
})

const CacheWarningText = styled(Text)`
  strong {
    color: ${({ theme }) => theme.colors.forest5};
    font-weight: 600;
  }
`

const CacheProgressText = styled(Text)`
  strong {
    color: ${({ theme }) => theme.colors.cold7};
    font-weight: 600;
  }
`

GameCacheWidget.displayName = 'GameCacheWidget'
