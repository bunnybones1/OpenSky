import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { useCallback } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useMarketStickersShopMode } from '~/MarketPage/MarketStickers/shared/hooks/useMarketStickersShopMode'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface ShopControlsProps {
  id: number
}

export const ShopControls = memo(({ id }: ShopControlsProps) => {
  const mode = useMarketStickersShopMode()
  const { data: priceAndSupply } = useTokenPriceAndSupply({
    mode,
    id,
    quantity: 1
  })
  const { data: cartItem } = useCartItem(id, mode)
  const addToCart = useAddToCart()
  const removeFromCart = useRemoveFromCart()
  const { t } = useTranslation()

  const isTabletWide = useResponsiveQuery('tabletWide')

  const onClick = useCallback(() => {
    if (!mode) return

    if (!cartItem) {
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
  }, [addToCart, cartItem, id, mode, removeFromCart])

  if (!mode) return null

  return (
    <div
      className={Sprinkles({
        position: 'absolute',
        right: 0,
        bottom: 0,
        zIndex: 2,
        paddingRight: '48px',
        paddingBottom: '48px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        flexDirection: 'column'
      })}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '8px',
          marginBottom: '16px'
        })}
      >
        {priceAndSupply === undefined ? (
          <Icon type="spinner" color="white" height="20px" />
        ) : (
          <Text color="white" fontSize="22px" fontFamily="condensed">
            {!priceAndSupply?.price
              ? t('generic.Unavailable')
              : `$${formatUSDCBalance(priceAndSupply.price)}`}
          </Text>
        )}
      </div>
      <Button
        colorType={!!cartItem ? 'default' : 'blue'}
        frameType="default"
        onClick={onClick}
        disabled={!priceAndSupply?.price}
        height={!isTabletWide ? '36px' : '52px'}
        text={t(
          !!cartItem
            ? 'generic.RemoveFromOrderWithMode'
            : 'generic.AddToOrderWithMode',
          {
            mode: mode === SwapType.BUY ? t('generic.Buy') : t('generic.Sell')
          }
        )}
      />
    </div>
  )
})

ShopControls.displayName = 'ShopControls'
