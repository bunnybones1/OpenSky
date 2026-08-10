import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { marketCardBacksFilterState } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { marketCardBacksState } from '~/shared/state/market-cardbacks/market-cardbacks-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const MarketCardBacksEmptyList = memo(() => {
  const { ownership, search } = useSnapshot(marketCardBacksFilterState)
  const { numSearchResults } = useSnapshot(marketCardBacksState)
  const { t } = useTranslation()
  const { navigateToSkypass } = useNavigateToSkyPass()

  if (numSearchResults !== 0) return null

  return (
    <EmptyItemsList
      text={
        !!search || ownership !== OwnershipFilter.OWNED
          ? undefined
          : t('search.noResultsCardBacks')
      }
      ctaText={
        !!search || ownership !== OwnershipFilter.OWNED
          ? undefined
          : t('search.noResultsCardBacksButton')
      }
      ctaClick={
        !!search || ownership !== OwnershipFilter.OWNED
          ? undefined
          : navigateToSkypass
      }
    />
  )
})

MarketCardBacksEmptyList.displayName = 'MarketCardBacksEmptyList'
