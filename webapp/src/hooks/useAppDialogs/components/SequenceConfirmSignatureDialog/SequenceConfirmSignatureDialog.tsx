import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthenticationClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID } from '~/shared/constants/ui'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SequenceSignatureInfoDialog } from './components/SequenceSignatureInfoDialog'
import { SEQUENCE_SIGNATURE_INFO_DIALOG_ID } from './shared/constants'

const { closeDialog } = controlDialog(SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID)

export const SequenceConfirmSignatureDialog = memo(() => {
  const { t } = useTranslation()

  const onClose = useCallback(() => {
    if (!!AuthenticationClient.wallet) {
      AuthenticationClient.wallet?.closeWalletWindow()
    }
    closeDialog()
  }, [])

  const { Dialog, openDialog } = useDialog({
    Element: SequenceSignatureInfoDialog,
    id: SEQUENCE_SIGNATURE_INFO_DIALOG_ID,
    isCloseButtonDisabled: true,
    isClickoffDisabled: true
  })

  return (
    <>
      <div
        className={Sprinkles({
          width: 'auto',
          height: 'auto',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          overflow: 'hidden'
        })}
      >
        <div
          className={Sprinkles({
            paddingBottom: '24px'
          })}
        >
          <Text
            color="white"
            fontFamily="condensed"
            fontSize="32px"
            textAlign="center"
          >
            {t('signTransaction.confirmSignagure')}
          </Text>
          <Text
            color="white"
            fontFamily="condensed"
            fontSize="32px"
            textAlign="center"
            className={Sprinkles({
              paddingBottom: '8px'
            })}
          >
            {t('signTransaction.completeAction')}
          </Text>
          <Text
            fontWeight="400"
            color="white"
            fontFamily="condensed"
            fontSize="16px"
            textAlign="center"
          >
            {t('signTransaction.popUp')}
          </Text>
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'nowrap'
          })}
        >
          <Button
            frameType={'default'}
            colorType={'default'}
            height={'36px'}
            text={t('general.cancel')}
            onClick={onClose}
            buttonClassName={Sprinkles({
              paddingX: '48px',
              marginRight: '4px'
            })}
          />
          <Button
            frameType={'default'}
            colorType={'blue'}
            height={'36px'}
            text={t('general.openWallet')}
            onClick={() => {
              if (!!AuthenticationClient.wallet) {
                AuthenticationClient.wallet.openWalletWindow()
              }
            }}
            buttonClassName={Sprinkles({
              paddingX: '24px',
              marginLeft: '4px'
            })}
            leftAdornment={{
              icon: 'external'
            }}
          />
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '24px'
          })}
        >
          <Text
            fontWeight="400"
            color="white"
            fontFamily="condensed"
            fontSize="16px"
            textAlign="center"
            className={Sprinkles({
              marginRight: '8px'
            })}
          >
            {t('signTransaction.whySignTitle')}
          </Text>
          <Icon type="info-empty" height="16px" color="white" onClick={openDialog} />
        </div>
      </div>
      {Dialog}
    </>
  )
})

SequenceConfirmSignatureDialog.displayName = 'SequenceConfirmSignatureDialog'
