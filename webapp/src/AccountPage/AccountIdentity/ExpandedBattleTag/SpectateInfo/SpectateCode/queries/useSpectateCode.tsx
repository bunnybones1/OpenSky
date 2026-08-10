import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getSpectateCodeKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

/**
 * Returns the currently authenticated users private spectate code.
 *
 * Uses query key `['SPECTATE_CODE', { address }]` where "address"
 * is the authenticated users address.
 *
 */
export const useSpectateCode = () => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(
    getSpectateCodeKey(userAddress),
    async () => {
      const { code } = await APIClient.opensky.getPrivateSpectateCode({
        reset: false
      })
      return code
    },
    {
      staleTime: ONE_DAY,
      enabled: !!userAddress
    }
  )
}
