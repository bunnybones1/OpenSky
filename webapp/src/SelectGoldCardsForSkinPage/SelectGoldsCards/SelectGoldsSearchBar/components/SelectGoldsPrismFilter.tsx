import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeSelectGoldsRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux'
import {
  selectGoldsFilterState,
  updateSelectGoldsFilterState
} from '~/shared/state/select-golds/select-golds-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const SelectGoldsPrismFilter = memo(() => {
  const dispatch = useDispatch()

  const { prism } = useSnapshot(selectGoldsFilterState)

  const onChange = useCallback(
    (newPrisms: FilterablePrism[]) => {
      updateSelectGoldsFilterState('prism', newPrisms)
      dispatch(push(makeSelectGoldsRoute()))
    },
    [dispatch]
  )

  return <ItemsPrismFilter onChange={onChange} prism={prism} />
})

SelectGoldsPrismFilter.displayName = 'SelectGoldsPrismFilter'
