import {
  isAndroidNativeApp,
  isIOSNativeApp
} from '@opensky/shared/check-mobile-app-type'
import { isDevMode } from '@opensky/shared/devMode'
import { formatBytes } from '@opensky/shared/formatBytes'
import { useWorkerlessCacheStorage } from '@opensky/shared/userSettings'
import { memo, MouseEvent, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { FlexBox, Text } from '~/shared/components/Base'
import { BasicProgressBar } from '~/shared/components/BasicProgressBar'
import { Button } from '~/shared/components/Button'
import { Checkbox } from '~/shared/components/Checkbox'
import { WIFI_UPDATE_LS_KEY } from '~/shared/constants/cache'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGameCacheTotals } from '~/shared/hooks/useGameCacheTotals'
import { usePrefetchGameAssets } from '~/shared/hooks/usePrefetchGameAssets'
import { useGameAssetCacheError } from '~/shared/queries/useGameAssetCachePaths'
import { uiState } from '~/shared/state/ui/ui-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const GameCacheSettings = memo(() => {
  const { t } = useTranslation()
  const gameCacheInfo = useGameCacheTotals()
  const { data: gameAssetCacheError } = useGameAssetCacheError()
  const { cacheGameAssets, cancelGameAssetCache, deleteCachedGameAssets } =
    usePrefetchGameAssets()
  const { isCacheDownloadInProgress } = useSnapshot(uiState)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const [wifiUpdateChecked, setWifiUpdateChecked] = useState(() => {
    const wifiUpdateChecked = window.localStorage.getItem(WIFI_UPDATE_LS_KEY)
    if (wifiUpdateChecked === null) {
      return false
    } else {
      return wifiUpdateChecked == 'false' ? false : true
    }
  })

  const onClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      await cacheGameAssets(undefined)
    },
    [cacheGameAssets]
  )

  const onCancel = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      cancelGameAssetCache()
    },
    [cancelGameAssetCache]
  )

  const onDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      deleteCachedGameAssets()
    },
    [deleteCachedGameAssets]
  )

  const hasDataToCache = useMemo(() => {
    return !!gameCacheInfo?.toCache
  }, [gameCacheInfo?.toCache])

  const downloadPercent = useMemo(() => {
    if (!gameCacheInfo) return
    return `${gameCacheInfo.cachedPercent.toFixed(1)}%`
  }, [gameCacheInfo])

  return (
    <FlexBox width="100%" type="centered-column" pt={32}>
      <Text pb={10} fontSize={18} color="purple9" fontWeight="bold">
        {t('general.gameContent')}
      </Text>
      <FlexBox width="100%" type="centered-column">
        {gameCacheInfo && downloadPercent ? (
          !gameAssetCacheError ? (
            <>
              <Text color="purple8" fontSize={14} pb={10} pr={10}>
                {t('install.downloadGame')}
                {` (~${formatBytes(gameCacheInfo.toCache + gameCacheInfo.cached)})`}
              </Text>
              <BasicProgressBar value={downloadPercent} />
            </>
          ) : (
            <>
              <Text color="purple8" fontSize={14} pb={10} pr={10}>
                {t('install.unsupportedAndroidVersion')}
              </Text>
              <Text color="purple8" fontSize={14} pb={10} pr={10}>
                {t('install.forBestExperienceUpgrade')}
              </Text>
            </>
          )
        ) : (
          <></>
        )}
        <FlexBox type="centered-row" width={210}>
          <Button
            frameType="default"
            colorType="blue"
            onClick={onClick}
            text={t('general.install')}
            disabled={isCacheDownloadInProgress || !hasDataToCache}
          />
          {isCacheDownloadInProgress ? (
            <Button
              frameType="default"
              colorType="default"
              onClick={onCancel}
              text={t('general.cancel')}
              className={Sprinkles({ marginLeft: '8px' })}
            />
          ) : // We cant delete the native android cache from the webview
          !isAndroidNativeApp() ? (
            <Button
              frameType="default"
              colorType="default"
              onClick={onDelete}
              text={t('general.uninstall')}
              disabled={isCacheDownloadInProgress || !gameCacheInfo?.cached}
              className={Sprinkles({ marginLeft: '8px' })}
            />
          ) : null}
        </FlexBox>
        <FlexBox
          style={{
            marginTop: '20px',
            marginBottom: '30px',
            zIndex: 5
          }}
        >
          <Checkbox
            onChange={() => {
              const newValue = !wifiUpdateChecked
              setWifiUpdateChecked(newValue)
              window.localStorage.setItem(WIFI_UPDATE_LS_KEY, String(newValue))
            }}
            text={
              t('install.updateAutomatically') + !isTabletWide
                ? ' ' + t('install.onWiFi')
                : ''
            }
            value={!!wifiUpdateChecked}
            isActive={!!wifiUpdateChecked}
          />
        </FlexBox>
        {isIOSNativeApp() || isDevMode() ? (
          <FlexBox
            style={{
              marginTop: '20px',
              marginBottom: '30px',
              zIndex: 5
            }}
          >
            <Checkbox
              onChange={() => {
                useWorkerlessCacheStorage.value = !useWorkerlessCacheStorage.value
                setTimeout(() => window.location.reload(), 100)
              }}
              text={
                typeof useWorkerlessCacheStorage.label === 'string'
                  ? useWorkerlessCacheStorage.label
                  : useWorkerlessCacheStorage.label()
              }
              value={!!useWorkerlessCacheStorage.value}
              isActive={!!useWorkerlessCacheStorage.value}
            />
          </FlexBox>
        ) : undefined}
      </FlexBox>
    </FlexBox>
  )
})

GameCacheSettings.displayName = 'GameCacheSettings'
