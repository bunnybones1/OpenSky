/* eslint-disable valtio/state-snapshot-rule */
import { DECKCLASS_PRISMS } from '@opensky/shared/constants'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import {
  deckBuilderDeckClassSelector,
  deckBuilderDeckStringSelector
} from '~/DeckBuilder/shared/selectors'
import { DeckClass } from '~/lib/proto'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { Cards } from '~/shared/constants/cards'
import { CARD_RATIO } from '~/shared/constants/ui'
import {
  BASE_COLUMN_GAP,
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X
} from '~/shared/constants/ui'
import { useFilteredCardsList } from '~/shared/hooks/cards/useFilteredCardsList'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { useSelector } from '~/shared/redux'
import { deckBuilderFilterState } from '~/shared/state/deck-builder/deck-builder-filter-state'
import { updateDeckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import {
  CardSearchParams,
  FilterablePrism,
  OwnershipFilter
} from '~/shared/types/cards'

import {
  DeckBuilderCard,
  DeckBuilderCardProps
} from './DeckBuilderCard/DeckBuilderCard'

const getId = ({ id }: DeckBuilderCardProps) => {
  return id
}

const PADDING_BOTTOM = 60 as const

export const DeckBuilderCardsGrid = memo(() => {
  const selectedDeckClass = useSelector(deckBuilderDeckClassSelector)
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const { cardIds } = useDecodedDeckString(deckString)
  const filterState = useSnapshot(deckBuilderFilterState)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const isDesktop = useResponsiveQuery('desktop')
  const isDesktopWide = useResponsiveQuery('desktopWide')

  const numColumns = useMemo(() => {
    if (isDesktopWide) return 7 as const
    if (isDesktop) return 5 as const
    if (isTabletWide) return 4 as const
    return 3 as const
  }, [isDesktop, isDesktopWide, isTabletWide])

  const onUpdate = useCallback((numResults: number) => {
    updateDeckBuilderState('numSearchResults', numResults)
  }, [])

  const filters = useMemo<CardSearchParams>(() => {
    const deckClassPrisms = DECKCLASS_PRISMS[selectedDeckClass as DeckClass].filter(
      (prism) => prism !== 'tut' && prism !== 'tok'
    )

    const prism = !!filterState.prism?.length
      ? filterState.prism
      : !!selectedDeckClass
      ? deckClassPrisms
      : undefined

    return {
      ...filterState,
      prism: prism as FilterablePrism[] | undefined
    }
  }, [filterState, selectedDeckClass])

  const cards = useFilteredCardsList(filters, onUpdate)

  const cardsWithSelectionFilter = useMemo(() => {
    if (filters.ownership === OwnershipFilter.SELECTED) {
      if (!cardIds) return cards
      return cards?.filter(({ id: cardId }) => {
        const card = Cards.get(cardId)
        return !!card && cardIds.includes(card.baseId)
      })
    } else {
      return cards
    }
  }, [cards, filters.ownership, cardIds])

  useEffect(() => {
    updateDeckBuilderState('numSearchResults', cardsWithSelectionFilter?.length || 0)
  }, [cardsWithSelectionFilter?.length])

  const { estimateSize, listParentRef } = useEstimateVirtualizedItemSize({
    numColumns,
    ratio: CARD_RATIO,
    paddingBottom: PADDING_BOTTOM,
    columnGap: BASE_COLUMN_GAP
  })

  return (
    <div
      className={Sprinkles({
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        display: 'flex',
        width: 'full',
        paddingX: ITEM_LIST_PADDING_X,
        paddingBottom: ITEM_LIST_PADDING_BOTTOM
      })}
      ref={listParentRef}
    >
      <VirtualizedItemList<DeckBuilderCardProps>
        getItemId={getId}
        items={cardsWithSelectionFilter || DEFAULT_LIST}
        isLoadingList={cardsWithSelectionFilter === undefined}
        numColumns={numColumns}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        ItemComponent={DeckBuilderCard}
        estimateSize={estimateSize}
      />
    </div>
  )
})

DeckBuilderCardsGrid.displayName = 'DeckBuilderCardsGrid'
