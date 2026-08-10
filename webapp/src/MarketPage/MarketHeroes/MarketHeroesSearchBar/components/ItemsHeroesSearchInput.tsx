import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketHeroesFilterState,
  updateMarketHeroesFilters
} from '~/shared/state/market-heroes/market-heroes-filter-state'

export const MarketHeroesSearchInput = memo(() => {
  const { search } = useSnapshot(marketHeroesFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateMarketHeroesFilters('search', value)
      dispatch(push(makeMarketHeroSkinsRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

MarketHeroesSearchInput.displayName = 'MarketHeroesSearchInput'
