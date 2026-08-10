import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeSelectSilversRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux'
import {
  selectSilversFilterState,
  updateSelectSilversFilterState
} from '~/shared/state/select-silvers/select-silvers-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const OPTIONS_TO_USE = [
  // Dont think we need these on this page, but uncomment if we do
  // CARD_SORTING_OPTIONS.HEALTH_DESCENDING,
  // CARD_SORTING_OPTIONS.POWER_DESCENDING,
  // CARD_SORTING_OPTIONS.MANA_ASCENDING,
  // CARD_SORTING_OPTIONS.MANA_DESCENDING,
  CARD_SORTING_OPTIONS.PRICE_ASCENDING,
  CARD_SORTING_OPTIONS.PRICE_DESCENDING
] as const

export const SelectSilversSortSelect = memo(() => {
  const { sort } = useSnapshot(selectSilversFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateSelectSilversFilterState('sort', newSort)
      dispatch(push(makeSelectSilversRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect optionsToUse={OPTIONS_TO_USE} sort={sort} onChange={onChange} />
  )
})

SelectSilversSortSelect.displayName = 'SelectSilversSortSelect'
