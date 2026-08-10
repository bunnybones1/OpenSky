import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'

export const OfflineDialog = memo(() => {
  const { t } = useTranslation()

  const onConfirm = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <PromptDialog
      confirmColor="default" // prevent highlight
      prompText={t('offlineModal.description')}
      confirmText={t('generic.refresh')}
      onConfirm={onConfirm}
    />
  )
})

OfflineDialog.displayName = 'OfflineDialog'
