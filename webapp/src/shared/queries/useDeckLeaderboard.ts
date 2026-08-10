import { DeckClass } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'

import { APIClient } from '../clients'
import { getDeckLeaderboardKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

export const useDeckLeaderboard = (deckClass?: DeckClass) => {
  return useQuery(
    getDeckLeaderboardKey(deckClass),
    async () => {
      const { res } = await APIClient.opensky.listDeckRanks({
        req: !!deckClass ? { class: deckClass } : {},
        page: {
          pageSize: 20
        }
      })
      return res
    },
    {
      staleTime: ONE_DAY
    }
  )
}
