import { ItemType } from '@opensky/proto'
import { memo, MouseEvent, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useMarketCardBacksShopMode } from '~/MarketPage/MarketCardBacks/shared/hooks/useMarketCardBaksShopMode'
import { Button } from '~/shared/components/Button'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'

interface MarketCardBackButtonProps {
  id: number
  isSelected?: boolean
}

export const MarketCardBackButton = memo(
  ({ id, isSelected }: MarketCardBackButtonProps) => {
    const mode = useMarketCardBacksShopMode()
    const addToCart = useAddToCart()
    const removeFromCart = useRemoveFromCart()

    const onClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()

        if (!mode) return

        if (!isSelected) {
          addToCart.mutate([
            {
              tokenId: id,
              amount: 1,
              side: mode,
              type: ItemType.SW_CARD_BACKS
            }
          ])
        } else {
          removeFromCart.mutate([
            {
              tokenId: id,
              side: mode
            }
          ])
        }
      },
      [addToCart, id, isSelected, mode, removeFromCart]
    )

    const { t } = useTranslation()

    return (
      <Button
        onClick={onClick}
        frameType="default"
        colorType={isSelected ? 'secondary' : 'blue'}
        checked={isSelected}
        text={t(isSelected ? 'generic.RemoveFromOrder' : 'generic.AddToOrder')}
      />
    )
  }
)

MarketCardBackButton.displayName = 'MarketCardBackButton'
