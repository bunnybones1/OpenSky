import { ItemType } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getSkyTagTitleBalancesKey } from '~/shared/constants/react-query-keys'
import { authenticationState } from '~/shared/state/authentication-state'

export const skyTagTitleBalanceFetcher = (address?: string) => async () => {
  if (!address) return null

  const { items } = await APIClient.opensky.getItemOwnershipByType({
    itemTypes: [ItemType.SW_TITLES],
    accountAddress: address ? address : undefined
  })

  return items
}

export type SkyTagTitleBalances =
  | Awaited<ReturnType<ReturnType<typeof skyTagTitleBalanceFetcher>>>
  | undefined

export const useSkyTagTitleBalances = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getSkyTagTitleBalancesKey(userAddress),
    skyTagTitleBalanceFetcher(userAddress),
    {
      staleTime: 10000,
      enabled: !!userAddress,
      refetchInterval: 10000
    }
  )
}

export const useSkyTagTitleBalance = (id: number) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getSkyTagTitleBalancesKey(userAddress),
    skyTagTitleBalanceFetcher(userAddress),
    {
      select: (data) => {
        if (!data) return

        const title = data.find((_title) => _title.tokenID === id)

        if (!title?.balance) return null

        return {
          balance: Number(title.balance),
          isNew: title.isNew
        }
      },
      notifyOnChangeProps: ['data', 'error'],
      staleTime: 10000,
      enabled: !!userAddress,
      refetchInterval: 10000
    }
  )
}
