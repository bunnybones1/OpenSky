import { Item, ItemType } from '@opensky/proto'
import { getUngradedID } from '@opensky/shared/assetsIDs'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getEquippedItemsKey } from '~/shared/constants/react-query-keys'

import { captureError } from '../helpers/sentry'
import { authenticationState } from '../state/authentication-state'

export const useEquipItem = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async ({ tokenID, itemType }: { tokenID: number; itemType: ItemType }) => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to equip item for unauthenticated user.')
      }

      return await APIClient.opensky.equipItem({
        itemType,
        tokenID: getUngradedID(tokenID)
      })
    },
    {
      onSuccess: (res, { itemType }) => {
        if (!!authenticationState.userAddress && res?.item) {
          queryClient.setQueryData<Item[] | undefined>(
            getEquippedItemsKey(itemType, authenticationState.userAddress),
            (data) => {
              if (!data) return [res.item]

              return [...data, res.item]
            }
          )
        }
      },
      onError: (error) => {
        captureError(error, 'Unable to equip item')
      }
    }
  )
}
