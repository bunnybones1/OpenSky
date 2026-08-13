import { ItemType } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { CardBack } from '~/shared/components/CardBack/CardBack'
import { CardBackBalanceAndPriceInfo } from '~/shared/components/CardBackBalanceAndPriceInfo'
import { BalanceOrPrice } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { AllCardBacks } from '~/shared/constants/card-backs'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { makeMarketCardBackFeatureRoute } from '~/shared/helpers/routes/market-page'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { useDispatch } from '~/shared/redux/index'

import { useMarketCardBacksShopMode } from '../../shared/hooks/useMarketCardBaksShopMode'
import { MarketCardBackButton } from './components/MarketStickerButton'

export interface MarketCardBackProps {
  id: number
  inventoryOnly?: boolean
}

const MarketCardBackBalance = memo(({ id, inventoryOnly }: MarketCardBackProps) => {
  const mode = useMarketCardBacksShopMode()
  const { data: balance } = useTokenBalance(ItemType.SW_CARD_BACKS, id)
  const { data: priceAndSupply } = useTokenPriceAndSupply({
    mode,
    id,
    quantity: 1,
    isDisabled: inventoryOnly
  })

  const { t } = useTranslation()

  const { data: cartItem } = useCartItem(id, mode, !inventoryOnly)

  const balances = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (balance === undefined) return undefined
    return [
      {
        amount: !!balance ? balance.balance : 0,
        icon: { type: 'card-back-solid' },
        id: 'CARDBACK'
      }
    ]
  }, [balance])

  const prices = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (priceAndSupply === undefined) return undefined
    return [
      {
        amount: !!priceAndSupply?.price
          ? `$${formatUSDCBalance(Number(priceAndSupply.price))}`
          : t('generic.Unavailable'),
        id: 'CARDBACK_PRICE'
      }
    ]
  }, [priceAndSupply, t])

  const cardBack = useMemo(() => AllCardBacks.get(id), [id])

  if (inventoryOnly) {
    return (
      <CardBackBalanceAndPriceInfo
        balances={balances}
        id={id}
        name={cardBack?.name}
        areBalancesLoading={balances === undefined}
      />
    )
  }

  return (
    <CardBackBalanceAndPriceInfo
      balances={balances}
      id={id}
      name={cardBack?.name}
      areBalancesLoading={balances === undefined}
      prices={prices}
      ButtonComponent={!!priceAndSupply?.price ? MarketCardBackButton : undefined}
      arePricesLoading={prices === undefined}
      isSelected={!!cartItem}
    />
  )
})

MarketCardBackBalance.displayName = 'MarketCardBackBalance'

export const MarketCardBack = memo(({ id, inventoryOnly }: MarketCardBackProps) => {
  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    dispatch(push(makeMarketCardBackFeatureRoute(id)))
  }, [dispatch, id])

  const BalanceInfo = useCallback(
    () => <MarketCardBackBalance id={id} inventoryOnly={inventoryOnly} />,
    [id, inventoryOnly]
  )

  return (
    <CardBack
      id={id}
      onClick={onClick}
      isTiltable
      BalanceAndPriceInfo={BalanceInfo}
    />
  )
})

MarketCardBack.displayName = 'MarketCardBack'
