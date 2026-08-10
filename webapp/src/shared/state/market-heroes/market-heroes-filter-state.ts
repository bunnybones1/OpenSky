import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { OwnershipFilter } from '~/shared/types/cards'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'
import { SharedHeroesFilters } from '~/shared/types/hero-skins'

const HeroArrayParams: string[] = []

export interface MarketHeroesFilters extends SharedHeroesFilters {
  sort: CARD_SORTING_OPTIONS
}

const DEFAULT_FILTERS: MarketHeroesFilters = {
  ownership: OwnershipFilter.ALL,
  search: undefined,
  sort: CARD_SORTING_OPTIONS.PRICE_ASCENDING
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.MARKET.routes.HEROES.directPath,
    window.location.pathname
  )

  // If the first load is on the items heroes page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof MarketHeroesFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = HeroArrayParams.includes(key)
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

export const marketHeroesFilterState = proxy<MarketHeroesFilters>(instantiateState())

export const resetMarketHeroesFilters = () => {
  marketHeroesFilterState.ownership = DEFAULT_FILTERS.ownership
  marketHeroesFilterState.sort = DEFAULT_FILTERS.sort
  marketHeroesFilterState.search = DEFAULT_FILTERS.search
}

export const updateMarketHeroesFilters = <T extends keyof MarketHeroesFilters>(
  key: T,
  value: MarketHeroesFilters[T]
) => {
  marketHeroesFilterState[key] = value
}
