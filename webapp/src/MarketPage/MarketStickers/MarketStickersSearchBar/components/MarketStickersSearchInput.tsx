import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeMarketStickersRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketStickersFilterState,
  updateMarketStickersFilters
} from '~/shared/state/market-stickers/market-stickers-filter-state'

export const MarketStickersSearchInput = memo(() => {
  const { search } = useSnapshot(marketStickersFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateMarketStickersFilters('search', value)
      dispatch(push(makeMarketStickersRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

MarketStickersSearchInput.displayName = 'MarketStickersSearchInput'
