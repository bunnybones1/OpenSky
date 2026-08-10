import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import {
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X,
  STICKER_RATIO
} from '~/shared/constants/ui'
import { useFilteredStickerList } from '~/shared/hooks/stickers/useFilteredStickerList'
import { useStickerListNumColumns } from '~/shared/hooks/stickers/useStickerListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { itemsStickersFilterState } from '~/shared/state/items-stickers/items-stickers-filter-state'
import { updateItemsStickersState } from '~/shared/state/items-stickers/items-stickers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsSticker, ItemsStickerProps } from './ItemsSticker/ItemsSticker'

const PADDING_BOTTOM = 96 as const
const COLUMN_GAP = 20

const getId = ({ id }: ItemsStickerProps) => {
  return id
}

export const ItemsStickersList = memo(() => {
  const filters = useSnapshot(itemsStickersFilterState)

  const numColumns = useStickerListNumColumns()

  const onUpdate = useCallback((numResults: number) => {
    updateItemsStickersState('numSearchResults', numResults)
  }, [])

  const { stickersList } = useFilteredStickerList(filters, onUpdate)

  const { estimateSize, listParentRef } = useEstimateVirtualizedItemSize({
    numColumns,
    columnGap: COLUMN_GAP,
    paddingBottom: PADDING_BOTTOM,
    ratio: STICKER_RATIO
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
      <VirtualizedItemList<ItemsStickerProps>
        ItemComponent={ItemsSticker}
        getItemId={getId}
        items={stickersList || DEFAULT_LIST}
        columnGap={`${COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        estimateSize={estimateSize}
        numColumns={numColumns}
        isLoadingList={stickersList === undefined}
      />
    </div>
  )
})

ItemsStickersList.displayName = 'ItemsStickersList'
