import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { getItemType } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { useMarketCardsShopMode } from '~/MarketPage/shared/hooks/useMarketCardsShopMode'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useIsMarketEnabled } from '~/shared/hooks/useIsMarketEnabled'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  MarketCardDetailsControlsStyle,
  ShopButton
} from './MarketCardDetailsControls.css'

const ButtonIcon = { icon: 'cart' } as const

interface MarketCardDetailsControlsProps {
  id: number
}

export const MarketCardDetailsControls = memo(
  ({ id }: MarketCardDetailsControlsProps) => {
    const card = useMemo(() => Cards.get(id), [id])
    const mode = useMarketCardsShopMode()
    const dispatch = useDispatch()
    const { t } = useTranslation()

    const isMarketEnabled = useIsMarketEnabled()
    const addToCart = useAddToCart()
    const removeFromCart = useRemoveFromCart()

    const { data: item } = useCartItem(id, mode)

    const { data: priceAndSupply } = useTokenPriceAndSupply({
      mode,
      id,
      quantity: 1
    })

    const { data: balance } = useTokenBalance(getItemType(id), id)

    const onClick = useCallback(() => {
      if (!card) return
      if (!!item) {
        removeFromCart.mutate([{ tokenId: id, side: mode }])
      } else {
        addToCart.mutate([
          {
            tokenId: id,
            amount: 1,
            side: mode,
            type: card?.grade
          }
        ])
      }
      dispatch(push(makeMarketCardsRoute()))
    }, [addToCart, card, dispatch, id, item, mode, removeFromCart])

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
            MarketCardDetailsControlsStyle
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
          MarketCardDetailsControlsStyle
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
            text={t(
              !!item
                ? 'shop.buyMode.deselect'
                : mode === SwapType.BUY
                ? 'shop.buyMode.detailsButton'
                : 'shop.sellMode.detailsButton'
            )}
            disabled={
              (mode === SwapType.SELL && !balance) || !priceAndSupply || !mode
            }
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

MarketCardDetailsControls.displayName = 'MarketCardDetailsControls'
