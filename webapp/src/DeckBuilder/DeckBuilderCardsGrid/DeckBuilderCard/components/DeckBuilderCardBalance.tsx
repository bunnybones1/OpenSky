import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { CardBalance } from '~/shared/components/CardBalanceInfo'
import { deckBuilderFilterState } from '~/shared/state/deck-builder/deck-builder-filter-state'

interface DeckBuilderCardBalanceProps {
  id: number
}

export const DeckBuilderCardBalance = memo(({ id }: DeckBuilderCardBalanceProps) => {
  const { grade } = useSnapshot(deckBuilderFilterState)
  return <CardBalance id={id} grade={grade} />
})

DeckBuilderCardBalance.displayName = 'DeckBuilderCardBalance'
