import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { itemsCardbacksFilterState } from '~/shared/state/items-cardbacks/items-cardbacks-filter-state'
import { itemsCardbacksState } from '~/shared/state/items-cardbacks/items-cardbacks-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const ItemsCardBacksEmptyList = memo(() => {
  const { ownership, search } = useSnapshot(itemsCardbacksFilterState)
  const { numSearchResults } = useSnapshot(itemsCardbacksState)
  const { t } = useTranslation()

  const { navigateToSkypass } = useNavigateToSkyPass()

  if (numSearchResults !== 0) return null

  return (
    <EmptyItemsList
      text={
        !!search
          ? undefined
          : ownership !== OwnershipFilter.LOCKED
          ? t('search.noResultsCardBacks')
          : t('search.noResultsAllCardBacks')
      }
      ctaText={
        !!search || ownership === OwnershipFilter.LOCKED
          ? undefined
          : t('search.noResultsCardBacksButton')
      }
      ctaClick={
        !search && ownership !== OwnershipFilter.LOCKED
          ? navigateToSkypass
          : undefined
      }
    />
  )
})

ItemsCardBacksEmptyList.displayName = 'ItemsCardBacksEmptyList'
