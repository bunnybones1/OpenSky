import { SwapType } from '@0xsequence/metadata'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'

import { SideSwitcher } from '~/MarketPage/shared/components/SideSwitcher'
import { makeMarketCardBacksRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import { updateMarketCardBacksFilters } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'
import { MarketMode } from '~/shared/types/market'

import { useMarketCardBacksShopMode } from '../../shared/hooks/useMarketCardBaksShopMode'

export const MarketCardBacksSideSwitcher = memo(() => {
  const mode = useMarketCardBacksShopMode()
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: MarketMode) => {
      if (value !== mode) {
        if (value === SwapType.SELL) {
          updateMarketCardBacksFilters('ownership', OwnershipFilter.OWNED)
        } else {
          updateMarketCardBacksFilters('ownership', OwnershipFilter.ALL)
        }

        dispatch(push(makeMarketCardBacksRoute()))
      }
    },
    [dispatch, mode]
  )

  return <SideSwitcher mode={mode} onChange={onChange} />
})

MarketCardBacksSideSwitcher.displayName = 'MarketCardBacksSideSwitcher'
