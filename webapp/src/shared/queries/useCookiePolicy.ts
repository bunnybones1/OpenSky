import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getCookiePolicyKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const useCookiePolicy = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getCookiePolicyKey(userAddress),
    async () => {
      const { res } = await APIClient.opensky.getCookiePolicy()
      return res
    },
    {
      enabled: !!userAddress,
      staleTime: ONE_DAY,
      retry: false
    }
  )
}
