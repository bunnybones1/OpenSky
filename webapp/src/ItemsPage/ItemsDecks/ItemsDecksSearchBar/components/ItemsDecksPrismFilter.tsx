import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useDispatch } from '~/shared/redux'
import {
  itemsDecksFilterState,
  updateItemsDecksFilter
} from '~/shared/state/items-decks/items-decks-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const ItemsDecksPrismFilter = memo(() => {
  const dispatch = useDispatch()

  const { prism } = useSnapshot(itemsDecksFilterState)

  const onChange = useCallback(
    (newPrisms: FilterablePrism[]) => {
      updateItemsDecksFilter('prism', newPrisms)
      dispatch(push(makeItemsDecksRoute()))
    },
    [dispatch]
  )

  return <ItemsPrismFilter onChange={onChange} prism={prism} />
})

ItemsDecksPrismFilter.displayName = 'ItemsDecksPrismFilter'
