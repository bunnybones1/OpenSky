import styled from '@emotion/styled'
import { memo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

import { AuthenticationClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { CONVERT_TO_SEQUENCE_WALLET_DIALOG } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'

const { openDialog } = controlDialog(CONVERT_TO_SEQUENCE_WALLET_DIALOG)

export const WalletWidget = memo(() => {
  const location = useLocation()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { data: authedAccount } = useAuthedAccount()

  const onClick = useCallback(() => {
    if (!authedAccount) return
    if (authedAccount.isBurnerWallet) {
      openDialog()
    } else {
      AuthenticationClient.wallet?.openWalletWindow()
    }
  }, [authedAccount])

  if (
    !isTabletWide ||
    !authedAccount ||
    location.pathname.includes('/hero/') ||
    location.pathname.includes('/skypass') ||
    location.pathname.includes('/sticker/') ||
    location.pathname.includes('/cardback/')
  ) {
    return null
  }

  return (
    <WidgetButton
      onClick={onClick}
      as="button"
      type="centered-row"
      width={60}
      height={60}
      borderRadius={60}
      border="2px solid"
      borderColor="purple1"
      bg="purple5"
      overflow="visible"
      mt="16px"
      data-id="wallet-widget-button"
    >
      <Icon
        height="24px"
        type={authedAccount.isBurnerWallet ? 'wallet' : 'wallet-full'}
        color="white"
      />
    </WidgetButton>
  )
})

WalletWidget.displayName = 'WalletWidget'

const WidgetButton = styled<any>(FlexBox)`
  border: none;
  cursor: pointer;
  pointer-events: auto;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  :hover {
    background-color: ${({ theme }) => theme.colors.purple7};
    filter: drop-shadow(0 0 10px ${(props) => props.theme.colors.purple10});
  }
`
