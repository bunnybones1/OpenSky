/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeItemsHeroesRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsHeroesFilterState,
  updateItemsHeroesFilters
} from '~/shared/state/items-heroes/items-heroes-filter-state'
import { OwnershipFilter as OwnershipFilterType } from '~/shared/types/cards'

export const ItemsHeroesOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(itemsHeroesFilterState)

  const dispatch = useDispatch()

  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilterType) => {
      updateItemsHeroesFilters('ownership', value)
      dispatch(push(makeItemsHeroesRoute()))
    },
    [dispatch]
  )

  return (
    <OwnershipFilterSelect
      ownedText={t('heroes.MySkins')}
      ownership={ownership}
      onChange={onChange}
    />
  )
})

ItemsHeroesOwnershipFilter.displayName = 'ItemsHeroesOwnershipFilter'
