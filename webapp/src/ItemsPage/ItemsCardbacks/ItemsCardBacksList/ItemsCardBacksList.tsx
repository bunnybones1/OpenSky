import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { CardListLoader } from '~/shared/components/CardListLoader/CardListLoader'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { CARD_RATIO } from '~/shared/constants/ui'
import {
  BASE_COLUMN_GAP,
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X
} from '~/shared/constants/ui'
import { useFilteredCardBacksList } from '~/shared/hooks/card-backs/useFilteredCardBacksList'
import { useCardListNumColumns } from '~/shared/hooks/cards/useCardListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { itemsCardbacksFilterState } from '~/shared/state/items-cardbacks/items-cardbacks-filter-state'
import { updateItemsCardbacksState } from '~/shared/state/items-cardbacks/items-cardbacks-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsCardBack, ItemsCardBackProps } from './ItemsCardBack/ItemsCardBack'

const PADDING_BOTTOM = 96 as const

const Loader = memo(() => {
  return <CardListLoader paddingBottom={`${PADDING_BOTTOM}px`} />
})

Loader.displayName = 'Loader'

const getId = ({ id }: ItemsCardBackProps) => {
  return id
}

export const ItemsCardBacksList = memo(() => {
  const filters = useSnapshot(itemsCardbacksFilterState)

  const numColumns = useCardListNumColumns()

  const onUpdate = useCallback((numResults: number) => {
    updateItemsCardbacksState('numSearchResults', numResults)
  }, [])

  const { cardBacksList } = useFilteredCardBacksList(filters, onUpdate)

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
      <VirtualizedItemList<ItemsCardBackProps>
        ItemComponent={ItemsCardBack}
        getItemId={getId}
        ListLoader={Loader}
        items={cardBacksList || DEFAULT_LIST}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        estimateSize={estimateSize}
        numColumns={numColumns}
        isLoadingList={cardBacksList === undefined}
      />
    </div>
  )
})

ItemsCardBacksList.displayName = 'ItemsCardBacksList'
