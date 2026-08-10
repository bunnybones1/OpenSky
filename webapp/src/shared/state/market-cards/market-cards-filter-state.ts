import { ItemType } from '@opensky/proto'
import { getItemType } from '@opensky/shared/assetsIDs'
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

export interface MarketCardSearchParams extends CardSearchParams {
  grade: ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

const DEFAULT_FILTERS: MarketCardSearchParams = {
  cost: undefined,
  prism: undefined,
  type: undefined,
  element: undefined,
  trait: undefined,
  effects: undefined,
  grade: ItemType.SW_SILVER_CARDS,
  set: undefined,
  search: '',
  ownership: OwnershipFilter.ALL,
  sort: CARD_SORTING_OPTIONS.PRICE_DESCENDING,
  onlyDuplicates: false
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.MARKET.routes.CARDS.directPath,
    window.location.pathname
  )

  // If the first load is on the market cards page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof MarketCardSearchParams)[]

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
    // Id we match the market card details, and its on a gold card, default
    // this filter to gold.
    const detailsMatch = matchPath<'id', string>(
      ROUTES_CONFIG.routes.MARKET.routes.CARD.directPath,
      window.location.pathname
    )

    if (!!detailsMatch && !!detailsMatch.params.id) {
      const itemType = getItemType(detailsMatch.params.id)
      if (itemType === ItemType.SW_GOLD_CARDS) {
        return {
          ...DEFAULT_FILTERS,
          grade: ItemType.SW_GOLD_CARDS
        } as MarketCardSearchParams
      }
    }
    return DEFAULT_FILTERS
  }
}

export const marketCardsFilterState = proxy<MarketCardSearchParams>(
  instantiateState()
)

export const resetMarketCardsFilterState = () => {
  marketCardsFilterState.cost = undefined
  marketCardsFilterState.prism = undefined
  marketCardsFilterState.type = undefined
  marketCardsFilterState.element = undefined
  marketCardsFilterState.trait = undefined
  marketCardsFilterState.effects = undefined
  marketCardsFilterState.grade = ItemType.SW_SILVER_CARDS
  marketCardsFilterState.set = undefined
  marketCardsFilterState.search = ''
  marketCardsFilterState.ownership = OwnershipFilter.ALL
  marketCardsFilterState.sort = CARD_SORTING_OPTIONS.PRICE_DESCENDING
  marketCardsFilterState.onlyDuplicates = false
}

export const updateMarketCardsFilterState = <T extends keyof MarketCardSearchParams>(
  key: T,
  value: MarketCardSearchParams[T]
) => {
  marketCardsFilterState[key] = value
}
