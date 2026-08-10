import { AppPlatform, getAppPlatform } from '@opensky/shared/get-app-platform'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { openExternalLink } from '~/shared/helpers/mobile-native-links'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

export const AppUpdateDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  const platform = getAppPlatform()

  const handleConfirm = useCallback(() => {
    // open relevant app store
    let link = 'https://download-android.skyweaver.net'
    if (platform === AppPlatform.IOS_NATIVE) {
      link = 'https://apps.apple.com/us/app/opensky/id1469294062'
    }
    openExternalLink(link, false)
  }, [platform])

  return (
    <PromptDialog
      imageUrl={
        !!getAssetUrl
          ? getAssetUrl('webapp/backgrounds/bg-conquest-warning-modal.webp')
          : undefined
      }
      onConfirm={handleConfirm}
      confirmText={t('appUpdateModal.upgradeNow')}
      confirmColor="blue"
      prompText={t('appUpdateModal.description')}
    />
  )
})

AppUpdateDialog.displayName = 'AppUpdateDialog'
