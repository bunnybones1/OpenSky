import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getGiftedPointsKey } from '~/shared/constants/react-query-keys'
import { THIRTY_SECONDS } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const usePointsGifted = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getGiftedPointsKey(userAddress),
    () => {
      if (!userAddress) return
      return APIClient.opensky.getPointsGifted({ address: userAddress })
    },
    {
      enabled: !!userAddress,
      staleTime: THIRTY_SECONDS * 2
    }
  )
}
