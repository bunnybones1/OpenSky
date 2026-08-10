import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { AuthenticationClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Input } from '~/shared/components/Input/Input'
import { Text } from '~/shared/components/Text'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ACCOUNT_SETTINGS_DIALOG_ID } from '../../../../shared/constants'
import { DELETE_ACCOUNT_DIALOG_ID } from '../shared/constants'
import {
  DeleteAccountDialogButtonWrapper,
  DeleteAccountDialogStyle,
  DeleteAccountDialogTextWrapper,
  DeleteAccountDialogTitle
} from './DeleteAccountDialog.css'

const { closeDialog } = controlDialog(DELETE_ACCOUNT_DIALOG_ID)
const { closeDialog: closeAccountSettingsDialog } = controlDialog(
  ACCOUNT_SETTINGS_DIALOG_ID
)

export const DeleteAccountDialog = memo(() => {
  const [username, setUsername] = useState('')
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const { data: authedAccount } = useAuthedAccount()
  const dispatch = useDispatch()

  const onChange = useCallback((name) => {
    setUsername(name)
  }, [])

  const onClear = useCallback(() => {
    setUsername('')
  }, [])

  const handleClick = useCallback(async () => {
    AuthenticationClient.deleteAccount(() => {
      closeDialog()
      closeAccountSettingsDialog()
      dispatch(push(ROUTES_CONFIG.routes.DELETED_ACCOUNT.directPath))
    })
  }, [dispatch])

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          flexWrap: 'nowrap'
        }),
        DeleteAccountDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            backgroundColor: 'purple4',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            width: 'full'
          }),
          DeleteAccountDialogTitle
        )}
      >
        <TitleDetail title={t('general.deleteAccount')} color="warm9" />
      </div>
      <div
        className={clsx(
          Sprinkles({
            position: 'relative',
            paddingY: { base: '12px', tabletWide: '32px' },
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: 'full'
          }),
          DeleteAccountDialogTextWrapper
        )}
        style={{
          backgroundImage: !!getAssetUrl
            ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), linear-gradient(to top, rgba(12, 6, 30, 0.4), rgba(12, 6, 30, 0.9)), url(${getAssetUrl(
                'webapp/backgrounds/bg-dark-03.webp'
              )})`
            : undefined
        }}
      >
        <Text fontSize="18px" color="white" fontWeight="500">
          {t('deleteAccount.areYouSure')}
        </Text>
        <Text fontSize="16px" color="purple8" fontWeight="500">
          {t('deleteAccount.walletAccess')}
        </Text>
        <Text fontSize="16px" color="white" fontWeight="500">
          {t('deleteAccount.onceDeleted')}
        </Text>
        <Text fontSize="16px" color="warm9" fontWeight="500">
          {t('deleteAccount.enterYourUsername')}
        </Text>

        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'full'
          })}
        >
          <Input
            onChange={onChange}
            value={username}
            onClear={onClear}
            placeholder={t('createAccount.usernamePlaceholder')}
          />
          <div className={clsx(Sprinkles({ marginLeft: '8px' }))}>
            <Button
              colorType="red"
              frameType="leftCorner"
              height="36px"
              text={t('general.Confirm')}
              onClick={handleClick}
              disabled={!!authedAccount && username !== authedAccount?.name}
              buttonClassName={FullWidthButtonStyle}
              className={FullWidthButtonStyle}
            />
          </div>
        </div>
        <div
          className={clsx(
            Sprinkles({ marginTop: '16px' }),
            DeleteAccountDialogButtonWrapper
          )}
        >
          <Button
            frameType="default"
            colorType="secondary"
            height="36px"
            buttonClassName={FullWidthButtonStyle}
            className={FullWidthButtonStyle}
            onClick={closeDialog}
            text={t('general.cancel')}
          />
        </div>
      </div>
    </div>
  )
})

DeleteAccountDialog.displayName = 'DeleteAccountDialog'
