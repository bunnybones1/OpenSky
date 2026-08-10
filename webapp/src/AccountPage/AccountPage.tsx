import { memo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import { FlexBox } from '~/shared/components/Base/FlexBox'
import { page } from '~/shared/helpers/analytics-old'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { authenticationState } from '~/shared/state/authentication-state'

import { AccountIdentity } from './AccountIdentity/AccountIdentity'
import AccountStats from './AccountStats/AccountStats'

const AccountPage = memo(() => {
  const { t } = useTranslation()

  const { data: authedAccount } = useAuthedAccount()

  const { isInitializing } = useSnapshot(authenticationState)

  const params = useParams<{ address?: string }>()
  const { address } = params

  useEffect(() => {
    // Add conditional event tracking as this will mount but not render every component
    if (!isInitializing && !!authedAccount?.address) {
      page('User Profile', {
        id: address ? address : authedAccount.address,
        externalProfile: Boolean(address)
      })
    }

    document.body.classList.add('scrollBody')

    return () => {
      document.body.classList.remove('scrollBody')
    }
  }, [address, authedAccount?.address, isInitializing, t])

  if (isInitializing) {
    return null
  }

  return (
    <FlexBox
      width="100%"
      minHeight="100%"
      type="centered-start-column"
      bg="purple1"
      flexWrap="nowrap"
      height="auto"
    >
      <AccountIdentity />
      <AccountStats />
    </FlexBox>
  )
})

export default AccountPage

AccountPage.displayName = 'AccountPage'
