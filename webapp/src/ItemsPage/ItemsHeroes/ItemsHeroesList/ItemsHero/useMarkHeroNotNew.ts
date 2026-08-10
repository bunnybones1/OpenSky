import { ItemType } from '@opensky/proto'
import { getItemType } from '@opensky/shared/assetsIDs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { APIClient } from '~/shared/clients'
import { getTokenBalancesKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'
import { BalanceItem } from '~/shared/types/market'

export const useMarkHerosNotNew = () => {
  const queryClient = useQueryClient()

  const flipIsNew = useCallback(
    (tokenIds: number[], newIsNew: boolean) => {
      tokenIds.forEach((id) => {
        const itemType = getItemType(id)

        if (itemType === ItemType.SW_HERO_SKINS) {
          queryClient.setQueryData<BalanceItem[] | null | undefined>(
            getTokenBalancesKey(
              ItemType.SW_HERO_SKINS,
              authenticationState.userAddress
            ),
            (data) => {
              if (!data) return data

              return data.map((item) => {
                if (tokenIds.includes(item.tokenID)) {
                  return { ...item, isNew: newIsNew }
                }
                return item
              })
            }
          )
        }
      })
    },
    [queryClient]
  )

  return useMutation(
    async (tokenIDs: number[], shouldDelay?: boolean) => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to update new items for unauthenticated user.')
      }

      await APIClient.opensky.markItemsNotNew({
        tokenIDs,
        immediately: !shouldDelay
      })
    },
    {
      onMutate(tokenIds) {
        flipIsNew(tokenIds, false)
      },
      onError(error) {
        captureError(error, 'Failed to mark items not new')
      }
    }
  )
}
