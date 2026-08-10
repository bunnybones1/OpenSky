import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeSelectSilversRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux'
import {
  selectSilversFilterState,
  updateSelectSilversFilterState
} from '~/shared/state/select-silvers/select-silvers-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const SelectSilversPrismFilter = memo(() => {
  const dispatch = useDispatch()

  const { prism } = useSnapshot(selectSilversFilterState)

  const onChange = useCallback(
    (newPrisms: FilterablePrism[]) => {
      updateSelectSilversFilterState('prism', newPrisms)
      dispatch(push(makeSelectSilversRoute()))
    },
    [dispatch]
  )

  return <ItemsPrismFilter onChange={onChange} prism={prism} />
})

SelectSilversPrismFilter.displayName = 'SelectSilversPrismFilter'
