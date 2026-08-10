import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardsFilterState,
  updateMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'

export const MarketCardsSearchInput = memo(() => {
  const { search } = useSnapshot(marketCardsFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateMarketCardsFilterState('search', value)
      dispatch(push(makeMarketCardsRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

MarketCardsSearchInput.displayName = 'MarketCardsSearchInput'
