import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { HERO_UNLOCK_LEVELS } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

import { authenticationState } from '../state/authentication-state'

export const heroUnlockLevelFetcher = async () => {
  const { res } = await APIClient.opensky.deckClassUnlockLevels()
  return res
}

export const useHeroUnlockLevels = () => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(HERO_UNLOCK_LEVELS, heroUnlockLevelFetcher, {
    enabled: !!userAddress,
    staleTime: ONE_DAY
  })
}
