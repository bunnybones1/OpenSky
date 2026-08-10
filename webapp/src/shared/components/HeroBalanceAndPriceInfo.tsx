import clsx from 'clsx'
import { ComponentType, memo } from 'react'

import { HeroBalanceAndPriceInfoButtonOuter } from './HeroBalanceAndPriceInfo.css'
import {
  ItemBalanceAndPriceInfo,
  ItemBalanceAndPriceInfoProps
} from './ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'

interface HeroBalanceAndPriceInfoProps {
  prices?: ItemBalanceAndPriceInfoProps<number>['prices']
  isSelected?: boolean
  areBalancesLoading?: ItemBalanceAndPriceInfoProps<number>['areBalancesLoading']
  arePricesLoading?: ItemBalanceAndPriceInfoProps<number>['arePricesLoading']
  balances?: ItemBalanceAndPriceInfoProps<number>['balances']
  id: number
  ButtonComponent?: ComponentType<{ id: number; isSelected?: boolean }>
}

export const HeroBalanceAndPriceInfo = memo(
  ({
    prices,
    balances,
    id,
    ButtonComponent,
    areBalancesLoading,
    arePricesLoading,
    isSelected
  }: HeroBalanceAndPriceInfoProps) => {
    return (
      <ItemBalanceAndPriceInfo<number>
        buttonOuterClassname={clsx(HeroBalanceAndPriceInfoButtonOuter, {
          isSelected
        })}
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

HeroBalanceAndPriceInfo.displayName = 'CardBalanceAndPriceInfo'
