import { memo, MouseEvent, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useMarketCardsShopMode } from '~/MarketPage/shared/hooks/useMarketCardsShopMode'
import { Button } from '~/shared/components/Button'
import { Cards } from '~/shared/constants/cards'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'

interface MarketCardButtonProps {
  id: number
  isSelected?: boolean
}

export const MarketCardButton = memo(({ id, isSelected }: MarketCardButtonProps) => {
  const mode = useMarketCardsShopMode()
  const addToCart = useAddToCart()
  const removeFromCart = useRemoveFromCart()

  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const card = Cards.get(id)

      if (!card || !mode) return

      if (!isSelected) {
        addToCart.mutate([
          {
            tokenId: id,
            amount: 1,
            side: mode,
            type: card.grade
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
})

MarketCardButton.displayName = 'MarketCardButton'
