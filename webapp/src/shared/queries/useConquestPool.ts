import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { authenticationState } from '~/shared/state/authentication-state'

import { getConquestPoolKey } from '../constants/react-query-keys'

export const useConquestPool = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getConquestPoolKey(userAddress),
    async () => {
      const conquestPool = await APIClient.opensky.conquestV2Pool()

      return {
        conquestTotalPool: conquestPool.pool.amount as number,
        conquestTotalWeight: conquestPool.pool.totalWeight as number
      }
    },
    {
      enabled: !!userAddress
    }
  )
}
