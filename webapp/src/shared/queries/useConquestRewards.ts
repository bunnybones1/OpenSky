import { getUngradedID } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getConquestRewardsKey } from '~/shared/constants/react-query-keys'
import { authenticationState } from '~/shared/state/authentication-state'

export const useConquestRewards = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getConquestRewardsKey(userAddress),
    async () => {
      const conquestRewards = await APIClient.opensky.conquestRewards()

      const conquestRewardsUngradedIDs = [] as number[]

      conquestRewards.weeklyGolds.map((gold) => {
        conquestRewardsUngradedIDs.push(getUngradedID(gold.tokenId))
      })

      return {
        rewards: conquestRewards,
        ungradedIds: conquestRewardsUngradedIDs
      }
    },
    {
      enabled: !!userAddress
    }
  )
}
