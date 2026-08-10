/* eslint-disable valtio/state-snapshot-rule */
import { memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { AuthenticationClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { authenticationState } from '~/shared/state/authentication-state'

import { AccountSettingsDialog } from './AccountSettingsDialog/AccountSettingsDialog'
import { AccountSettingsDialogOveride } from './SettingsButton.css'
import { ACCOUNT_SETTINGS_DIALOG_ID } from './shared/constants'

const SettingsButton = memo(() => {
  const { Dialog, openDialog } = useDialog({
    Element: AccountSettingsDialog,
    id: ACCOUNT_SETTINGS_DIALOG_ID,
    isClickoffDisabled: true,
    className: AccountSettingsDialogOveride
  })

  const { t } = useTranslation()

  const [buttonType, setButtonType] = useState<
    'manageContacts' | 'addFriend' | 'removeFriend' | null
  >(null)

  const [animationKey, setAnimationKey] = useState('')

  const { data: activeAccount } = useActiveAccount()
  const { userAddress } = useSnapshot(authenticationState)

  const isExternalAccount = useMemo(() => {
    if (!activeAccount?.address || !userAddress) return false
    return activeAccount.address !== userAddress
  }, [activeAccount?.address, userAddress])

  useEffect(() => {
    if (!!activeAccount?.address) {
      if (isExternalAccount) {
        setButtonType('manageContacts')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.address, isExternalAccount])

  const externalAccountButtonTitle = useMemo(() => {
    switch (buttonType) {
      case 'manageContacts':
        return t('profile.manageContact')
      case 'addFriend':
        return animationKey === 'added'
          ? t('profile.addedFriend')
          : t('profile.addFriend')
      case 'removeFriend':
        return animationKey === 'removed'
          ? t('profile.friendRemoved')
          : t('profile.removeFriend')
      default:
        return ''
    }
  }, [buttonType, animationKey, t])

  const externalAccountButtonIcon = useMemo(() => {
    switch (buttonType) {
      case 'addFriend':
        return 'plus'
      case 'removeFriend':
        return 'close-circled'
      default:
        return 'profile'
    }
  }, [buttonType])

  return (
    <>
      <FlexBox
        height={65}
        position="absolute"
        zIndex={4}
        right="16px"
        top="0px"
        flexDirection="row"
        alignItems="center"
        justifyContent="flex-end"
      >
        {!isExternalAccount ? (
          <Button
            frameType="default"
            colorType="secondary"
            leftAdornment={{ icon: 'gear' }}
            text={t('generic.Settings')}
            onClick={() => openDialog()}
            data-id="accountSettingsButton"
          />
        ) : isExternalAccount ? (
          <Button
            frameType={'default'}
            colorType={buttonType === 'removeFriend' ? 'secondary' : 'default'}
            text={externalAccountButtonTitle}
            leftAdornment={{ icon: externalAccountButtonIcon }}
            onClick={() => {
              if (isExternalAccount && !!activeAccount) {
                if (buttonType === 'manageContacts') {
                  AuthenticationClient.wallet?.openWalletWindow(
                    `/contacts/${activeAccount.address}`
                  )
                  return
                }
                if (buttonType === 'addFriend') {
                  AuthenticationClient.wallet?.openWalletWindow(
                    `/contacts/${activeAccount.address}/${activeAccount.name}`
                  )

                  setAnimationKey('added')

                  setTimeout(() => {
                    setAnimationKey('')
                    setButtonType('removeFriend')
                  }, 2000)

                  return
                }

                if (buttonType === 'removeFriend') {
                  setAnimationKey('removed')

                  setTimeout(() => {
                    setAnimationKey('')
                    setButtonType('addFriend')
                  }, 2000)

                  return
                }
              }
              openDialog()
            }}
            data-id="accountSettingsButton"
          />
        ) : null}
      </FlexBox>
      {Dialog}
    </>
  )
})

SettingsButton.displayName = 'SettingsButton'

export default SettingsButton
