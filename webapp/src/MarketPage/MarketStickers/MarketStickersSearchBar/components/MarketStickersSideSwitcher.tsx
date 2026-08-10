import { SwapType } from '@0xsequence/metadata'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'

import { SideSwitcher } from '~/MarketPage/shared/components/SideSwitcher'
import { makeMarketStickersRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import { updateMarketStickersFilters } from '~/shared/state/market-stickers/market-stickers-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'
import { MarketMode } from '~/shared/types/market'

import { useMarketStickersShopMode } from '../../shared/hooks/useMarketStickersShopMode'

export const MarketStickersSideSwitcher = memo(() => {
  const mode = useMarketStickersShopMode()
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: MarketMode) => {
      if (value !== mode) {
        if (value === SwapType.SELL) {
          updateMarketStickersFilters('ownership', OwnershipFilter.OWNED)
        } else {
          updateMarketStickersFilters('ownership', OwnershipFilter.ALL)
        }

        dispatch(push(makeMarketStickersRoute()))
      }
    },
    [dispatch, mode]
  )

  return <SideSwitcher mode={mode} onChange={onChange} />
})

MarketStickersSideSwitcher.displayName = 'MarketStickersSideSwitcher'
