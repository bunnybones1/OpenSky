import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { NON_TRADABLE_TICKET_ID, TRADABLE_TICKET_ID } from '~/shared/constants/market'
import { getConquestAndUSDCBalancesKey } from '~/shared/constants/react-query-keys'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'

import { authenticationState } from '../state/authentication-state'

export type ConquestTicketTokenBalances = {
  tradable?: number
  nonTradable?: number
  total: number
}

export const conquestTicketsBalanceFetcher = async (address?: string) => {
  if (!address) return null

  const { items } = await APIClient.opensky.getItemOwnershipByType({
    itemTypes: [ItemType.SW_CONQUEST_TICKET],
    accountAddress: address
  })

  let tradable = 0
  let nonTradable = 0

  items.forEach((item) => {
    switch (item.tokenID) {
      case TRADABLE_TICKET_ID:
        tradable = Number(item.balance)
        break
      case NON_TRADABLE_TICKET_ID:
        nonTradable = Number(item.balance)
        break
    }
  })

  return { tradable, nonTradable, total: tradable + nonTradable }
}

export const conquestAndUSDCBalanceFetcher = (address?: string) => async () => {
  if (!address) return

  let USDCBalance = 0
  let conquestTicketBalance: ConquestTicketTokenBalances = {
    tradable: 0,
    nonTradable: 0,
    total: 0
  }

  const { summary } = await APIClient.opensky.getItemSummary({
    accountAddress: address
  })

  conquestTicketBalance = (await conquestTicketsBalanceFetcher(
    address
  )) as ConquestTicketTokenBalances

  const tokenSummary = summary[ItemType.USDC]
  const conquestTicketSummary = summary[ItemType.SW_CONQUEST_TICKET]

  if (tokenSummary) {
    // Fix this when amount confirmed is fixed.
    USDCBalance = formatUSDCBalance(tokenSummary.totalBalance)
  }
  if (conquestTicketSummary) {
    conquestTicketBalance.total = parseInt(conquestTicketSummary.totalBalance)
  }

  return {
    USDCBalance,
    conquestTicketBalance
  }
}

export const useConquestAndUSDCBalances = (poll?: boolean) => {
  const { userAddress, isInitializing } = useSnapshot(authenticationState)

  return useQuery(
    getConquestAndUSDCBalancesKey(userAddress),
    conquestAndUSDCBalanceFetcher(userAddress),
    {
      refetchInterval: !!poll ? 10000 : undefined,
      staleTime: 10000,
      enabled: !!userAddress && !isInitializing
    }
  )
}
