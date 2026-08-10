import { DeckClass, Page } from '@opensky/proto'
import { useInfiniteQuery } from '@tanstack/react-query'
import { produce } from 'immer'

import { APIClient } from '../clients'
import { getMatchHistoryKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

export const useMatchHistory = (address?: string) => {
  return useInfiniteQuery({
    queryKey: getMatchHistoryKey(address),
    queryFn: async ({ pageParam }) => {
      if (!!address) {
        let pageReq: Page = {
          pageSize: 5
        }

        if (!!pageParam) {
          pageReq = { ...pageReq, ...pageParam }
        }

        const { res, page } = await APIClient.opensky.listMatches({
          page: pageReq,
          req: {
            accountAddress: address
          }
        })

        return {
          page,
          list: res.map((match) => {
            return produce(match, (draft) => {
              draft.player1.deckClass = match.player1DeckClass || DeckClass.STR
              draft.player2.deckClass = match.player2DeckClass || DeckClass.STR
            })
          })
        }
      }
      return null
    },
    enabled: !!address,
    retry: false,
    staleTime: ONE_DAY,
    getNextPageParam: (currentPage) => {
      if (!!currentPage?.page?.hasBefore && !!currentPage?.page?.after) {
        return { before: currentPage.page.after }
      }

      return undefined
    }
  })
}
