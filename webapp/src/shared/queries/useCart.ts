import { SwapType } from '@0xsequence/metadata'
import { UserStorageKeys } from '@opensky/shared/constants'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { authenticationState } from '~/shared/state/authentication-state'
import { CartItem, MarketMode } from '~/shared/types/market'

import { getCartKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

const fetchCart = async () => {
  const { object } = await APIClient.opensky.userStorageFetch({
    key: UserStorageKeys.SHOPPING_CART
  })

  const cart = !!object && !!object.cart ? (object.cart as CartItem[]) : null

  if (!!cart?.length) {
    return cart.map((cartItem) => {
      // When the new cart was implemented, side was "buy" | "sell"
      // but was later changed to "BUY" | "SELL". This check will
      // migrate any saved carts with the lowercase values to the new
      // uppercase values
      // @ts-ignore
      if (cartItem.side === 'buy') {
        return {
          ...cartItem,
          side: SwapType.BUY as MarketMode
        }
        // @ts-ignore
      } else if (cartItem.side === 'sell') {
        return {
          ...cartItem,
          side: SwapType.SELL as MarketMode
        }
      }
      return cartItem
    })
  }
  return cart
}

export const useCart = (enabled = true) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(getCartKey(userAddress), fetchCart, {
    enabled: enabled && !!userAddress,
    staleTime: ONE_DAY
  })
}

export const useCartItem = (id: number, side?: MarketMode) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(getCartKey(userAddress), fetchCart, {
    enabled: !!userAddress,
    staleTime: ONE_DAY,
    select: (data) => {
      if (!data) return data
      const cartItem = data.find((item) => item.tokenId === id && item.side === side)
      return cartItem
    }
  })
}
