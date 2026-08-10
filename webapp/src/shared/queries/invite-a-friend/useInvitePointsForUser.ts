import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { FriendPoints } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getInvitePointsKey } from '~/shared/constants/react-query-keys'
import { THIRTY_MINUTES } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export interface InvitePointsForUser {
  total: number
  friends: FriendPoints[]
}

export const useInvitePointsForUser = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery<InvitePointsForUser | undefined>(
    getInvitePointsKey(userAddress),
    () => {
      if (!userAddress) return

      return APIClient.opensky.getFriendPoints({ address: userAddress })
    },
    {
      enabled: !!userAddress,
      staleTime: THIRTY_MINUTES
    }
  )
}
