import { DeckClass } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient, GlobalQueryClient } from '~/shared/clients'
import { getDeckClassUnlockStatusKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const useUnlockedDeckClasses = () => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(
    getDeckClassUnlockStatusKey(userAddress),
    async () => {
      const res = await APIClient.opensky.listUnlockedDeckClasses()
      return res.deckClass
    },
    {
      enabled: !!userAddress,
      staleTime: ONE_DAY
    }
  )
}

export const getDeckClassUnlockStatus = () => {
  if (!authenticationState.userAddress) return null

  const unlockedClasses = GlobalQueryClient.getQueryData<DeckClass[] | undefined>(
    getDeckClassUnlockStatusKey(authenticationState.userAddress)
  )

  return unlockedClasses || null
}
