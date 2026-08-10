import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

declare module 'valtio' {
  function useSnapshot<T extends object>(p: T): T
}

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardsFilterState,
  updateMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const MarketCardsPrismFilter = memo(() => {
  const dispatch = useDispatch()

  const { prism } = useSnapshot(marketCardsFilterState)

  const onChange = useCallback(
    (newPrisms: FilterablePrism[]) => {
      updateMarketCardsFilterState('prism', newPrisms)
      dispatch(push(makeMarketCardsRoute()))
    },
    [dispatch]
  )

  return <ItemsPrismFilter onChange={onChange} prism={prism} />
})

MarketCardsPrismFilter.displayName = 'MarketCardsPrismFilter'
