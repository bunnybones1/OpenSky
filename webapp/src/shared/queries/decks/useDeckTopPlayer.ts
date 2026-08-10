import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getDeckTopPlayerKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

export const useDeckTopPlayerAddress = (deckString: string) => {
  return useQuery(
    getDeckTopPlayerKey(deckString),
    async () => {
      const { res } = await APIClient.opensky.searchDeckRanks({
        req: { deckString }
      })
      if (!res.length) return null

      return res[0].highestPlayerAddress
    },
    {
      staleTime: ONE_DAY
    }
  )
}
