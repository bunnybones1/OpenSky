import { ItemType } from '@opensky/proto'
import { getUngradedID } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { authenticationState } from '~/shared/state/authentication-state'

import { APIClient } from '../clients'
import { getEquippedItemsKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

const equippedItemsFetcher = (itemType: ItemType) => async () => {
  const { items } = await APIClient.opensky.listEquippedItems({ itemType })
  return items
}

export const useEquippedItems = (itemType: ItemType) => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(
    getEquippedItemsKey(itemType, userAddress),
    equippedItemsFetcher(itemType),
    {
      staleTime: ONE_DAY,
      enabled: !!userAddress
    }
  )
}

export const useEquippedItem = (tokenId: number, itemType: ItemType) => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(
    getEquippedItemsKey(itemType, userAddress),
    equippedItemsFetcher(itemType),
    {
      staleTime: ONE_DAY,
      enabled: !!userAddress,
      select: (data) => {
        if (!data) return data
        const item = data.find((_item) => _item.tokenID === getUngradedID(tokenId))

        if (!item) return null

        return item
      }
    }
  )
}
