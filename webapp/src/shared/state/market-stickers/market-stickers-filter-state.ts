import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { CARD_SORTING_OPTIONS, OwnershipFilter } from '~/shared/types/cards'
import { SharedStickerFilters } from '~/shared/types/filters'

const StickerArrayParams: string[] = []

export interface MarketStickerFilters extends SharedStickerFilters {
  sort: CARD_SORTING_OPTIONS
}

const DEFAULT_FILTERS: MarketStickerFilters = {
  ownership: OwnershipFilter.ALL,
  sort: CARD_SORTING_OPTIONS.PRICE_DESCENDING
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.MARKET.routes.STICKERS.directPath,
    window.location.pathname
  )

  // If the first load is on the market stickers page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof MarketStickerFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = StickerArrayParams.includes(key)
            ? params.getAll(key)
            : params.get(key)
          if (!!value) {
            // @ts-ignore
            draft[key] = value
          }
        }
      })
    })
  } else {
    return DEFAULT_FILTERS
  }
}

export const marketStickersFilterState = proxy<MarketStickerFilters>(
  instantiateState()
)

export const resetMarketStickersFilters = () => {
  marketStickersFilterState.ownership = DEFAULT_FILTERS.ownership
  marketStickersFilterState.sort = DEFAULT_FILTERS.sort
}

export const updateMarketStickersFilters = <T extends keyof MarketStickerFilters>(
  key: T,
  value: MarketStickerFilters[T]
) => {
  marketStickersFilterState[key] = value
}
