import { memo } from 'react'

import { DecksListLoader } from '~/shared/components/DeckListLoader/DeckListLoader'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { DECK_RATIO } from '~/shared/constants/ui'
import {
  BASE_PADDING_BOTTOM,
  DEFAULT_LIST,
  ITEM_LIST_COLUMN_GAP,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X
} from '~/shared/constants/ui'
import { useDeckListNumColumns } from '~/shared/hooks/decks/useDeckListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useItemsDecksList } from './hooks/useItemsDecksList'
import { ItemsDeckProps, ItemsDeckWrapper } from './ItemsDeck/ItemsDeck'

const getId = ({ id }: ItemsDeckProps) => {
  return id
}

export const DeckListColumns = {
  base: 'two',
  mobile: 'three',
  tablet: 'three',
  tabletWide: 'four',
  desktop: 'five',
  desktopWide: 'seven',
  desktopUltrawide: 'eight'
} as const

export const ItemsDecksList = memo(() => {
  const deckList = useItemsDecksList()

  const numColumns = useDeckListNumColumns()

  const { listParentRef, estimateSize } = useEstimateVirtualizedItemSize({
    numColumns,
    ratio: DECK_RATIO,
    paddingBottom: BASE_PADDING_BOTTOM,
    columnGap: ITEM_LIST_COLUMN_GAP
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
      <VirtualizedItemList<ItemsDeckProps>
        ItemComponent={ItemsDeckWrapper}
        getItemId={getId}
        ListLoader={DecksListLoader}
        estimateSize={estimateSize}
        items={deckList || DEFAULT_LIST}
        columnGap={`${ITEM_LIST_COLUMN_GAP}px`}
        rowPaddingBottom={`${BASE_PADDING_BOTTOM}px`}
        numColumns={numColumns}
        isLoadingList={deckList === undefined}
      />
    </div>
  )
})

ItemsDecksList.displayName = 'ItemsDecksList'
