import { useQuery } from '@tanstack/react-query'
import uniqWith from 'lodash-es/uniqWith'

import { DeckClass, SortOrder } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getMarketDecksKey } from '~/shared/constants/react-query-keys'
import { THIRTY_MINUTES } from '~/shared/constants/time'
import { MARKET_DECK_COLUMN_TYPE } from '~/shared/types/market'

interface UseMarketDecksParams {
  deckClass?: DeckClass
  column: MARKET_DECK_COLUMN_TYPE
}

export const useMarketDecks = ({ deckClass, column }: UseMarketDecksParams) => {
  return useQuery(
    getMarketDecksKey(column, deckClass),
    async () => {
      const { res } = await APIClient.opensky.searchDeckRanks({
        req: { classes: !!deckClass ? [deckClass] : undefined },
        page: {
          pageSize: 50,
          sort: [
            {
              column,
              order: SortOrder.DESC
            }
          ]
        }
      })
      return uniqWith(res, (deck1, deck2) => deck1.deckString === deck2.deckString)
    },
    {
      staleTime: THIRTY_MINUTES
    }
  )
}
