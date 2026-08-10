import styled from '@emotion/styled'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthenticationClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import {
  COOKIE_SETTINGS_DIALOG_ID,
  STATE_CONFIRMATION_DIALOG_ID
} from '~/shared/constants/ui'
import { trackSessionEnd } from '~/shared/helpers/analytics-old'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useCat3State } from '~/shared/hooks/useCategoryThreeState'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ACCOUNT_SETTINGS_DIALOG_ID } from '../../shared/constants'

const { closeDialog } = controlDialog(ACCOUNT_SETTINGS_DIALOG_ID)
const { openDialog: openCookieSettingsDialog } = controlDialog(
  COOKIE_SETTINGS_DIALOG_ID
)
const { openDialog: openStateConfirmationDialog } = controlDialog(
  STATE_CONFIRMATION_DIALOG_ID
)

export const AccountSettingsControls = memo(() => {
  const { t } = useTranslation()
  const { data: authedAccount } = useAuthedAccount()

  const handleLogout = useCallback(() => {
    closeDialog()
    AuthenticationClient.logout()

    trackSessionEnd('logout')
  }, [])

  const { cat3State } = useCat3State()

  const isUS =
    !!window.sessStorage &&
    !!window.sessStorage.countryCode &&
    window.sessStorage.countryCode === 'US'

  return (
    <>
      <StyledAccountSettingsControls
        height="100%"
        width="100%"
        position="relative"
        flexDirection="row"
        alignItems="flex-end"
        justifyContent="space-between"
        pb={3}
        px={3}
      >
        <FlexBox type="centered-row">
          {!authedAccount?.isBurnerWallet && (
            <Button
              frameType="default"
              colorType="default"
              onClick={handleLogout}
              data-id="logoutButton"
              text={t('profile.logout')}
              leftAdornment={{ icon: 'external' }}
            />
          )}
          <Button
            frameType="default"
            colorType="default"
            onClick={openCookieSettingsDialog}
            text={t('general.cookies')}
            leftAdornment={{ icon: 'eye' }}
            className={Sprinkles({ marginX: '8px' })}
          />
          {(isUS || !!cat3State) && (
            <Button
              frameType="default"
              colorType="default"
              onClick={openStateConfirmationDialog}
              text={t('general.location')}
            />
          )}
        </FlexBox>
      </StyledAccountSettingsControls>
    </>
  )
})

AccountSettingsControls.displayName = 'AccountSettingsControls'

const StyledAccountSettingsControls = styled(FlexBox)`
  background: ${(props) => props.theme.colors.purple2};
  border-top: 1px solid ${(props) => props.theme.colors.purple7};
  pointer-events: none;
  * {
    pointer-events: all;
  }
`
