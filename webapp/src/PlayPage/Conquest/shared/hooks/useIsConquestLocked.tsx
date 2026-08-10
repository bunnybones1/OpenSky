import { PlayerRank } from '@opensky/proto'
import { useMemo } from 'react'

import { isConquestLocked } from '~/shared/constants/play'
import { useAccountsHighestRank } from '~/shared/hooks/useAccountsHighestRank'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'

export const useIsConquestLocked = () => {
  const { data: authedAccount } = useAuthedAccount()
  const highestRank = useAccountsHighestRank(authedAccount)

  return useMemo(() => {
    if (!highestRank) return true

    return isConquestLocked(highestRank.rank ?? PlayerRank.TRAINEE)
  }, [highestRank])
}
