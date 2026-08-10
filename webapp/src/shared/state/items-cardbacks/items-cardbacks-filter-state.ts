import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { OwnershipFilter } from '~/shared/types/cards'
import { SharedCardBackFilters } from '~/shared/types/filters'

const CardbackArrayParams: string[] = []

const DEFAULT_FILTERS: SharedCardBackFilters = {
  ownership: OwnershipFilter.OWNED,
  search: undefined,
  isEquipped: false
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.ITEMS.routes.CARDBACKS.directPath,
    window.location.pathname
  )

  // If the first load is on the items cardbackes page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof SharedCardBackFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = CardbackArrayParams.includes(key)
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

export const itemsCardbacksFilterState = proxy<SharedCardBackFilters>(
  instantiateState()
)

export const resetItemsCardbacksFilters = () => {
  itemsCardbacksFilterState.ownership = DEFAULT_FILTERS.ownership
  itemsCardbacksFilterState.search = DEFAULT_FILTERS.search
  itemsCardbacksFilterState.isEquipped = DEFAULT_FILTERS.isEquipped
}

export const updateItemsCardbacksFilters = <T extends keyof SharedCardBackFilters>(
  key: T,
  value: SharedCardBackFilters[T]
) => {
  itemsCardbacksFilterState[key] = value
}
