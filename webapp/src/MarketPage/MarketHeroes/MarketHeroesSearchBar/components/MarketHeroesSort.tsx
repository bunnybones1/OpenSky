import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketHeroesFilterState,
  updateMarketHeroesFilters
} from '~/shared/state/market-heroes/market-heroes-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.PRICE_ASCENDING,
  CARD_SORTING_OPTIONS.PRICE_DESCENDING
] as const

const IDENTITY_OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.QUANTITY_ASCENDING,
  CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
] as const

interface MarketHeroesSortSelectProps {
  inventoryOnly?: boolean
}

export const MarketHeroesSortSelect = memo(
  ({ inventoryOnly }: MarketHeroesSortSelectProps) => {
    const { sort } = useSnapshot(marketHeroesFilterState)
    const selectedSort =
      inventoryOnly &&
      (sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING ||
        sort === CARD_SORTING_OPTIONS.PRICE_DESCENDING)
        ? CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
        : sort
    const dispatch = useDispatch()

    const onChange = useCallback(
      (newSort: CARD_SORTING_OPTIONS) => {
        updateMarketHeroesFilters('sort', newSort)
        dispatch(push(makeMarketHeroSkinsRoute()))
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

MarketHeroesSortSelect.displayName = 'MarketHeroesSortSelect'
