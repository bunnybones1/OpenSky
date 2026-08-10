import { GameMode } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { authenticationState } from '~/shared/state/authentication-state'

import { APIClient } from '../clients'
import { getAccountLeaderBoardKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

export const useAccountLeaderboard = (gameMode: GameMode, season?: number) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getAccountLeaderBoardKey(gameMode, season),
    queryFn: async () => {
      if (!userAddress) {
        throw new Error('Cant fetch account leaderboard without authed user.')
      }

      const { res } = await APIClient.opensky.accountLeaderboard({
        req: {
          accountAddress: userAddress,
          gameMode: gameMode,
          season: season
        }
      })

      return res
    },
    retry: false,
    enabled: !!userAddress && season !== undefined,
    staleTime: ONE_DAY
  })
}
