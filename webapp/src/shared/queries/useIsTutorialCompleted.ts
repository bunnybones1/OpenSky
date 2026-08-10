import { UserStorageKeys } from '@opensky/shared/constants'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { authenticationState } from '~/shared/state/authentication-state'

import { APIClient } from '../clients'
import { getUserStorageKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

export const useIsTutorialCompleted = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getUserStorageKey(UserStorageKeys.TUTORIAL_PROGRESS, userAddress),
    queryFn: async () => {
      const { object } = await APIClient.opensky.userStorageFetch({
        key: UserStorageKeys.TUTORIAL_PROGRESS
      })

      return Array.isArray(object) && object.length >= 1
    },
    staleTime: ONE_DAY,
    enabled: !!userAddress
  })
}
