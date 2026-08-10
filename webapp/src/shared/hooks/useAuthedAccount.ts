import { useSnapshot } from 'valtio'

import { getAccount, useAccount } from '~/shared/queries/useAccount'

import { authenticationState } from '../state/authentication-state'

export const useAuthedAccount = () => {
  const { userAddress } = useSnapshot(authenticationState)
  return useAccount(userAddress)
}

export const getAuthedAccount = () => {
  return getAccount(authenticationState.userAddress)
}
