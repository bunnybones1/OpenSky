import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'

import { CONQUEST_TREASURE_INFO } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'
import { authenticationState } from '../state/authentication-state'

interface ConquestTreasureInfo {
  [key: number]: {
    amountSilver: number
    amountUSDC: number
  }
}

export const useConquestTreasureInfo = () => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery<ConquestTreasureInfo>(
    CONQUEST_TREASURE_INFO,
    async () => {
      const { treasures } = await APIClient.opensky.conquestTreasuresInfo()
      return treasures
    },
    {
      staleTime: ONE_DAY,
      enabled: !!userAddress
    }
  )
}
