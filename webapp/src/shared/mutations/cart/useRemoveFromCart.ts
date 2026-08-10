import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getCartKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'
import { CartItem } from '~/shared/types/market'

interface RemoveFromCartArgs {
  tokenId: CartItem['tokenId']
  side: CartItem['side']
}

const getUpdatedCart = (
  currentCart: CartItem[] | undefined | null,
  newItems: RemoveFromCartArgs[]
) => {
  if (!currentCart) return currentCart

  let toReturn = currentCart

  newItems.forEach((newItem) => {
    toReturn = toReturn.filter((item) => {
      if (item.tokenId === newItem.tokenId && item.side === newItem.side) {
        return false
      }

      return true
    })
  })

  return toReturn
}

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient()

  const { userAddress } = useSnapshot(authenticationState)

  return useMutation(
    async (items: RemoveFromCartArgs[]) => {
      if (!userAddress) return
      const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
        getCartKey(userAddress)
      )

      const updatedCart = getUpdatedCart(currentCart, items)

      await APIClient.opensky.userStorageSave({
        key: UserStorageKeys.SHOPPING_CART,
        object: { cart: updatedCart }
      })
    },
    {
      onMutate: (items) => {
        if (!!userAddress) {
          const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
            getCartKey(userAddress)
          )

          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(userAddress),
            (data) => getUpdatedCart(data, items)
          )

          return { currentCart }
        }
        return { currentCart: undefined }
      },
      onError: (error, _, context) => {
        if (!!userAddress && !!context) {
          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(userAddress),
            context.currentCart
          )
        }
        captureError(error, 'Error adding item to cart', true, true)
      }
    }
  )
}
