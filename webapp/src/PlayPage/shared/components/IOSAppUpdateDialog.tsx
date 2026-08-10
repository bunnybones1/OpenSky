import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { openExternalLink } from '~/shared/helpers/mobile-native-links'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { IOS_APP_UPDATE_DIALOG_ID } from '../constants'

export const IOSAppUpdateDialog = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  const onConfirm = useCallback(async () => {
    // open relevant app store
    const link = 'https://www.apple.com/ios/ios-15/'

    openExternalLink(link, false)
  }, [])

  const onDismiss = useCallback(() => {
    const { closeDialog } = controlDialog(IOS_APP_UPDATE_DIALOG_ID)
    closeDialog()
  }, [])

  return (
    <PromptDialog
      imageUrl={
        !!getAssetUrl
          ? getAssetUrl('webapp/backgrounds/bg-conquest-warning-modal.webp')
          : undefined
      }
      confirmText={t('appUpdateModal.upgradeNow')}
      dismissText={t('iosAppUpdateModal.dismiss')}
      onConfirm={onConfirm}
      prompText={t('iosAppUpdateModal.description')}
      onDismiss={onDismiss}
    />
  )
})

IOSAppUpdateDialog.displayName = 'IOSAppUpdateDialog'
