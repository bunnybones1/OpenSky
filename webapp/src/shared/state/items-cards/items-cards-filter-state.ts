import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import {
  CARD_SORTING_OPTIONS,
  CardsArrayParams,
  CardSearchParams,
  OwnershipFilter
} from '~/shared/types/cards'

export const DEFAULT_ITEMS_CARDS_FILTERS: CardSearchParams = {
  cost: undefined,
  prism: undefined,
  type: undefined,
  element: undefined,
  trait: undefined,
  effects: undefined,
  grade: undefined,
  set: undefined,
  search: '',
  ownership: OwnershipFilter.OWNED,
  sort: CARD_SORTING_OPTIONS.MANA_ASCENDING,
  onlyDuplicates: false
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.ITEMS.routes.CARDS.directPath,
    window.location.pathname
  )

  // If the first load is on the items cards page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(
      DEFAULT_ITEMS_CARDS_FILTERS
    ) as (keyof CardSearchParams)[]

    return produce(DEFAULT_ITEMS_CARDS_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = CardsArrayParams.includes(key)
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
    return DEFAULT_ITEMS_CARDS_FILTERS
  }
}

export const itemsCardsFiltersState = proxy<CardSearchParams>(instantiateState())

export const resetItemsCardsFilters = () => {
  itemsCardsFiltersState.cost = undefined
  itemsCardsFiltersState.prism = undefined
  itemsCardsFiltersState.type = undefined
  itemsCardsFiltersState.element = undefined
  itemsCardsFiltersState.trait = undefined
  itemsCardsFiltersState.effects = undefined
  itemsCardsFiltersState.set = undefined
  itemsCardsFiltersState.grade = undefined
  itemsCardsFiltersState.search = ''
  itemsCardsFiltersState.ownership = OwnershipFilter.OWNED
  itemsCardsFiltersState.onlyDuplicates = false
}

export const updateItemsCardsFilter = <T extends keyof CardSearchParams>(
  key: T,
  value: CardSearchParams[T]
) => {
  itemsCardsFiltersState[key] = value
}

export const setItemsCardsFilterState = (filters: CardSearchParams) => {
  Object.keys(DEFAULT_ITEMS_CARDS_FILTERS).forEach((key) => {
    if (filters[key]) {
      itemsCardsFiltersState[key] = filters[key]
    } else {
      itemsCardsFiltersState[key] = DEFAULT_ITEMS_CARDS_FILTERS[key]
    }
  })
}
