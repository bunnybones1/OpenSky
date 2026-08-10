import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

declare module 'valtio' {
  function useSnapshot<T extends object>(p: T): T
}

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  updateItemsCardsFilter
} from '~/shared/state/items-cards/items-cards-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const ItemsCardsPrismFilter = memo(() => {
  const dispatch = useDispatch()

  const { prism } = useSnapshot(itemsCardsFiltersState)

  const onChange = useCallback(
    (newPrisms: FilterablePrism[]) => {
      updateItemsCardsFilter('prism', newPrisms)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  return <ItemsPrismFilter onChange={onChange} prism={prism} />
})

ItemsCardsPrismFilter.displayName = 'ItemsCardsPrismFilter'
