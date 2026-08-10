import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeMarketCardBacksRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardBacksFilterState,
  updateMarketCardBacksFilters
} from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'

export const MarketCardBacksSearchInput = memo(() => {
  const { search } = useSnapshot(marketCardBacksFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateMarketCardBacksFilters('search', value)
      dispatch(push(makeMarketCardBacksRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

MarketCardBacksSearchInput.displayName = 'MarketCardBacksSearchInput'
