import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { authenticationState } from '~/shared/state/authentication-state'

import { getConquestStatsKey } from '../constants/react-query-keys'

export const useConquestStats = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getConquestStatsKey(userAddress),
    () => APIClient.opensky.conquestStats(),
    {
      enabled: !!userAddress
    }
  )
}
