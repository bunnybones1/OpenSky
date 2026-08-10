import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/__deprecated__/Button'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'

import { DeleteAccountDialog } from './components/DeleteAccountDialog'
import { DeleteAccountDialogWrapper } from './DeleteAccountSettings.css'
import { DELETE_ACCOUNT_DIALOG_ID } from './shared/constants'

export const DeleteAccountSettings = memo(() => {
  const { t } = useTranslation()

  const { openDialog, Dialog } = useDialog({
    Element: DeleteAccountDialog,
    id: DELETE_ACCOUNT_DIALOG_ID,
    className: DeleteAccountDialogWrapper,
    isClickoffDisabled: true,
    isCloseButtonDisabled: true
  })

  return (
    <>
      <FlexBox pt={32} width="100%" type="centered-column">
        <Box width="60%" height="1px" bg="warm9" my="16px" />
        <Text fontSize="22px" color="warm9" flexShrink={0}>
          {t('profile.dangerZone')}
        </Text>
        <Box width={[152, 152, 152, 170]} mt="16px">
          <Button buttonStyle="warm" height={36} width={'100%'} onClick={openDialog}>
            <FlexBox justifyContent="center" alignItems="center" height="100%">
              <Text
                fontWeight="500"
                color="warm9"
                fontSize="16px"
                lineHeight="16px"
                fontFamily="condensed"
              >
                {t('general.deleteAccount')}
              </Text>
            </FlexBox>
          </Button>
        </Box>
      </FlexBox>
      {Dialog}
    </>
  )
})

DeleteAccountSettings.displayName = 'DeleteAccountSettings'
