import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeItemsHeroesRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsHeroesFilterState,
  updateItemsHeroesFilters
} from '~/shared/state/items-heroes/items-heroes-filter-state'

export const ItemsHeroesSearchInput = memo(() => {
  const { search } = useSnapshot(itemsHeroesFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateItemsHeroesFilters('search', value)
      dispatch(push(makeItemsHeroesRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

ItemsHeroesSearchInput.displayName = 'ItemsStickersSearchInput'
