import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeMarketDecksSearchRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketDecksFilterState,
  updateMarketDecksFilterState
} from '~/shared/state/market-decks/market-decks-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const MarketDecksPrismFilter = memo(() => {
  const dispatch = useDispatch()

  const { prisms } = useSnapshot(marketDecksFilterState)

  const onChange = useCallback(
    (changedPrisms: FilterablePrism[]) => {
      let newPrisms: FilterablePrism[] = changedPrisms

      if (changedPrisms.length > 2) {
        newPrisms = [
          changedPrisms[changedPrisms.length - 2],
          changedPrisms[changedPrisms.length - 1]
        ]
      }

      updateMarketDecksFilterState('prisms', newPrisms)
      dispatch(push(makeMarketDecksSearchRoute()))
    },
    [dispatch]
  )

  return <ItemsPrismFilter onChange={onChange} prism={prisms} />
})

MarketDecksPrismFilter.displayName = 'MarketDecksPrismFilter'
