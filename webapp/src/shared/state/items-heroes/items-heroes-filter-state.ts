import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { OwnershipFilter } from '~/shared/types/cards'
import { SharedHeroesFilters } from '~/shared/types/hero-skins'

const HeroArrayParams: string[] = []

const DEFAULT_FILTERS: SharedHeroesFilters = {
  ownership: OwnershipFilter.OWNED,
  search: undefined
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.ITEMS.routes.HEROES.directPath,
    window.location.pathname
  )

  // If the first load is on the items heroes page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof SharedHeroesFilters)[]

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

export const itemsHeroesFilterState = proxy<SharedHeroesFilters>(instantiateState())

export const resetItemsHeroesFilters = () => {
  itemsHeroesFilterState.ownership = OwnershipFilter.OWNED
  itemsHeroesFilterState.search = undefined
}

export const updateItemsHeroesFilters = <T extends keyof SharedHeroesFilters>(
  key: T,
  value: SharedHeroesFilters[T]
) => {
  itemsHeroesFilterState[key] = value
}
