import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { Account } from '~/lib/proto'
import { GlobalQueryClient } from '~/shared/clients'
import { APIClient } from '~/shared/clients'
import { getUseAccountKey } from '~/shared/constants/react-query-keys'
import { ONE_HOUR } from '~/shared/constants/time'

import { authenticationState } from '../state/authentication-state'

// This hook fetches and returns a users OpenSky
// account if one exists for the provided address.
export const useAccount = (address?: string) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery<Account | null | undefined>(
    getUseAccountKey(address),
    async () => {
      if (!address) return null

      const { account } = await APIClient.opensky.getAccount({ address })

      if (!account) {
        return null
      } else {
        return account
      }
    },
    {
      enabled: !!userAddress,
      staleTime: ONE_HOUR,
      keepPreviousData: true
    }
  )
}

export const getAccount = (address?: string) => {
  if (!address) return

  return GlobalQueryClient.getQueryData<Account | undefined>(
    getUseAccountKey(address)
  )
}
