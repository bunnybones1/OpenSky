import { Page } from '@opensky/proto'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { authenticationState } from '~/shared/state/authentication-state'

import { APIClient } from '../clients'
import { getPlayerLeaderboardKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'
import { playerLeaderboardUIState } from '../state/player-leaderboard/player-leaderboard-ui-state'
import { UsePlayerLeaderboardArgs } from '../types/leaderboard'

export const usePlayerLeaderboard = (args: UsePlayerLeaderboardArgs) => {
  const { isPlayer } = useSnapshot(playerLeaderboardUIState)
  const { userAddress } = useSnapshot(authenticationState)

  return useInfiniteQuery({
    queryKey: getPlayerLeaderboardKey(args),
    queryFn: async ({ pageParam }) => {
      let pageReq: Page = {
        pageSize: 25
      }

      if (!!pageParam) {
        pageReq = { ...pageReq, ...pageParam }
      }

      const { page, res } = await APIClient.opensky.listLeaderboard({
        req: args,
        page: pageReq
      })
      return {
        page,
        list: res
      }
    },
    retry: false,
    enabled: !!userAddress && !!args.season && !isPlayer,
    staleTime: ONE_DAY,
    getNextPageParam: (currentPage) => {
      if (!!currentPage?.page?.hasBefore && !!currentPage?.page?.after) {
        return { before: currentPage.page.after }
      }

      return undefined
    }
  })
}
