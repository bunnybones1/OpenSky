import { UserStorageKeys } from '@opensky/shared/constants'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { GlobalQueryClient } from '~/shared/clients'
import { APIClient } from '~/shared/clients'
import { getUserStorageKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const userStorageFetcher =
  (key: UserStorageKeys, address?: string) => async () => {
    if (!address) return undefined
    const { object } = await APIClient.opensky.userStorageFetch({ key })
    return object
  }

export const useUserStorage = (key: UserStorageKeys) => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(
    getUserStorageKey(key, userAddress),
    userStorageFetcher(key, userAddress),
    {
      staleTime: ONE_DAY,
      enabled: !!userAddress
    }
  )
}

export const getUserStorage = async (key: UserStorageKeys) => {
  if (!!authenticationState.userAddress) {
    const storedValue = GlobalQueryClient.getQueryData<any | undefined>(
      getUserStorageKey(key, authenticationState.userAddress)
    )

    if (!!storedValue) return storedValue

    return await userStorageFetcher(key, authenticationState.userAddress)()
  } else {
    throw new Error('tried to fetch user storage of unauthed user')
  }
}
