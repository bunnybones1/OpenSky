import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { CARD_RATIO } from '~/shared/constants/ui'
import {
  BASE_COLUMN_GAP,
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X
} from '~/shared/constants/ui'
import { useCardListNumColumns } from '~/shared/hooks/cards/useCardListNumColumns'
import { useFilteredCardsList } from '~/shared/hooks/cards/useFilteredCardsList'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { itemsCardsFiltersState } from '~/shared/state/items-cards/items-cards-filter-state'
import { updateItemsCardsState } from '~/shared/state/items-cards/items-cards-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsCard, ItemsCardProps } from './ItemsCard/ItemsCard'

const PADDING_BOTTOM = 60 as const

const getId = ({ id }: ItemsCardProps) => {
  return id
}

export const ItemsCardsList = memo(() => {
  const filters = useSnapshot(itemsCardsFiltersState)

  const numColumns = useCardListNumColumns()

  const onUpdate = useCallback((numResults: number) => {
    updateItemsCardsState('numSearchResults', numResults)
  }, [])

  const cards = useFilteredCardsList(filters, onUpdate)

  const { estimateSize, listParentRef } = useEstimateVirtualizedItemSize({
    numColumns,
    columnGap: BASE_COLUMN_GAP,
    paddingBottom: PADDING_BOTTOM,
    ratio: CARD_RATIO
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
      <VirtualizedItemList<ItemsCardProps>
        ItemComponent={ItemsCard}
        getItemId={getId}
        items={cards || DEFAULT_LIST}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        estimateSize={estimateSize}
        numColumns={numColumns}
        isLoadingList={cards === undefined}
      />
    </div>
  )
})

ItemsCardsList.displayName = 'ItemsCardsList'
