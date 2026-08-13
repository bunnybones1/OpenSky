import { ItemType } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { BalanceOrPrice } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { Sticker } from '~/shared/components/Sticker/Sticker'
import { StickerBalanceAndPriceInfo } from '~/shared/components/StickerBalanceAndPriceInfo'
import { AllStickers } from '~/shared/constants/stickers'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { makeMarketStickerFeatureRoute } from '~/shared/helpers/routes/market-page'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { useDispatch } from '~/shared/redux/index'

import { useMarketStickersShopMode } from '../../shared/hooks/useMarketStickersShopMode'
import { MarketStickerButton } from './components/MarketStickerButton'

export interface MarketStickerProps {
  id: number
  inventoryOnly?: boolean
}

const MarketStickerBalance = memo(({ id, inventoryOnly }: MarketStickerProps) => {
  const mode = useMarketStickersShopMode()
  const { data: balance } = useTokenBalance(ItemType.SW_STICKERS, id)
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
        icon: { type: 'stickers-solid' },
        id: 'STICKER'
      }
    ]
  }, [balance])

  const prices = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (priceAndSupply === undefined) return undefined
    return [
      {
        amount: !!priceAndSupply?.price
          ? `$${formatUSDCBalance(priceAndSupply.price)}`
          : t('generic.Unavailable'),
        id: 'STICKER_PRICE'
      }
    ]
  }, [priceAndSupply, t])

  const sticker = useMemo(() => AllStickers.get(id), [id])

  if (inventoryOnly) {
    return (
      <StickerBalanceAndPriceInfo
        balances={balances}
        id={id}
        name={sticker?.name}
        areBalancesLoading={balances === undefined}
      />
    )
  }

  return (
    <StickerBalanceAndPriceInfo
      balances={balances}
      id={id}
      name={sticker?.name}
      areBalancesLoading={balances === undefined}
      prices={prices}
      ButtonComponent={!!priceAndSupply ? MarketStickerButton : undefined}
      arePricesLoading={prices === undefined}
      isSelected={!!cartItem}
    />
  )
})

MarketStickerBalance.displayName = 'MarketStickerBalance'

export const MarketSticker = memo(({ id, inventoryOnly }: MarketStickerProps) => {
  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    dispatch(push(makeMarketStickerFeatureRoute(id)))
  }, [dispatch, id])

  const BalanceInfo = useCallback(
    () => <MarketStickerBalance id={id} inventoryOnly={inventoryOnly} />,
    [id, inventoryOnly]
  )

  return (
    <Sticker id={id} onClick={onClick} isTiltable BalanceAndPriceInfo={BalanceInfo} />
  )
})

MarketSticker.displayName = 'MarketSticker'
