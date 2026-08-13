import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useIsMarketEnabled } from '~/shared/hooks/useIsMarketEnabled'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  ItemCardDetailsControlsStyle,
  ShopButton
} from './ItemsCardDetailsControls.css'

const ButtonIcon = { icon: 'cart' } as const

interface LegacyItemsCardDetailsControlsProps {
  id: number
}

export const LegacyItemsCardDetailsControls = memo(
  ({ id }: LegacyItemsCardDetailsControlsProps) => {
    const card = useMemo(() => Cards.get(id), [id])

    const { t } = useTranslation()

    const isMarketEnabled = useIsMarketEnabled()
    const addToCart = useAddToCart()
    const removeFromCart = useRemoveFromCart()

    const { data: item } = useCartItem(id, SwapType.BUY)

    const { data: priceAndSupply } = useTokenPriceAndSupply({
      mode: SwapType.BUY,
      id,
      quantity: 1
    })

    const onClick = useCallback(() => {
      if (!card) return
      if (!!item) {
        removeFromCart.mutate([{ tokenId: id, side: SwapType.BUY }])
      } else {
        addToCart.mutate([
          {
            tokenId: id,
            amount: 1,
            side: SwapType.BUY,
            type: card.grade
          }
        ])
      }
    }, [addToCart, card, id, item, removeFromCart])

    if (!card) return null

    const isEnchant = card.type === 'enchant'
    const isToken = card.prism === 'tok' && !isEnchant

    if (card.grade === ItemType.SW_BASE_CARDS || isEnchant || isToken) {
      return (
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full'
            }),
            ItemCardDetailsControlsStyle
          )}
        >
          <Icon type="info-empty" height="16px" color="purple9" />
          <Text marginLeft="8px" fontSize="16px" color="purple9">
            {t(
              `cardDetails.${
                isEnchant
                  ? 'enchantNotTradable'
                  : isToken
                    ? 'tokenNotTradable'
                    : 'baseNotTradable'
              }`
            )}
          </Text>
        </div>
      )
    }

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            alignItems: 'center',
            justifyContent: 'flex-end',
            display: 'flex'
          }),
          ItemCardDetailsControlsStyle
        )}
      >
        {priceAndSupply === undefined ? (
          <Icon type="spinner" color="white" height="16px" />
        ) : (
          <Text fontSize="16px" color="purple9">
            {!!priceAndSupply?.price
              ? `$${formatUSDCBalance(priceAndSupply.price)}`
              : t('generic.NotApplicable')}
          </Text>
        )}
        {!!isMarketEnabled && (
          <Button
            frameType="default"
            onClick={onClick}
            buttonClassName={ShopButton}
            colorType={!!item ? 'default' : 'blue'}
            text={t(!!item ? 'shop.buyMode.deselect' : 'shop.buyMode.detailsButton')}
            disabled={!priceAndSupply}
            leftAdornment={ButtonIcon}
            className={clsx(
              Sprinkles({
                marginLeft: '12px'
              }),
              ShopButton
            )}
          />
        )}
      </div>
    )
  }
)

LegacyItemsCardDetailsControls.displayName = 'LegacyItemsCardDetailsControls'
