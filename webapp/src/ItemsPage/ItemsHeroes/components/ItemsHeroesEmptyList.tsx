import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { makeItemsHeroesRoute } from '~/shared/helpers/routes/items-page'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { itemsHeroesFilterState } from '~/shared/state/items-heroes/items-heroes-filter-state'
import { itemsHeroesState } from '~/shared/state/items-heroes/items-heroes-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const ItemsHeroesEmptyList = memo(() => {
  const { ownership } = useSnapshot(itemsHeroesFilterState)
  const { numSearchResults } = useSnapshot(itemsHeroesState)
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const ctaClick = useCallback(() => {
    dispatch(push(`${makeHeroRoute(1)}?from=${makeItemsHeroesRoute()}`))
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
        ownership !== OwnershipFilter.LOCKED
          ? t('search.noResultsHeroes')
          : t('search.noResultAllHeroes')
      }
      ctaText={
        ownership !== OwnershipFilter.LOCKED
          ? t('search.noResultsHeroesButton')
          : undefined
      }
      ctaClick={ownership !== OwnershipFilter.LOCKED ? ctaClick : undefined}
    />
  )
})

ItemsHeroesEmptyList.displayName = 'ItemsHeroesEmptyList'
