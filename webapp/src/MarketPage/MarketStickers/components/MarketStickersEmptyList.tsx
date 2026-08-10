import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { marketStickersFilterState } from '~/shared/state/market-stickers/market-stickers-filter-state'
import { marketStickersState } from '~/shared/state/market-stickers/market-stickers-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const MarketStickersEmptyList = memo(() => {
  const { ownership, search } = useSnapshot(marketStickersFilterState)
  const { numSearchResults } = useSnapshot(marketStickersState)
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
        !!search || ownership !== OwnershipFilter.OWNED
          ? undefined
          : t('search.noResultsStickers')
      }
      ctaText={
        !!search || ownership !== OwnershipFilter.OWNED
          ? undefined
          : t('search.noResultsStickersButton')
      }
      ctaClick={
        !!search || ownership !== OwnershipFilter.OWNED ? undefined : ctaClick
      }
    />
  )
})

MarketStickersEmptyList.displayName = 'MarketStickersEmptyList'
