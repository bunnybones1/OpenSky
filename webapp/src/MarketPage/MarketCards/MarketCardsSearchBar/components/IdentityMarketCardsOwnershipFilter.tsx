/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardsFilterState,
  updateMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const IdentityMarketCardsOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(marketCardsFilterState)
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilter) => {
      if (value !== OwnershipFilter.OWNED) {
        updateMarketCardsFilterState('onlyDuplicates', false)
      }
      updateMarketCardsFilterState('ownership', value)
      dispatch(push(makeMarketCardsRoute()))
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

IdentityMarketCardsOwnershipFilter.displayName = 'IdentityMarketCardsOwnershipFilter'
