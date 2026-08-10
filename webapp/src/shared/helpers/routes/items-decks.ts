import { Hero } from '@opensky/proto'
import { produce } from 'immer'
import { createSearchParams } from 'react-router-dom'

import {
  ItemsDecksFilters,
  itemsDecksFilterState
} from '~/shared/state/items-decks/items-decks-filter-state'

import {
  DECK_ID_TO_VIEW_PARAM,
  DECK_VIEWER_PARAM,
  GLOBAL_PARAMS,
  ROUTES_CONFIG,
  STARTER_HERO_TO_VIEW_PARAM
} from '../../constants/routes'

export const makeItemsDecksSearchParams = (filters?: ItemsDecksFilters) => {
  if (!!filters) {
    // If filters are passed in, merge them with the current filters.
    produce(itemsDecksFilterState, (draft) => {
      for (const key in draft) {
        if (!!filters[key] && draft[key] !== filters[key]) {
          draft[key] = filters[key]
        }
      }
    })
  }

  const filterKeys = Object.keys(itemsDecksFilterState)

  const currentParams = new URLSearchParams(window.location.search)

  const params: Record<string, string | string[]> = {}

  Array.from(currentParams.keys()).forEach((param) => {
    if (!filterKeys.includes(param) && GLOBAL_PARAMS.includes(param)) {
      const values = currentParams.getAll(param)

      if (values.length) {
        params[param] = values.length > 1 ? values : values[0]
      }
    }
  })

  for (const param in itemsDecksFilterState) {
    if (!!itemsDecksFilterState[param]) {
      params[param] = itemsDecksFilterState[param]
    }
  }

  return createSearchParams(params)
}

export const makeItemsDecksRoute = (filters?: ItemsDecksFilters) => {
  const params = makeItemsDecksSearchParams(filters)

  return `${ROUTES_CONFIG.routes.ITEMS.routes.DECKS.directPath}?${params.toString()}`
}

export const makeDeckViewerRoute = (
  deckString: string,
  id?: string,
  starterHero?: Hero
) => {
  const currentParams = new URLSearchParams(window.location.search)

  currentParams.set(DECK_VIEWER_PARAM, deckString)

  if (!!id) {
    currentParams.set(DECK_ID_TO_VIEW_PARAM, id)
  } else {
    currentParams.delete(DECK_ID_TO_VIEW_PARAM)
  }

  if (!!starterHero) {
    currentParams.set(STARTER_HERO_TO_VIEW_PARAM, starterHero)
  } else {
    currentParams.delete(STARTER_HERO_TO_VIEW_PARAM)
  }

  return `${window.location.pathname}?${createSearchParams(currentParams)}`
}
