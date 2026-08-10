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

const DEFAULT_FILTERS: CardSearchParams = {
  cost: undefined,
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
    ROUTES_CONFIG.routes.DECK_BUILDER.directPath,
    window.location.pathname
  )

  // If the page is loaded on the deckbuilder, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof CardSearchParams)[]

    return produce(DEFAULT_FILTERS, (draft) => {
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
    return DEFAULT_FILTERS
  }
}

export const deckBuilderFilterState = proxy<CardSearchParams>(instantiateState())

export const resetDeckBuilderFilters = () => {
  deckBuilderFilterState.cost = undefined
  deckBuilderFilterState.type = undefined
  deckBuilderFilterState.element = undefined
  deckBuilderFilterState.trait = undefined
  deckBuilderFilterState.effects = undefined
  deckBuilderFilterState.set = undefined
  deckBuilderFilterState.grade = undefined
  deckBuilderFilterState.search = ''
  deckBuilderFilterState.ownership = OwnershipFilter.OWNED
  deckBuilderFilterState.sort = CARD_SORTING_OPTIONS.MANA_ASCENDING
  deckBuilderFilterState.onlyDuplicates = DEFAULT_FILTERS.onlyDuplicates
}

export const updateDeckBuilderFilter = <T extends keyof CardSearchParams>(
  key: T,
  value: CardSearchParams[T]
) => {
  deckBuilderFilterState[key] = value
}
