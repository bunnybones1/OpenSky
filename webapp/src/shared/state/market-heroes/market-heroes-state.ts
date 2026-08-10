import { proxy, subscribe } from 'valtio'

import { marketHeroesFilterState } from './market-heroes-filter-state'

interface MarketHeroesState {
  numSearchResults?: number
}

export const marketHeroesState = proxy<MarketHeroesState>({
  numSearchResults: undefined
})

export const updateMarketHeroesState = <T extends keyof MarketHeroesState>(
  key: T,
  value: MarketHeroesState[T]
) => {
  marketHeroesState[key] = value
}

subscribe(marketHeroesFilterState, () => {
  window.scrollTo({ top: 0 })
})
