/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketHeroesFilterState,
  updateMarketHeroesFilters
} from '~/shared/state/market-heroes/market-heroes-filter-state'
import { OwnershipFilter as OwnershipFilterType } from '~/shared/types/cards'

export const MarketHeroesOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(marketHeroesFilterState)

  const dispatch = useDispatch()

  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilterType) => {
      updateMarketHeroesFilters('ownership', value)
      dispatch(push(makeMarketHeroSkinsRoute()))
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

MarketHeroesOwnershipFilter.displayName = 'MarketHeroesOwnershipFilter'
