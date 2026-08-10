import { SortOrder } from '@opensky/proto'
import { getUngradedID } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { ONE_DAY } from '~/shared/constants/time'

const RELATED_DECKS = 'RELATED_DECKS'

const getRelatedDecksKey = (baseId?: number) =>
  !!baseId ? [RELATED_DECKS, { baseId }] : [RELATED_DECKS]

export const useRelatedDecks = (id?: number) => {
  return useQuery(
    getRelatedDecksKey(id ? getUngradedID(id) : undefined),
    async () => {
      if (!id) return null
      const { res: decks } = await APIClient.opensky.searchDeckRanks({
        req: {
          withCards: [getUngradedID(id)]
        },
        page: {
          pageSize: 6,
          sort: [
            {
              column: 'score',
              order: SortOrder.DESC
            }
          ]
        }
      })
      return decks
    },
    {
      enabled: !!id,
      staleTime: ONE_DAY
    }
  )
}
