import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getCartKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'
import { CartItem, MarketMode } from '~/shared/types/market'

const getUpdatedCart = (
  currentCart: CartItem[] | undefined | null,
  side: MarketMode
) => {
  if (!currentCart) return currentCart

  return currentCart.filter((item) => {
    return item.side !== side
  })
}

export const useClearCartSide = () => {
  const queryClient = useQueryClient()

  const { userAddress } = useSnapshot(authenticationState)

  return useMutation(
    async (side: MarketMode | undefined) => {
      if (!userAddress || !side) return
      const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
        getCartKey(userAddress)
      )

      const updatedCart = getUpdatedCart(currentCart, side)

      await APIClient.opensky.userStorageSave({
        key: UserStorageKeys.SHOPPING_CART,
        object: { cart: updatedCart }
      })
    },
    {
      onMutate: (side) => {
        if (!!userAddress && !!side) {
          const currentCart = queryClient.getQueryData<CartItem[] | undefined | null>(
            getCartKey(userAddress)
          )

          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(userAddress),
            (data) => getUpdatedCart(data, side)
          )

          return { currentCart }
        }
        return { currentCart: undefined }
      },
      onError: (error, side, context) => {
        if (!!userAddress && !!context) {
          queryClient.setQueryData<CartItem[] | null | undefined>(
            getCartKey(userAddress),
            context.currentCart
          )
        }
        captureError(error, `Error clearing ${side} cart`, true, true)
      }
    }
  )
}
