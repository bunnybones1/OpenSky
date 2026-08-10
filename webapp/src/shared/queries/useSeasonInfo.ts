import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { SEASON_INFO } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

export const useSeasonInfo = () => {
  return useQuery(
    SEASON_INFO,
    async () => {
      const [
        { res: currentSeason },
        { res: currentSeasonStartTime },
        { res: nextSeasonStartTime }
      ] = await Promise.all([
        APIClient.opensky.getCurrentSeason(),
        APIClient.opensky.getCurrentSeasonStartTime(),
        APIClient.opensky.getNextSeasonTime()
      ])

      return {
        currentSeason,
        currentSeasonStartTime,
        nextSeasonStartTime
      }
    },
    {
      staleTime: ONE_DAY
    }
  )
}
