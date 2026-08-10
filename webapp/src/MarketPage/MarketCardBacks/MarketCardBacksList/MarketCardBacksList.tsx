import { memo } from 'react'

import { CardListLoader } from '~/shared/components/CardListLoader/CardListLoader'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { CARD_RATIO } from '~/shared/constants/ui'
import {
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X,
  MARKET_CARD_PADDING_BOTTOM
} from '~/shared/constants/ui'
import { useCardListNumColumns } from '~/shared/hooks/cards/useCardListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useMarketCardBacksList } from './hooks/useMarketCardBacksList'
import { MarketCardBack, MarketCardBackProps } from './MarketCardBack/MarketCardBack'

const getId = ({ id }: MarketCardBackProps) => {
  return id
}

const COLUMN_GAP = 32 as const

const Loader = memo(() => {
  return <CardListLoader paddingBottom={`${MARKET_CARD_PADDING_BOTTOM}px`} />
})

Loader.displayName = 'Loader'

export const MarketCardBacksList = memo(() => {
  const numColumns = useCardListNumColumns()

  const { marketCardBacksList } = useMarketCardBacksList()

  const { estimateSize, listParentRef } = useEstimateVirtualizedItemSize({
    numColumns,
    columnGap: COLUMN_GAP,
    paddingBottom: MARKET_CARD_PADDING_BOTTOM,
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
      <VirtualizedItemList<MarketCardBackProps>
        ItemComponent={MarketCardBack}
        getItemId={getId}
        ListLoader={Loader}
        items={marketCardBacksList || DEFAULT_LIST}
        columnGap={`${COLUMN_GAP}px`}
        rowPaddingBottom={`${MARKET_CARD_PADDING_BOTTOM}px`}
        estimateSize={estimateSize}
        numColumns={numColumns}
        isLoadingList={marketCardBacksList === undefined}
      />
    </div>
  )
})

MarketCardBacksList.displayName = 'MarketCardBacksList'
