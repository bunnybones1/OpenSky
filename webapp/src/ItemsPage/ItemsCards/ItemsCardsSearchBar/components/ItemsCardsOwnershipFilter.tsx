/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  updateItemsCardsFilter
} from '~/shared/state/items-cards/items-cards-filter-state'
import { OwnershipFilter as OwnershipFilterType } from '~/shared/types/cards'

export const ItemsCardsOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(itemsCardsFiltersState)

  const dispatch = useDispatch()

  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilterType) => {
      if (value === OwnershipFilterType.LOCKED) {
        updateItemsCardsFilter('onlyDuplicates', false)
      }
      updateItemsCardsFilter('ownership', value)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  return (
    <OwnershipFilterSelect
      ownedText={t('cards.MyCards')}
      ownership={ownership}
      onChange={onChange}
    />
  )
})

ItemsCardsOwnershipFilter.displayName = 'ItemsCardsOwnershipFilter'
