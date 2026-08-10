import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { FEATURED_STREAMERS } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

export const useFeaturedStreamers = () => {
  return useQuery(
    FEATURED_STREAMERS,
    async () => {
      const featuredStreamers = await APIClient.opensky.getFeaturedStreamers()

      return featuredStreamers.streamers.map((streamer) => streamer.username)
    },
    {
      staleTime: ONE_DAY
    }
  )
}
