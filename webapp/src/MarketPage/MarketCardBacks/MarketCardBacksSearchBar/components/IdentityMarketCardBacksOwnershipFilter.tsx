/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeMarketCardBacksRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardBacksFilterState,
  updateMarketCardBacksFilters
} from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const IdentityMarketCardBacksOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(marketCardBacksFilterState)
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilter) => {
      updateMarketCardBacksFilters('ownership', value)
      dispatch(push(makeMarketCardBacksRoute()))
    },
    [dispatch]
  )

  return (
    <OwnershipFilterSelect
      ownedText={t('cardBacks.MyCardBacks')}
      ownership={ownership}
      onChange={onChange}
    />
  )
})

IdentityMarketCardBacksOwnershipFilter.displayName =
  'IdentityMarketCardBacksOwnershipFilter'
