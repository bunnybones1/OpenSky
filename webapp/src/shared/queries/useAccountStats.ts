import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getAccountStatsKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

export const useAccountStats = (address?: string) => {
  return useQuery(
    getAccountStatsKey(address),
    async () => {
      if (!address) return
      const stats = await APIClient.opensky.getAccountStats({ address })

      return stats
    },
    { enabled: !!address, staleTime: ONE_DAY }
  )
}
