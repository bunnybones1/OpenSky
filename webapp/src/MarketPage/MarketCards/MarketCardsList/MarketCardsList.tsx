import { SwapType } from '@0xsequence/metadata'
import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import env from '~/env'
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
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { updateMarketCardsState } from '~/shared/state/market-cards/market-cards-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { CARD_SORTING_OPTIONS, OwnershipFilter } from '~/shared/types/cards'

import { MarketCard, MarketCardProps } from './MarketCard/MarketCard'

const Loader = memo(() => {
  return <CardListLoader paddingBottom={`${MARKET_CARD_PADDING_BOTTOM}px`} />
})

Loader.displayName = 'Loader'

const getId = ({ id }: MarketCardProps) => {
  return id
}

export const MarketCardsList = memo(() => {
  const filters = useSnapshot(marketCardsFilterState)

  const mode =
    filters.ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY
  const numColumns = useCardListNumColumns()

  const onUpdate = useCallback((numResults?: number) => {
    updateMarketCardsState('numSearchResults', numResults)
  }, [])

  const isIdentityMarket = env.AUTH_MODE === 'google'
  const identitySort =
    filters.sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING ||
    filters.sort === CARD_SORTING_OPTIONS.PRICE_DESCENDING
      ? CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
      : filters.sort
  const cards = useFilteredCardsList(
    isIdentityMarket ? { ...filters, sort: identitySort } : filters,
    isIdentityMarket ? onUpdate : undefined
  )

  const { sortedCards: priceSortedCards } = usePriceSortedCards({
    cards,
    sort: filters.sort,
    grade: filters.grade,
    mode,
    disabled: isIdentityMarket,
    onUpdate: isIdentityMarket ? undefined : onUpdate
  })
  const sortedCards = isIdentityMarket ? cards : priceSortedCards

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
      <VirtualizedItemList<MarketCardProps>
        ItemComponent={MarketCard}
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

MarketCardsList.displayName = 'MarketCardsList'
