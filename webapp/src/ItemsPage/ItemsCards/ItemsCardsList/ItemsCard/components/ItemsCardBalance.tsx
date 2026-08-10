import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { CardBalance } from '~/shared/components/CardBalanceInfo'
import { itemsCardsFiltersState } from '~/shared/state/items-cards/items-cards-filter-state'

interface ItemsCardBalanceProps {
  id: number
}

export const ItemsCardBalance = memo(({ id }: ItemsCardBalanceProps) => {
  const { grade } = useSnapshot(itemsCardsFiltersState)
  return <CardBalance id={id} grade={grade} />
})

ItemsCardBalance.displayName = 'ItemsCardBalance'
