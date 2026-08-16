import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { NEXT_REWARDS_TIME } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

export const useNextRewardsTime = (enabled = true) => {
  return useQuery(
    NEXT_REWARDS_TIME,
    async () => {
      const { res } = await APIClient.opensky.getNextRewardsTime()
      return new Date(res).toISOString()
    },
    {
      enabled,
      retry: false,
      staleTime: ONE_DAY
    }
  )
}
