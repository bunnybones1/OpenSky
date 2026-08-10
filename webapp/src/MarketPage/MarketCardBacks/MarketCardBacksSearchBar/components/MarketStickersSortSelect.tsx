import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeMarketCardBacksRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardBacksFilterState,
  updateMarketCardBacksFilters
} from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.PRICE_ASCENDING,
  CARD_SORTING_OPTIONS.PRICE_DESCENDING
] as const

export const MarketCardBacksSortSelect = memo(() => {
  const { sort } = useSnapshot(marketCardBacksFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateMarketCardBacksFilters('sort', newSort)
      dispatch(push(makeMarketCardBacksRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect optionsToUse={OPTIONS_TO_USE} sort={sort} onChange={onChange} />
  )
})

MarketCardBacksSortSelect.displayName = 'MarketCardBacksSortSelect'
