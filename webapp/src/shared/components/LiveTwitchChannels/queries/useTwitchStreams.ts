import { useQuery } from '@tanstack/react-query'

import { TwitchStream } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { LIVE_TWITCH_STREAMS } from '~/shared/constants/react-query-keys'
import { TEN_MINUTES } from '~/shared/constants/time'

import { OPTIONAL_TWITCH_QUERY_RETRY } from '../twitchAvailability'

export const useTwitchStreams = () => {
  return useQuery<null | TwitchStream[]>(
    LIVE_TWITCH_STREAMS,
    async () => (await APIClient.opensky.getTwitchInfo()).data.streams,
    {
      staleTime: TEN_MINUTES,
      retry: OPTIONAL_TWITCH_QUERY_RETRY
    }
  )
}
