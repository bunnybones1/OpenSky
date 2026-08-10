import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { Text } from '~/shared/components/Text'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useResetSpectateCode } from '~/shared/mutations/useResetSpectateCode'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CONFIRM_RESET_CODE_DIALOG_ID } from '../shared/constants'

const { closeDialog } = controlDialog(CONFIRM_RESET_CODE_DIALOG_ID)

export const ConfirmResetSpectatorCodeDialog = memo(() => {
  const { mutate } = useResetSpectateCode()
  const { t } = useTranslation()

  const handleConfirm = useCallback(() => {
    mutate()
    closeDialog()
  }, [mutate])

  return (
    <PromptDialog
      onDismiss={closeDialog}
      onConfirm={handleConfirm}
      confirmColor="blue"
      dismissColor="default"
    >
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '24px'
        })}
      >
        <Icon type="link-reset" height="48px" color="white" />
        <Text color="white" fontSize="16px" fontWeight="700" marginTop="16px">
          {t('profile.spectate.confirmModalHeader')}
        </Text>
        <Text color="purple9" fontSize="16px" fontWeight="600" marginTop="8px">
          {t('profile.spectate.confirmModalBody')}
        </Text>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginY: '16px'
          })}
        >
          <Icon height="12px" color="warm8" type="alert" />
          <Text fontSize="14px" marginLeft="4px" color="warm8" fontWeight="600">
            {t('profile.spectate.confirmModalDisclaimer')}
          </Text>
        </div>
      </div>
    </PromptDialog>
  )
})

ConfirmResetSpectatorCodeDialog.displayName = 'ConfirmResetSpectatorCodeDialog'
