import { useQuery } from '@tanstack/react-query'

import env from '~/env'
import { APIClient } from '~/shared/clients'
import { getCardBalanceOverviewKey } from '~/shared/constants/react-query-keys'
import { formatAccountBalances } from '~/shared/helpers/account/format-account-balances'

import { FIVE_SECONDS } from '../../constants/time'

export const cardBalanceOverviewFetcher = (address?: string) => async () => {
  if (!address) return null
  const { res } = await APIClient.opensky.getCardOwnership({
    accountAddress: address,
    contractQuery: env.DIRECT_BALANCE_FETCH
  })

  return formatAccountBalances(res)
}

export const useCardBalanceOverview = ({ address }: { address?: string }) => {
  return useQuery(
    getCardBalanceOverviewKey(address),
    cardBalanceOverviewFetcher(address),
    {
      refetchInterval: FIVE_SECONDS * 2,
      staleTime: FIVE_SECONDS * 2,
      enabled: !!address
    }
  )
}
