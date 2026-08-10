import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getCartKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'
import { CartItem } from '~/shared/types/market'

const getUpdatedCart = (
  currentCart: CartItem[] | undefined | null,
  newItems: CartItem[]
) => {
  if (!currentCart) return newItems

  let toReturn = currentCart

  newItems.forEach((newItem) => {
    const inCartItem = toReturn.find(
      (item) => item.tokenId === newItem.tokenId && item.side === newItem.side
    )

    if (!inCartItem) {
      toReturn = [...toReturn, newItem]
    }
  })

  return toReturn
}

export const useAddToCart = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (items: CartItem[]) => {
      if (!authenticationState.userAddress) return

      const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
        getCartKey(authenticationState.userAddress)
      )

      const updatedCart = getUpdatedCart(currentCart, items)

      await APIClient.opensky.userStorageSave({
        key: UserStorageKeys.SHOPPING_CART,
        object: { cart: updatedCart }
      })
    },
    {
      onMutate: (items) => {
        if (!!authenticationState.userAddress) {
          const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
            getCartKey(authenticationState.userAddress)
          )

          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(authenticationState.userAddress),
            (data) => getUpdatedCart(data, items)
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
        captureError(error, 'Error adding item to cart', true, true)
      }
    }
  )
}
