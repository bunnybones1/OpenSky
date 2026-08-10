import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { CARD_SORTING_OPTIONS, OwnershipFilter } from '~/shared/types/cards'
import { SharedCardBackFilters } from '~/shared/types/filters'

const CardBackArrayParams: string[] = []

export interface MarketCardBackFilters extends SharedCardBackFilters {
  sort: CARD_SORTING_OPTIONS
}

const DEFAULT_FILTERS: MarketCardBackFilters = {
  ownership: OwnershipFilter.ALL,
  sort: CARD_SORTING_OPTIONS.PRICE_DESCENDING
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.MARKET.routes.CARDBACKS.directPath,
    window.location.pathname
  )

  // If the first load is on the market cardbacks page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof MarketCardBackFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = CardBackArrayParams.includes(key)
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

export const marketCardBacksFilterState = proxy<MarketCardBackFilters>(
  instantiateState()
)

export const resetMarketCardBacksFilters = () => {
  marketCardBacksFilterState.ownership = DEFAULT_FILTERS.ownership
  marketCardBacksFilterState.sort = DEFAULT_FILTERS.sort
}

export const updateMarketCardBacksFilters = <T extends keyof MarketCardBackFilters>(
  key: T,
  value: MarketCardBackFilters[T]
) => {
  marketCardBacksFilterState[key] = value
}
