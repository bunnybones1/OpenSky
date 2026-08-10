import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

import { MOCK_SHOP_ITEMS } from './mock-data'

const SHOP_SECTIONS_KEY = 'SHOP_ITEMS'

const getShopSectionsKey = (address?: string) =>
  !!address
    ? [SHOP_SECTIONS_KEY, { address: address.toLowerCase() }]
    : [SHOP_SECTIONS_KEY]

export const useShopSections = () => {
  const { userAddress, isInitializing } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getShopSectionsKey(userAddress),
    queryFn: async () => {
      return MOCK_SHOP_ITEMS
    },
    staleTime: ONE_DAY,
    enabled: !!userAddress && !isInitializing
  })
}

export const useShopSection = (id?: string) => {
  const { userAddress, isInitializing } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getShopSectionsKey(userAddress),
    queryFn: async () => {
      return MOCK_SHOP_ITEMS
    },
    staleTime: ONE_DAY,
    enabled: !!userAddress && !isInitializing && !!id,
    select: (data) => {
      if (!data) return data
      const section = data.find((_section) => _section.id === id)

      return section || null
    }
  })
}
