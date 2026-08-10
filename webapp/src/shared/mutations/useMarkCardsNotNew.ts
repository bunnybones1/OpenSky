import { ItemType } from '@opensky/proto'
import { getItemType, getUngradedID } from '@opensky/shared/assetsIDs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { APIClient } from '~/shared/clients'
import { getTokenBalancesKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'

import { authenticationState } from '../state/authentication-state'
import { BalanceItem } from '../types/market'

export const useMarkCardsNotNew = () => {
  const queryClient = useQueryClient()

  const flipIsNew = useCallback(
    (tokenIds: number[], newIsNew: boolean) => {
      tokenIds.forEach((id) => {
        const grade = getItemType(id)

        if (
          (grade === ItemType.SW_BASE_CARDS ||
            grade === ItemType.SW_SILVER_CARDS ||
            grade === ItemType.SW_GOLD_CARDS) &&
          !!authenticationState.userAddress
        ) {
          queryClient.setQueryData<BalanceItem[] | null | undefined>(
            getTokenBalancesKey(grade, authenticationState.userAddress),
            (data) => {
              if (!data) return data

              return data.map((balance) => {
                if (balance.tokenID === id) {
                  return {
                    ...balance,
                    isNew: newIsNew
                  }
                }
                return balance
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

      const ids = tokenIDs.map((id) => {
        const grade = getItemType(id)
        if (grade === ItemType.SW_BASE_CARDS) return getUngradedID(id)
        return id
      })

      await APIClient.opensky.markItemsNotNew({
        tokenIDs: ids,
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
