import clsx from 'clsx'
import { ComponentType, createElement, memo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import {
  ItemListSprinkles,
  ItemListSprinklesParams,
  ItemListStyle
} from '~/shared/style/ItemList.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { usePaginatedItems } from './hooks/usePaginatedItems'
import { usePaginateOnScroll } from './hooks/usePaginateOnScroll'

interface ItemListProps<T> {
  ItemComponent: ComponentType<T>
  items: T[]
  numColumns: ItemListSprinklesParams['gridTemplateColumns']
  rowGap: ItemListSprinklesParams['rowGap']
  columnGap: ItemListSprinklesParams['columnGap']
  pageSize?: number
  isLoadingList?: boolean
  ListLoader?: ComponentType
  getItemId: (item: T) => number | string
  onPageLoad?: (page: number) => void
  lastPageLoaded?: number
}

const _ItemList = <T,>({
  numColumns,
  rowGap,
  columnGap,
  items,
  pageSize,
  ItemComponent,
  getItemId,
  onPageLoad,
  lastPageLoaded,
  isLoadingList,
  ListLoader
}: ItemListProps<T>) => {
  const { paginatedItems, loadNextPage } = usePaginatedItems({
    items,
    pageSize,
    onPageLoad,
    lastPageLoaded
  })
  const { scrollContainerRef } = usePaginateOnScroll(loadNextPage)

  if (isLoadingList) {
    if (ListLoader) return <ListLoader />
    return (
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '32px'
        })}
      >
        <Icon type="spinner" color="white" height="32px" />
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className={clsx(
        ItemListStyle,
        ItemListSprinkles({ gridTemplateColumns: numColumns, rowGap, columnGap })
      )}
    >
      {paginatedItems.map((item) =>
        createElement(ItemComponent as ComponentType<any>, {
          ...(item as object),
          key: getItemId(item)
        })
      )}
    </div>
  )
}

export const ItemList = memo(_ItemList) as typeof _ItemList

_ItemList.displayName = 'ItemList'
