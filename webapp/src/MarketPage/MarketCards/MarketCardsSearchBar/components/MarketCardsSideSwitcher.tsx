import { SwapType } from '@0xsequence/metadata'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'

import { SideSwitcher } from '~/MarketPage/shared/components/SideSwitcher'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import { updateMarketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'
import { MarketMode } from '~/shared/types/market'

import { useMarketCardsShopMode } from '../../../shared/hooks/useMarketCardsShopMode'

export const MarketCardsSideSwitcher = memo(() => {
  const mode = useMarketCardsShopMode()
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: MarketMode) => {
      if (value !== mode) {
        if (value === SwapType.SELL) {
          updateMarketCardsFilterState('ownership', OwnershipFilter.OWNED)
        } else {
          updateMarketCardsFilterState('onlyDuplicates', false)
          updateMarketCardsFilterState('ownership', OwnershipFilter.ALL)
        }

        dispatch(push(makeMarketCardsRoute()))
      }
    },
    [dispatch, mode]
  )

  return <SideSwitcher mode={mode} onChange={onChange} />
})

MarketCardsSideSwitcher.displayName = 'MarketCardsSideSwitcher'
