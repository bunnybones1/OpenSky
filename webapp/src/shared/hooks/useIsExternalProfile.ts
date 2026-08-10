import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { authenticationState } from '~/shared/state/authentication-state'

import { useActiveAccount } from './useActiveAccount'

export const useIsExternalProfile = () => {
  const { data: activeAccount } = useActiveAccount()
  const { userAddress } = useSnapshot(authenticationState)

  return useMemo(() => {
    return !!activeAccount && !!userAddress && activeAccount.address !== userAddress
  }, [activeAccount, userAddress])
}
