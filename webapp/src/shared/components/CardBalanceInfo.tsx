import { memo, useMemo } from 'react'

import { ItemType } from '~/lib/proto'

import { useBalancesForCard } from '../hooks/cards/useBalancesForCard'
import { useGetAssetContext } from '../hooks/useGetAssetContext'
import { CardSearchParams } from '../types/cards'
import { CardBalanceAndPriceInfoButtonOuter } from './CardBalanceAndPriceInfo.css'
import {
  BalanceOrPrice,
  ItemBalanceAndPriceInfo
} from './ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'

interface CardBalanceProps {
  id: number
  grade?: CardSearchParams['grade']
}

export const CardBalance = memo(({ id, grade }: CardBalanceProps) => {
  const cardBalances = useBalancesForCard(id)
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

  if (balances === null) return null

  return (
    <ItemBalanceAndPriceInfo<number>
      buttonOuterClassname={CardBalanceAndPriceInfoButtonOuter}
      areBalancesLoading={balances === undefined}
      balances={balances}
      id={id}
    />
  )
})

CardBalance.displayName = 'CardBalance'
