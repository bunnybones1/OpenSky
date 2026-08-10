import { getCacheStatuses } from '@opensky/shared/cache'
import { formatBytes } from '@opensky/shared/formatBytes'
import { getAssetPaths } from '@opensky/shared/naiveGameAssets'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { BasicProgressBar } from '~/shared/components/BasicProgressBar'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGameCacheTotals } from '~/shared/hooks/useGameCacheTotals'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { usePrefetchGameAssets } from '~/shared/hooks/usePrefetchGameAssets'
import { getAssetManifest } from '~/shared/queries/useAssetManifest'
import { uiState } from '~/shared/state/ui/ui-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { JoinQueueParams, useJoinQueue } from '../../useJoinQueue/useJoinQueue'
import { ASSET_WARNING_DIALOG_ID } from '../shared/constants'
import {
  AssetWarningDialogBg,
  AssetWarningDialogProgress,
  AssetWarningDialogStyle
} from './AssetWarningDialog.css'

export const AssetWarningDialog = memo(
  ({ mode, challengeCode, captchaRequired }: JoinQueueParams) => {
    const gameCacheInfo = useGameCacheTotals()
    const { cacheGameAssets, cancelGameAssetCache } = usePrefetchGameAssets()
    const { isCacheDownloadInProgress } = useSnapshot(uiState)
    const { getAssetUrl } = useGetAssetContext()
    const { joinQueue } = useJoinQueue()

    const [
      upgradeAndroidForBetterCacheManagement,
      setUpgradeAndroidForBetterCacheManagement
    ] = useState('')

    const hasDataToCache = useMemo(() => {
      return !!gameCacheInfo?.toCache
    }, [gameCacheInfo?.toCache])

    const onDismiss = useCallback(() => {
      joinQueue({ mode, challengeCode, captchaRequired })
      const { closeDialog } = controlDialog(ASSET_WARNING_DIALOG_ID)
      closeDialog()
    }, [captchaRequired, challengeCode, joinQueue, mode])

    const onConfirm = useCallback(() => {
      if (uiState.isCacheDownloadInProgress) {
        cancelGameAssetCache()
      } else if (hasDataToCache) {
        cacheGameAssets(undefined)
      } else {
        onDismiss()
      }
    }, [cacheGameAssets, cancelGameAssetCache, hasDataToCache, onDismiss])

    useEffect(() => {
      getAssetManifest('game').then((manifest) => {
        listenToProperty(
          getCacheStatuses(getAssetPaths('current_device'), manifest),
          'error',
          (e) => setUpgradeAndroidForBetterCacheManagement(e)
        )
      })
    }, [])

    const downloadPercent = useMemo(() => {
      if (!gameCacheInfo) return
      return `${gameCacheInfo.cachedPercent.toFixed(1)}%`
    }, [gameCacheInfo])

    const { t } = useTranslation()
    return (
      <div
        className={clsx(
          Sprinkles({
            backgroundColor: 'purple1',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          }),
          AssetWarningDialogStyle
        )}
      >
        <div
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('webapp/backgrounds/gameassetbackground.webp')})`
              : undefined
          }}
          className={clsx(
            Sprinkles({
              width: 'full',
              border: '1px solid',
              borderColor: 'purple5'
            }),
            AssetWarningDialogBg
          )}
        />
        <div
          className={Sprinkles({
            border: '1px solid',
            borderColor: 'purple5',
            width: 'full',
            position: 'relative',
            height: 'auto',
            backgroundColor: 'transparent',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column'
          })}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              width: 'full',
              zIndex: 2,
              height: 'auto',
              padding: '24px',
              flexDirection: 'column',
              position: 'relative'
            })}
          >
            {!!gameCacheInfo && downloadPercent && (
              <>
                <Text
                  fontSize="16px"
                  fontWeight="400"
                  color="purple9"
                  textAlign="center"
                >
                  {t('install.downloadGame')}
                  {` (~${formatBytes(gameCacheInfo.toCache + gameCacheInfo.cached)})`}
                </Text>
                <div
                  className={clsx(
                    Sprinkles({
                      marginTop: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }),
                    AssetWarningDialogProgress
                  )}
                >
                  {!!upgradeAndroidForBetterCacheManagement ? (
                    upgradeAndroidForBetterCacheManagement
                  ) : (
                    <BasicProgressBar value={downloadPercent} />
                  )}
                </div>
              </>
            )}
          </div>

          <div
            className={Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              position: 'relative',
              padding: '20px',
              paddingTop: '0px',
              flexWrap: 'nowrap'
            })}
          >
            <div
              className={Sprinkles({ marginRight: '4px', flex: 1, display: 'flex' })}
            >
              <Button
                className={FullWidthButtonStyle}
                buttonClassName={FullWidthButtonStyle}
                height="36px"
                onClick={onDismiss}
                colorType="default"
                frameType="default"
                buttonId="promptAlertDismiss"
                text={t('generic.SKIP')}
              />
            </div>
            <div
              className={Sprinkles({ marginLeft: '4px', flex: 1, display: 'flex' })}
            >
              <Button
                className={FullWidthButtonStyle}
                buttonClassName={FullWidthButtonStyle}
                height="36px"
                onClick={onConfirm}
                frameType="default"
                colorType="blue"
                buttonId="promptAlertConfirm"
                text={
                  isCacheDownloadInProgress
                    ? t('generic.CANCEL')
                    : hasDataToCache
                    ? t('generic.INSTALL')
                    : t('generic.CONTINUE')
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
)

AssetWarningDialog.displayName = 'AssetWarningDialog'
