/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeMarketStickersRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketStickersFilterState,
  updateMarketStickersFilters
} from '~/shared/state/market-stickers/market-stickers-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const IdentityMarketStickersOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(marketStickersFilterState)
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilter) => {
      updateMarketStickersFilters('ownership', value)
      dispatch(push(makeMarketStickersRoute()))
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

IdentityMarketStickersOwnershipFilter.displayName =
  'IdentityMarketStickersOwnershipFilter'
