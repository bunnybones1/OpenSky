import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { CardListLoader } from '~/shared/components/CardListLoader/CardListLoader'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { CARD_RATIO } from '~/shared/constants/ui'
import {
  BASE_COLUMN_GAP,
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X,
  MARKET_CARD_PADDING_BOTTOM
} from '~/shared/constants/ui'
import { useCardListNumColumns } from '~/shared/hooks/cards/useCardListNumColumns'
import { useFilteredCardsList } from '~/shared/hooks/cards/useFilteredCardsList'
import { usePriceSortedCards } from '~/shared/hooks/cards/usePriceSortedCards'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { selectGoldsFilterState } from '~/shared/state/select-golds/select-golds-filter-state'
import { updateSelectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { OwnershipFilter } from '~/shared/types/cards'

import { SelectGoldCard, SelectGoldCardProps } from './SelectGoldCard/SelectGoldCard'

const getId = ({ id }: SelectGoldCardProps) => {
  return id
}

const Loader = memo(() => (
  <CardListLoader paddingBottom={`${MARKET_CARD_PADDING_BOTTOM}px`} />
))

Loader.displayName = 'SelectGoldsLoader'

export const SelectGoldsCardsList = memo(() => {
  const { prism, onlyDuplicates, sort } = useSnapshot(selectGoldsFilterState)

  const numColumns = useCardListNumColumns()

  const onUpdate = useCallback((numResults?: number) => {
    updateSelectGoldsState('numSearchResults', numResults)
  }, [])

  const cards = useFilteredCardsList({
    prism,
    onlyDuplicates,
    ownership: OwnershipFilter.OWNED,
    grade: ItemType.SW_GOLD_CARDS
  })

  const { sortedCards } = usePriceSortedCards({
    cards,
    sort: sort,
    grade: ItemType.SW_GOLD_CARDS,
    mode: SwapType.SELL,
    onUpdate
  })

  const { estimateSize, listParentRef } = useEstimateVirtualizedItemSize({
    numColumns,
    paddingBottom: MARKET_CARD_PADDING_BOTTOM,
    ratio: CARD_RATIO,
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
      <VirtualizedItemList<SelectGoldCardProps>
        ItemComponent={SelectGoldCard}
        getItemId={getId}
        ListLoader={Loader}
        estimateSize={estimateSize}
        items={sortedCards || DEFAULT_LIST}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${MARKET_CARD_PADDING_BOTTOM}px`}
        numColumns={numColumns}
        isLoadingList={sortedCards === undefined}
      />
    </div>
  )
})

SelectGoldsCardsList.displayName = 'SelectGoldsCardsList'
