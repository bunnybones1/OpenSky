import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { itemsStickersFilterState } from '~/shared/state/items-stickers/items-stickers-filter-state'
import { itemsStickersState } from '~/shared/state/items-stickers/items-stickers-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const ItemsStickersEmptyList = memo(() => {
  const { ownership, search, isEquipped } = useSnapshot(itemsStickersFilterState)
  const { numSearchResults } = useSnapshot(itemsStickersState)
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const ctaClick = useCallback(() => {
    dispatch(push(ROUTES_CONFIG.routes.INVITE_FRIENDS.directPath))
  }, [dispatch])

  if (numSearchResults !== 0) return null

  return (
    <EmptyItemsList
      bgSrc={
        !!getAssetUrl && !search
          ? getAssetUrl('webapp/backgrounds/empty-list-stickers.webp')
          : undefined
      }
      text={
        !!search || !!isEquipped
          ? undefined
          : ownership !== OwnershipFilter.LOCKED
          ? t('search.noResultsStickers')
          : t('search.noResultsAllStickers')
      }
      ctaText={
        !!search || ownership === OwnershipFilter.LOCKED
          ? undefined
          : t('search.noResultsStickersButton')
      }
      ctaClick={
        !search && ownership !== OwnershipFilter.LOCKED ? ctaClick : undefined
      }
    />
  )
})

ItemsStickersEmptyList.displayName = 'ItemsStickersEmptyList'
