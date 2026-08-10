import clsx from 'clsx'
import { ComponentType, memo, useMemo } from 'react'

import { ItemType } from '~/lib/proto'

import { formatUSDCBalance } from '../helpers/market/format-usdc-balance'
import { useBalancesForCard } from '../hooks/cards/useBalancesForCard'
import { useGetAssetContext } from '../hooks/useGetAssetContext'
import { useTokenPriceAndSupply } from '../queries/useTokenPriceAndSupply'
import { CardSearchParams } from '../types/cards'
import { MarketMode } from '../types/market'
import { CardBalanceAndPriceInfoButtonOuter } from './CardBalanceAndPriceInfo.css'
import {
  BalanceOrPrice,
  ItemBalanceAndPriceInfo
} from './ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'

interface CardBalanceAndPriceProps {
  id: number
  isSelected?: boolean
  grade?: CardSearchParams['grade']
  mode: MarketMode
  ButtonComponent?: ComponentType<{
    id: number
  }>
}

export const CardBalanceAndPriceInfo = memo(
  ({ id, grade, mode, ButtonComponent, isSelected }: CardBalanceAndPriceProps) => {
    const cardBalances = useBalancesForCard(id)

    const { data: priceAndSupply } = useTokenPriceAndSupply({
      id,
      mode,
      quantity: 1
    })

    const { getAssetUrl } = useGetAssetContext()

    const balances = useMemo<undefined | null | BalanceOrPrice[]>(() => {
      if (cardBalances === undefined) return undefined
      if (grade) {
        const balanceForGrade = cardBalances?.find(
          (balance) => balance.itemType === grade
        )
        const imageKey =
          grade === ItemType.SW_BASE_CARDS
            ? 'base'
            : grade === ItemType.SW_GOLD_CARDS
            ? 'gold'
            : 'silver'

        return [
          {
            id: grade,
            amount: !balanceForGrade ? 0 : balanceForGrade.balance,
            image: !!getAssetUrl
              ? getAssetUrl(`webapp/icons/${imageKey}-card-with-letter.webp`)
              : undefined
          }
        ]
      }

      const goldBalance = cardBalances?.find(
        (balance) => balance.itemType === ItemType.SW_GOLD_CARDS
      )

      const silverBalance = cardBalances?.find(
        (balance) => balance.itemType === ItemType.SW_SILVER_CARDS
      )

      return [
        {
          id: ItemType.SW_GOLD_CARDS,
          amount: !goldBalance ? 0 : goldBalance.balance,
          image: !!getAssetUrl
            ? getAssetUrl('webapp/icons/gold-card-with-letter.webp')
            : undefined
        },
        {
          id: ItemType.SW_SILVER_CARDS,
          amount: !silverBalance ? 0 : silverBalance.balance,
          image: !!getAssetUrl
            ? getAssetUrl('webapp/icons/silver-card-with-letter.webp')
            : undefined
        }
      ]
    }, [cardBalances, getAssetUrl, grade])

    const prices = useMemo<undefined | BalanceOrPrice[]>(() => {
      if (!priceAndSupply?.price) return undefined

      return [
        {
          id: 'usdc',
          amount: `$${formatUSDCBalance(priceAndSupply.price)}`
        }
      ]
    }, [priceAndSupply])

    if (balances === null) return null

    return (
      <ItemBalanceAndPriceInfo<number>
        buttonOuterClassname={clsx(CardBalanceAndPriceInfoButtonOuter, {
          isSelected
        })}
        isSelected={isSelected}
        areBalancesLoading={balances === undefined}
        ButtonComponent={ButtonComponent}
        balances={balances}
        prices={prices}
        id={id}
      />
    )
  }
)

CardBalanceAndPriceInfo.displayName = 'CardBalanceAndPriceInfo'
