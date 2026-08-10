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

export const MarketHeroesSortSelect = memo(() => {
  const { sort } = useSnapshot(marketHeroesFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateMarketHeroesFilters('sort', newSort)
      dispatch(push(makeMarketHeroSkinsRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect optionsToUse={OPTIONS_TO_USE} sort={sort} onChange={onChange} />
  )
})

MarketHeroesSortSelect.displayName = 'MarketHeroesSortSelect'
