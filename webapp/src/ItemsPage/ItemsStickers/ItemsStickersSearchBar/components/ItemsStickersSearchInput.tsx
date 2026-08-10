import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeItemsStickersRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsStickersFilterState,
  updateItemsStickersFilters
} from '~/shared/state/items-stickers/items-stickers-filter-state'

export const ItemsStickersSearchInput = memo(() => {
  const { search } = useSnapshot(itemsStickersFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateItemsStickersFilters('search', value)
      dispatch(push(makeItemsStickersRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

ItemsStickersSearchInput.displayName = 'ItemsStickersSearchInput'
