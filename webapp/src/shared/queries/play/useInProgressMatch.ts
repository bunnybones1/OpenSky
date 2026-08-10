import { MATCHMAKER_MATCH_INFO_ENDPOINT } from '@opensky/shared/constants'
import { PlayerMatchInfo } from '@opensky/shared/matchmaker-message-types'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'
import env from '~/env'
import { APIClient } from '~/shared/clients'
import { getInProgressMatchKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const useInProgressMatch = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getInProgressMatchKey(userAddress),
    queryFn: async () => {
      if (!userAddress) return null

      const url = `
        http${new URL(
          `${MATCHMAKER_MATCH_INFO_ENDPOINT}/${userAddress.toLowerCase()}${
            new URL(env.MATCHMAKER_URL).search
          }`,
          env.MATCHMAKER_URL
        ).href.slice(2)}
      `

      const requestExtra: { [key: string]: any } = {
        mode: 'cors',
        credentials: 'include',
        headers: {
          Authorization: `BEARER ${APIClient.opensky.authToken}`
        }
      }

      const res = await fetch(url, requestExtra)
      res.status
      const data = (await res.json()) as PlayerMatchInfo

      if (data.type === 'error') {
        throw new Error(data.message)
      }

      if (data.type === 'in_progress_match_info' && data.disconnectTimeout > 0) {
        return {
          mode: data.matchInfo.mode,
          version: data.matchInfo.version,
          status: MatchMakerStatus.IN_PROGRESS_MATCH,
          disconnectTimeout: data.disconnectTimeout
        }
      }

      return null
    },
    enabled: !!userAddress,
    staleTime: ONE_DAY
  })
}
