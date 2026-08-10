import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { QUESTS_TIMER } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

export const useQuestTimers = () => {
  return useQuery({
    queryKey: QUESTS_TIMER,
    queryFn: async () => {
      const { res } = await APIClient.opensky.getQuestsAutoRerollTime()
      return res
    },
    staleTime: ONE_DAY
  })
}
