import clsx from 'clsx'
import { ComponentType, memo } from 'react'

import { ButtonOuter } from './CardBackBalanceAndPriceInfo.css'
import {
  ItemBalanceAndPriceInfo,
  ItemBalanceAndPriceInfoProps
} from './ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'

interface CardBackBalanceAndPriceInfoProps {
  prices?: ItemBalanceAndPriceInfoProps<number>['prices']
  isSelected?: boolean
  areBalancesLoading?: ItemBalanceAndPriceInfoProps<number>['areBalancesLoading']
  arePricesLoading?: ItemBalanceAndPriceInfoProps<number>['arePricesLoading']
  balances?: ItemBalanceAndPriceInfoProps<number>['balances']
  id: number
  ButtonComponent?: ComponentType<{ id: number; isSelected?: boolean }>
  name?: string
}

export const CardBackBalanceAndPriceInfo = memo(
  ({
    prices,
    balances,
    id,
    ButtonComponent,
    areBalancesLoading,
    arePricesLoading,
    isSelected,
    name
  }: CardBackBalanceAndPriceInfoProps) => {
    return (
      <ItemBalanceAndPriceInfo<number>
        buttonOuterClassname={clsx(ButtonOuter, {
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

CardBackBalanceAndPriceInfo.displayName = 'CardBackBalanceAndPriceInfo'
