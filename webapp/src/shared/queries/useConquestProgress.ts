import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getConquestProgressKey } from '~/shared/constants/react-query-keys'
import { authenticationState } from '~/shared/state/authentication-state'

export const useConquestProgress = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getConquestProgressKey(userAddress),
    async () => {
      const conquestProgress = await APIClient.opensky.conquestV2Progress()

      return conquestProgress.progress
    },
    {
      enabled: !!userAddress
    }
  )
}
