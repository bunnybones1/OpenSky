import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeMarketStickersRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketStickersFilterState,
  updateMarketStickersFilters
} from '~/shared/state/market-stickers/market-stickers-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.PRICE_ASCENDING,
  CARD_SORTING_OPTIONS.PRICE_DESCENDING
] as const

export const MarketStickersSortSelect = memo(() => {
  const { sort } = useSnapshot(marketStickersFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateMarketStickersFilters('sort', newSort)
      dispatch(push(makeMarketStickersRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect optionsToUse={OPTIONS_TO_USE} sort={sort} onChange={onChange} />
  )
})

MarketStickersSortSelect.displayName = 'MarketStickersSortSelect'
