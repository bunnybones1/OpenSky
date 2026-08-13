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

const IDENTITY_OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.QUANTITY_ASCENDING,
  CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
] as const

interface MarketCardBacksSortSelectProps {
  inventoryOnly?: boolean
}

export const MarketCardBacksSortSelect = memo(
  ({ inventoryOnly }: MarketCardBacksSortSelectProps) => {
    const { sort } = useSnapshot(marketCardBacksFilterState)
    const selectedSort =
      inventoryOnly &&
      (sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING ||
        sort === CARD_SORTING_OPTIONS.PRICE_DESCENDING)
        ? CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
        : sort
    const dispatch = useDispatch()

    const onChange = useCallback(
      (newSort: CARD_SORTING_OPTIONS) => {
        updateMarketCardBacksFilters('sort', newSort)
        dispatch(push(makeMarketCardBacksRoute()))
      },
      [dispatch]
    )

    return (
      <ItemsSortSelect
        optionsToUse={inventoryOnly ? IDENTITY_OPTIONS_TO_USE : OPTIONS_TO_USE}
        sort={selectedSort}
        onChange={onChange}
      />
    )
  }
)

MarketCardBacksSortSelect.displayName = 'MarketCardBacksSortSelect'
