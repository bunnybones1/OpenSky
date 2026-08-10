import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

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
import { useFilteredHeroSkinsList } from '~/shared/hooks/hero-skins/useFilteredHeroSkinsList'
import { useEstimateVirtualizedItemSize } from '~/shared/hooks/useEstimateVirtualizedItemSize'
import { itemsHeroesFilterState } from '~/shared/state/items-heroes/items-heroes-filter-state'
import { updateItemsHeroesState } from '~/shared/state/items-heroes/items-heroes-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsHero, ItemsHeroProps } from './ItemsHero/ItemsHero'

const PADDING_BOTTOM = 60 as const

const Loader = memo(() => {
  return <CardListLoader paddingBottom={`${PADDING_BOTTOM}px`} />
})

Loader.displayName = 'Loader'

const getId = ({ id }: ItemsHeroProps) => {
  return id
}

export const ItemsHeroesList = memo(() => {
  const filters = useSnapshot(itemsHeroesFilterState)

  const numColumns = useCardListNumColumns()

  const onUpdate = useCallback((numResults: number) => {
    updateItemsHeroesState('numSearchResults', numResults)
  }, [])

  const { heroSkinList } = useFilteredHeroSkinsList(filters, onUpdate)

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
      <VirtualizedItemList<ItemsHeroProps>
        ItemComponent={ItemsHero}
        getItemId={getId}
        ListLoader={Loader}
        items={heroSkinList || DEFAULT_LIST}
        columnGap={`${BASE_COLUMN_GAP}px`}
        rowPaddingBottom={`${PADDING_BOTTOM}px`}
        estimateSize={estimateSize}
        numColumns={numColumns}
        isLoadingList={heroSkinList === undefined}
      />
    </div>
  )
})

ItemsHeroesList.displayName = 'ItemsHeroesList'
