import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getCartKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'
import { CartItem } from '~/shared/types/market'

const getUpdatedCart = (
  currentCart: CartItem[] | undefined | null,
  newItem: CartItem
) => {
  if (!currentCart) return currentCart

  const isInCart = currentCart.some(
    (item) => item.tokenId === newItem.tokenId && item.side === newItem.side
  )

  if (isInCart) {
    return currentCart.map((item) => {
      if (item.tokenId === newItem.tokenId && item.side === newItem.side) {
        return {
          ...item,
          amount: newItem.amount
        }
      }
      return item
    })
  } else {
    return currentCart
  }
}

export const useUpdateCartItemAmount = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (item: CartItem) => {
      if (!authenticationState.userAddress) return
      const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
        getCartKey(authenticationState.userAddress)
      )

      const updatedCart = getUpdatedCart(currentCart, item)

      await APIClient.opensky.userStorageSave({
        key: UserStorageKeys.SHOPPING_CART,
        object: { cart: updatedCart }
      })
    },
    {
      onMutate: (item) => {
        if (!!authenticationState.userAddress) {
          const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
            getCartKey(authenticationState.userAddress)
          )

          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(authenticationState.userAddress),
            (data) => getUpdatedCart(data, item)
          )

          return { currentCart }
        }
        return { currentCart: undefined }
      },
      onError: (error, _, context) => {
        if (!!authenticationState.userAddress && !!context) {
          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(authenticationState.userAddress),
            context.currentCart
          )
        }
        captureError(error, 'Error updating item quantity', true, true)
      }
    }
  )
}
