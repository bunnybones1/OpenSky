import { memo } from 'react'

import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import {
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X,
  STICKER_RATIO
} from '~/shared/constants/ui'
import { useStickerListNumColumns } from '~/shared/hooks/stickers/useStickerListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useMarketStickersList } from './hooks/useMarketStickersList'
import { MarketSticker, MarketStickerProps } from './MarketSticker/MarketSticker'

const PADDING_BOTTOM = 120 as const
const COLUMN_GAP = 20 as const

const getId = ({ id }: MarketStickerProps) => {
  return id
}

interface MarketStickersListProps {
  inventoryOnly?: boolean
}

const IdentityMarketSticker = memo((props: MarketStickerProps) => (
  <MarketSticker {...props} inventoryOnly />
))

IdentityMarketSticker.displayName = 'IdentityMarketSticker'

export const MarketStickersList = memo(
  ({ inventoryOnly }: MarketStickersListProps) => {
    const numColumns = useStickerListNumColumns()

    const { marketStickerList } = useMarketStickersList(inventoryOnly)

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
        <VirtualizedItemList<MarketStickerProps>
          ItemComponent={inventoryOnly ? IdentityMarketSticker : MarketSticker}
          getItemId={getId}
          items={marketStickerList || DEFAULT_LIST}
          columnGap={`${COLUMN_GAP}px`}
          rowPaddingBottom={`${PADDING_BOTTOM}px`}
          estimateSize={estimateSize}
          numColumns={numColumns}
          isLoadingList={marketStickerList === undefined}
        />
      </div>
    )
  }
)

MarketStickersList.displayName = 'MarketStickersList'
