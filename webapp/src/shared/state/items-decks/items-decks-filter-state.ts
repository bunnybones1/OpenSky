import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { DECK_SORTING_OPTIONS } from '~/shared/constants/decks'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { FilterablePrism } from '~/shared/types/cards'

export interface ItemsDecksFilters {
  prism?: FilterablePrism[]
  search?: string
  sort?: DECK_SORTING_OPTIONS
}

const arrayParams = ['prism']

const DEFAULT_FILTERS: ItemsDecksFilters = {
  prism: undefined,
  search: '',
  sort: DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.ITEMS.routes.DECKS.directPath,
    window.location.pathname
  )

  // If the first load is on the items decks page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof ItemsDecksFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = arrayParams.includes(key)
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

export const itemsDecksFilterState = proxy<ItemsDecksFilters>(instantiateState())

export const updateItemsDecksFilter = <T extends keyof ItemsDecksFilters>(
  key: T,
  value: ItemsDecksFilters[T]
) => {
  itemsDecksFilterState[key] = value
}
