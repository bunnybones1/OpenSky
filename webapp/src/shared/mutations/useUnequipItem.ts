import { Item, ItemType } from '@opensky/proto'
import { getUngradedID } from '@opensky/shared/assetsIDs'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getEquippedItemsKey } from '~/shared/constants/react-query-keys'

import { authenticationState } from '../state/authentication-state'

export const useUnequipItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async ({ tokenID, itemType }: { tokenID: number; itemType: ItemType }) => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to unequip item for unauthenticated user.')
      }

      return await APIClient.opensky.unequipItem({
        itemType,
        tokenID: getUngradedID(tokenID)
      })
    },
    {
      onSettled: (_, __, { itemType, tokenID }) => {
        if (!!authenticationState.userAddress) {
          queryClient.setQueryData<Item[] | undefined>(
            getEquippedItemsKey(itemType, authenticationState.userAddress),
            (data) => {
              if (!data) return data
              return data.filter((_item) => _item.tokenID !== getUngradedID(tokenID))
            }
          )
        }
      }
    }
  )
}
