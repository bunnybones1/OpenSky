import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  updateItemsCardsFilter
} from '~/shared/state/items-cards/items-cards-filter-state'

export const ItemsCardsSearchInput = memo(() => {
  const { search } = useSnapshot(itemsCardsFiltersState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateItemsCardsFilter('search', value)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

ItemsCardsSearchInput.displayName = 'ItemsCardsSearchInput'
