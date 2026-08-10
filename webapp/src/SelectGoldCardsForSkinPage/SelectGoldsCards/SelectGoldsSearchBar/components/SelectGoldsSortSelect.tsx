import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeSelectGoldsRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux'
import {
  selectGoldsFilterState,
  updateSelectGoldsFilterState
} from '~/shared/state/select-golds/select-golds-filter-state'
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

export const SelectGoldsSortSelect = memo(() => {
  const { sort } = useSnapshot(selectGoldsFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateSelectGoldsFilterState('sort', newSort)
      dispatch(push(makeSelectGoldsRoute()))
    },
    [dispatch]
  )

  return (
    <ItemsSortSelect optionsToUse={OPTIONS_TO_USE} sort={sort} onChange={onChange} />
  )
})

SelectGoldsSortSelect.displayName = 'SelectGoldsSortSelect'
