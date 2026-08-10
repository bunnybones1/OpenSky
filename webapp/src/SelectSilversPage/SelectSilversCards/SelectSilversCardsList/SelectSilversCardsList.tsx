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
import { selectSilversFilterState } from '~/shared/state/select-silvers/select-silvers-filter-state'
import { updateSelectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { OwnershipFilter } from '~/shared/types/cards'

import {
  SelectSilverCard,
  SelectSilverCardProps
} from './SelectSilverCard/SelectSilverCard'

const getId = ({ id }: SelectSilverCardProps) => {
  return id
}

const Loader = memo(() => (
  <CardListLoader paddingBottom={`${MARKET_CARD_PADDING_BOTTOM}px`} />
))

Loader.displayName = 'SelectSilversLoader'

export const SelectSilversCardsList = memo(() => {
  const { prism, onlyDuplicates, sort } = useSnapshot(selectSilversFilterState)

  const numColumns = useCardListNumColumns()

  const onUpdate = useCallback((numResults?: number) => {
    updateSelectSilversState('numSearchResults', numResults)
  }, [])

  const cards = useFilteredCardsList(
    {
      prism,
      ownership: onlyDuplicates
        ? OwnershipFilter.OWN_MULTIPLE
        : OwnershipFilter.OWNED,
      grade: ItemType.SW_SILVER_CARDS
    },
    onUpdate
  )

  const { sortedCards } = usePriceSortedCards({
    cards,
    sort: sort,
    grade: ItemType.SW_SILVER_CARDS,
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
      <VirtualizedItemList<SelectSilverCardProps>
        ItemComponent={SelectSilverCard}
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

SelectSilversCardsList.displayName = 'SelectSilversCardsList'
