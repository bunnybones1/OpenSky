import { DeckRank } from '@opensky/proto'
import { PrismClass } from '@opensky/shared/constants'
import { getDeckClassFromPrisms } from '@opensky/shared/helpers'
import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { DecksListLoader } from '~/shared/components/DeckListLoader/DeckListLoader'
import { VirtualizedItemList } from '~/shared/components/VirtualizedItemList'
import { DECK_RATIO } from '~/shared/constants/ui'
import {
  BASE_COLUMN_GAP,
  DEFAULT_LIST,
  ITEM_LIST_PADDING_BOTTOM,
  ITEM_LIST_PADDING_X
} from '~/shared/constants/ui'
import { useDeckListNumColumns } from '~/shared/hooks/decks/useDeckListNumColumns'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { useMarketDecks } from '~/shared/queries/decks/useMarketDecks'
import { marketDecksFilterState } from '~/shared/state/market-decks/market-decks-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketDeck } from './MarketDeck/MarketDeck'

const getId = (deckRank: DeckRank) => deckRank.deckString

const PADDING_BOTTOM = 60

const MarketDeckListLoader = memo(() => <DecksListLoader paddingBottom="60px" />)

MarketDeckListLoader.displayName = 'MarketDeckListLoader'

export const MarketDecksList = memo(() => {
  const numColumns = useDeckListNumColumns()

  const { listParentRef, estimateSize } = useEstimateVirtualizedItemSize({
    numColumns,
    ratio: DECK_RATIO,
    paddingBottom: PADDING_BOTTOM,
    columnGap: BASE_COLUMN_GAP
  })

  const { column, prisms } = useSnapshot(marketDecksFilterState)

  const deckClass = useMemo(() => {
    return getDeckClassFromPrisms(
      // eslint-disable-next-line valtio/state-snapshot-rule
      prisms.map((prism) => prism.toUpperCase()) as PrismClass[]
    )
  }, [prisms])

  const { data: marketDecks } = useMarketDecks({ deckClass, column })

  return (
    <div
      className={Sprinkles({
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        display: 'flex',
        width: 'full',
        paddingX: ITEM_LIST_PADDING_BOTTOM,
        paddingBottom: ITEM_LIST_PADDING_X
      })}
      ref={listParentRef}
    >
      <VirtualizedItemList<DeckRank>
        ItemComponent={MarketDeck}
        getItemId={getId}
        ListLoader={MarketDeckListLoader}
        estimateSize={estimateSize}
        items={marketDecks || DEFAULT_LIST}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        numColumns={numColumns}
        isLoadingList={marketDecks === undefined}
      />
    </div>
  )
})

MarketDecksList.displayName = 'MarketDecksList'
