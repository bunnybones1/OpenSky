import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { marketHeroesFilterState } from '~/shared/state/market-heroes/market-heroes-filter-state'
import { marketHeroesState } from '~/shared/state/market-heroes/market-heroes-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const MarketHeroesEmptyList = memo(() => {
  const { ownership } = useSnapshot(marketHeroesFilterState)
  const { numSearchResults } = useSnapshot(marketHeroesState)
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const ctaClick = useCallback(() => {
    dispatch(push(`${makeHeroRoute(1)}?from=${makeMarketHeroSkinsRoute()}`))
  }, [dispatch])

  if (numSearchResults !== 0) return null

  return (
    <EmptyItemsList
      bgSrc={
        !!getAssetUrl
          ? getAssetUrl('webapp/backgrounds/empty-list-heroes.webp')
          : undefined
      }
      text={
        ownership === OwnershipFilter.OWNED ? t('search.noResultsHeroes') : undefined
      }
      ctaText={
        ownership === OwnershipFilter.OWNED
          ? t('search.noResultsHeroesButton')
          : undefined
      }
      ctaClick={ownership === OwnershipFilter.OWNED ? ctaClick : undefined}
    />
  )
})

MarketHeroesEmptyList.displayName = 'MarketHeroesEmptyList'
