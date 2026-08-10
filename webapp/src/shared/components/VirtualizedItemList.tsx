import { useWindowVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import { chunk } from 'lodash-es'
import {
  ComponentType,
  createElement,
  useLayoutEffect,
  useMemo,
  useRef
} from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import {
  ItemListSprinkles,
  ItemListSprinklesParams
} from '~/shared/style/ItemList.css'
import { Sprinkles, SprinklesParams } from '~/shared/style/Sprinkles.css'

interface VirtualItemListProps<T> {
  ItemComponent: ComponentType<T>
  items: T[]
  numColumns: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  getItemId: (item: T) => number | string
  estimateSize: (index: number) => number
  rowPaddingBottom?: SprinklesParams['paddingBottom']
  isLoadingList?: boolean
  ListLoader?: ComponentType
  columnGap?: ItemListSprinklesParams['columnGap']
  paddingStart?: number
  paddingEnd?: number
}

export const VirtualizedItemList = <T,>({
  estimateSize,
  items,
  numColumns,
  ItemComponent,
  getItemId,
  columnGap,
  paddingStart,
  paddingEnd,
  rowPaddingBottom,
  isLoadingList,
  ListLoader
}: VirtualItemListProps<T>) => {
  const parentOffsetRef = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0
  }, [])

  const chunkedItems = useMemo(() => {
    return chunk(items, numColumns)
  }, [items, numColumns])

  const virtualizer = useWindowVirtualizer({
    count: chunkedItems.length,
    estimateSize,
    paddingStart,
    paddingEnd,
    scrollMargin: parentOffsetRef.current,
    overscan: 4
  })

  const numColumnsParam = useMemo<
    ItemListSprinklesParams['gridTemplateColumns']
  >(() => {
    if (numColumns === 1) return 'one'
    if (numColumns === 2) return 'two'
    if (numColumns === 3) return 'three'
    if (numColumns === 4) return 'four'
    if (numColumns === 5) return 'five'
    if (numColumns === 6) return 'six'
    if (numColumns === 7) return 'seven'
    return 'eight'
  }, [numColumns])

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
    <div ref={parentRef} className={Sprinkles({ width: 'full' })}>
      <div
        className={Sprinkles({ position: 'relative', width: 'full' })}
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className={clsx(
              Sprinkles({
                position: 'absolute',
                top: 0,
                left: 0,
                width: 'full',
                display: 'grid',
                paddingBottom: rowPaddingBottom,
                zIndex: 1
              }),
              ItemListSprinkles({ gridTemplateColumns: numColumnsParam, columnGap })
            )}
            style={{
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {chunkedItems[virtualRow.index].map((item) =>
              createElement(ItemComponent as ComponentType<any>, {
                ...(item as object),
                key: getItemId(item)
              })
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

VirtualizedItemList.displayName = 'VirtualizedItemList'
