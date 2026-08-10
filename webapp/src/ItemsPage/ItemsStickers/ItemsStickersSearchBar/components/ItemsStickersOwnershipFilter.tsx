/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeItemsStickersRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsStickersFilterState,
  updateItemsStickersFilters
} from '~/shared/state/items-stickers/items-stickers-filter-state'
import { OwnershipFilter as OwnershipFilterType } from '~/shared/types/cards'

export const ItemsStickersOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(itemsStickersFilterState)

  const dispatch = useDispatch()

  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilterType) => {
      updateItemsStickersFilters('ownership', value)
      dispatch(push(makeItemsStickersRoute()))
    },
    [dispatch]
  )

  return (
    <OwnershipFilterSelect
      ownedText={t('dashboard.stickers.ownershipFilter.OWNED')}
      ownership={ownership}
      onChange={onChange}
    />
  )
})

ItemsStickersOwnershipFilter.displayName = 'ItemsStickersOwnershipFilter'
