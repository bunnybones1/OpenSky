import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardsFilterState,
  updateMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.HEALTH_DESCENDING,
  CARD_SORTING_OPTIONS.POWER_DESCENDING,
  CARD_SORTING_OPTIONS.MANA_ASCENDING,
  CARD_SORTING_OPTIONS.MANA_DESCENDING,
  CARD_SORTING_OPTIONS.PRICE_ASCENDING,
  CARD_SORTING_OPTIONS.PRICE_DESCENDING,
  CARD_SORTING_OPTIONS.QUANTITY_ASCENDING,
  CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
] as const

const IDENTITY_OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.HEALTH_DESCENDING,
  CARD_SORTING_OPTIONS.POWER_DESCENDING,
  CARD_SORTING_OPTIONS.MANA_ASCENDING,
  CARD_SORTING_OPTIONS.MANA_DESCENDING,
  CARD_SORTING_OPTIONS.QUANTITY_ASCENDING,
  CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
] as const

export const MarketCardsSortSelect = memo(() => {
  const { sort } = useSnapshot(marketCardsFilterState)
  const isIdentityMarket = env.AUTH_MODE === 'google'
  const selectedSort =
    isIdentityMarket &&
    (sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING ||
      sort === CARD_SORTING_OPTIONS.PRICE_DESCENDING)
      ? CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
      : sort
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateMarketCardsFilterState('sort', newSort)
      dispatch(push(makeMarketCardsRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect
      optionsToUse={isIdentityMarket ? IDENTITY_OPTIONS_TO_USE : OPTIONS_TO_USE}
      sort={selectedSort}
      onChange={onChange}
    />
  )
})

MarketCardsSortSelect.displayName = 'MarketCardsSortSelect'
