import { memo } from 'react'

import { FlexBox } from '~/shared/components/Base'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'

import { InvitedByInput } from './InvitedByInput/InvitedByInput'
import { InvitedByUser } from './InvitedByUser/InvitedByUser'

export const InvitedBy = memo(() => {
  const { data: authedAccount } = useAuthedAccount()

  return (
    <FlexBox
      width="100%"
      bg="purple3"
      borderStyle="solid"
      borderBottomWidth={[0, 0, 0, 1]}
      borderColor="purple7"
      height={[144, 144, 144, 184]}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      {!!authedAccount?.invitedBy ? (
        <InvitedByUser invitedBy={authedAccount.invitedBy} />
      ) : (
        <InvitedByInput />
      )}
    </FlexBox>
  )
})

InvitedBy.displayName = 'InvitedBy'
