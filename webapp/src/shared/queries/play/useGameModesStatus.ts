import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { GAME_MODES_STATUS } from '~/shared/constants/react-query-keys'

export const gameModesStatusFetcher = async () => {
  const { status } = await APIClient.opensky.getGameModesStatus()
  return status
}

export const useGameModesStatus = () =>
  useQuery({
    queryFn: gameModesStatusFetcher,
    queryKey: GAME_MODES_STATUS,
    staleTime: 10000,
    refetchInterval: 10000
  })
