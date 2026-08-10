import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  updateItemsCardsFilter
} from '~/shared/state/items-cards/items-cards-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const optionsToUse = [
  CARD_SORTING_OPTIONS.HEALTH_DESCENDING,
  CARD_SORTING_OPTIONS.POWER_DESCENDING,
  CARD_SORTING_OPTIONS.MANA_ASCENDING,
  CARD_SORTING_OPTIONS.MANA_DESCENDING,
  CARD_SORTING_OPTIONS.DATE_RECIEVED_ASCENDING,
  CARD_SORTING_OPTIONS.DATE_RECIEVED_DESCENDING
] as const

export const ItemsCardsSortSelect = memo(() => {
  const { sort } = useSnapshot(itemsCardsFiltersState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateItemsCardsFilter('sort', newSort)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect optionsToUse={optionsToUse} sort={sort} onChange={onChange} />
  )
})

ItemsCardsSortSelect.displayName = 'ItemsCardsSortSelect'
