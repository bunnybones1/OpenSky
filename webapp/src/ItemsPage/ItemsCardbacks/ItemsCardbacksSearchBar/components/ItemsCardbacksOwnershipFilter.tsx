/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeItemsCardBacksRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardbacksFilterState,
  updateItemsCardbacksFilters
} from '~/shared/state/items-cardbacks/items-cardbacks-filter-state'
import { OwnershipFilter as OwnershipFilterType } from '~/shared/types/cards'

export const ItemsCardbacksOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(itemsCardbacksFilterState)

  const dispatch = useDispatch()

  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilterType) => {
      updateItemsCardbacksFilters('ownership', value)
      dispatch(push(makeItemsCardBacksRoute()))
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

ItemsCardbacksOwnershipFilter.displayName = 'ItemsCardbacksOwnershipFilter'
