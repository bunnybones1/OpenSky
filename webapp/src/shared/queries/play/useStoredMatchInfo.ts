import { UserStorageKeys } from '@opensky/shared/constants'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getStoredMatchInfoKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'
import { StoredGameInfo } from '~/shared/types/play'

export const useStoredMatchInfo = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getStoredMatchInfoKey(userAddress),
    queryFn: async () => {
      const { object } = await APIClient.opensky.userStorageFetch({
        key: UserStorageKeys.GAME_INFO
      })
      return object as StoredGameInfo
    },
    enabled: !!userAddress,
    staleTime: ONE_DAY
  })
}
