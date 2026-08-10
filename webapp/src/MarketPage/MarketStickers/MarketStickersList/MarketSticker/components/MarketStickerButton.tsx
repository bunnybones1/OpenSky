import { ItemType } from '@opensky/proto'
import { memo, MouseEvent, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useMarketStickersShopMode } from '~/MarketPage/MarketStickers/shared/hooks/useMarketStickersShopMode'
import { Button } from '~/shared/components/Button'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'

interface MarketStickerButtonProps {
  id: number
  isSelected?: boolean
}

export const MarketStickerButton = memo(
  ({ id, isSelected }: MarketStickerButtonProps) => {
    const mode = useMarketStickersShopMode()
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
              type: ItemType.SW_STICKERS
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

MarketStickerButton.displayName = 'MarketStickerButton'
