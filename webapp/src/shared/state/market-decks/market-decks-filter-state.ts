import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { MARKET_DECK_COLUMN_TYPE, MarketDecksFilters } from '~/shared/types/market'

const DEFAULT_FILTERS: MarketDecksFilters = {
  prisms: [],
  column: MARKET_DECK_COLUMN_TYPE.TOP_DECKS
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.MARKET.routes.DECKS.directPath,
    window.location.pathname
  )

  // If the first load is on the market decks page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof MarketDecksFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = key === 'prisms' ? params.getAll(key) : params.get(key)
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

export const marketDecksFilterState = proxy<MarketDecksFilters>(instantiateState())

export const updateMarketDecksFilterState = <T extends keyof MarketDecksFilters>(
  key: T,
  value: MarketDecksFilters[T]
) => {
  marketDecksFilterState[key] = value
}
