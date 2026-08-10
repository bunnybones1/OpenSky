import clsx from 'clsx'
import { ComponentType, memo } from 'react'

import {
  ItemBalanceAndPriceInfo,
  ItemBalanceAndPriceInfoProps
} from './ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { StickerBalanceAndPriceInfoButtonOuter } from './StickerBalanceAndPriceInfo.css'

interface StickerBalanceAndPriceInfoProps {
  prices?: ItemBalanceAndPriceInfoProps<number>['prices']
  isSelected?: boolean
  areBalancesLoading?: ItemBalanceAndPriceInfoProps<number>['areBalancesLoading']
  arePricesLoading?: ItemBalanceAndPriceInfoProps<number>['arePricesLoading']
  balances?: ItemBalanceAndPriceInfoProps<number>['balances']
  id: number
  name?: string
  ButtonComponent?: ComponentType<{ id: number; isSelected?: boolean }>
}

export const StickerBalanceAndPriceInfo = memo(
  ({
    prices,
    balances,
    id,
    ButtonComponent,
    areBalancesLoading,
    arePricesLoading,
    isSelected,
    name
  }: StickerBalanceAndPriceInfoProps) => {
    return (
      <ItemBalanceAndPriceInfo<number>
        buttonOuterClassname={clsx(StickerBalanceAndPriceInfoButtonOuter, {
          isSelected
        })}
        name={name}
        isSelected={isSelected}
        areBalancesLoading={areBalancesLoading}
        arePricesLoading={arePricesLoading}
        ButtonComponent={ButtonComponent}
        balances={balances}
        prices={prices}
        id={id}
      />
    )
  }
)

StickerBalanceAndPriceInfo.displayName = 'StickerBalanceAndPriceInfo'
