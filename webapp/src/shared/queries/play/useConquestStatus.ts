import { ConquestMatchResult } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getConquestStatusKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const conquestStatusFetcher = async () => {
  const { conquest } = await APIClient.opensky.conquestStatus()

  if (!conquest) return null

  return {
    ...conquest,
    wins: conquest.matchProgress
      ? Object.values(conquest.matchProgress).filter(
          (v) => v === ConquestMatchResult.WIN
        ).length
      : 0,
    losses: conquest.matchProgress
      ? Object.values(conquest.matchProgress).filter(
          (v) => v === ConquestMatchResult.LOSS
        ).length
      : 0,
    draws: conquest.matchProgress
      ? Object.values(conquest.matchProgress).filter(
          (v) => v === ConquestMatchResult.DRAW
        ).length
      : 0,
    matches: conquest.matchProgress ? Object.values(conquest.matchProgress).length : 0
  }
}

export const useConquestStatus = (enabled = true) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryFn: conquestStatusFetcher,
    queryKey: getConquestStatusKey(userAddress),
    enabled: enabled && !!userAddress,
    staleTime: ONE_DAY
  })
}
