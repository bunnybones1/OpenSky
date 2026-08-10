import { useMemo } from 'react'

import { useCart } from '~/shared/queries/useCart'
import { MarketMode } from '~/shared/types/market'

export const useCartSideItems = (mode?: MarketMode) => {
  const { data: cart } = useCart()

  return useMemo(() => {
    if (!mode) return undefined
    if (!cart) return cart

    return cart.filter((item) => item.side === mode)
  }, [cart, mode])
}
