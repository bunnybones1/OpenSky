import { memo } from 'react'

import { CardListLoader } from '~/shared/components/CardListLoader/CardListLoader'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import {
  BASE_COLUMN_GAP,
  DEFAULT_LIST,
  HERO_SKIN_RATIO,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X
} from '~/shared/constants/ui'
import { useCardListNumColumns } from '~/shared/hooks/cards/useCardListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketHero, MarketHeroProps } from './components/MarketHero'
import { useMarketHeroesList } from './hooks/useMarketHeroesList'

const PADDING_BOTTOM = 60 as const

const Loader = memo(() => {
  return <CardListLoader paddingBottom={`${PADDING_BOTTOM}px`} />
})

Loader.displayName = 'Loader'

const getId = ({ id }: MarketHeroProps) => {
  return id
}

export const MarketHeroesList = memo(() => {
  const numColumns = useCardListNumColumns()

  const { marketHeroSkinList } = useMarketHeroesList()

  const { estimateSize, listParentRef } = useEstimateVirtualizedItemSize({
    numColumns,
    columnGap: BASE_COLUMN_GAP,
    paddingBottom: PADDING_BOTTOM,
    ratio: HERO_SKIN_RATIO
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
      <VirtualizedItemList<MarketHeroProps>
        ItemComponent={MarketHero}
        getItemId={getId}
        ListLoader={Loader}
        items={marketHeroSkinList || DEFAULT_LIST}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        estimateSize={estimateSize}
        numColumns={numColumns}
        isLoadingList={marketHeroSkinList === undefined}
      />
    </div>
  )
})

MarketHeroesList.displayName = 'MarketHeroesList'
