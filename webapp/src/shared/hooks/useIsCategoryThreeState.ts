import { UserStorageKeys } from '@opensky/shared/constants'
import { useMemo } from 'react'

import { GlobalQueryClient } from '~/shared/clients'

import { getUserStorageKey } from '../constants/react-query-keys'
import { useUserStorage } from '../queries/useUserStorage'
import { authenticationState } from '../state/authentication-state'

const Cat3States: string[] = []

export const useIsCategoryThreeState = () => {
  const { data: cat3State } = useUserStorage(UserStorageKeys.CATEGORY_THREE_STATE)

  return useMemo(() => {
    if (!cat3State?.state) return false
    return Cat3States.includes(cat3State.state)
  }, [cat3State])
}

export const getIsCat3State = () => {
  const address = authenticationState.userAddress

  if (!address) return false

  const cat3State = GlobalQueryClient.getQueryData<any | undefined>(
    getUserStorageKey(UserStorageKeys.CATEGORY_THREE_STATE, address)
  )

  if (!cat3State?.state) return false

  return Cat3States.includes(cat3State.state)
}
