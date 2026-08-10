import { proxy, subscribe } from 'valtio'

import { marketCardBacksFilterState } from './market-cardbacks-filter-state'

interface MarketCardBacksState {
  numSearchResults?: number
}

export const marketCardBacksState = proxy<MarketCardBacksState>({
  numSearchResults: undefined
})

export const updateMarketCardBacksState = <T extends keyof MarketCardBacksState>(
  key: T,
  value: MarketCardBacksState[T]
) => {
  marketCardBacksState[key] = value
}

subscribe(marketCardBacksFilterState, () => {
  window.scrollTo({ top: 0 })
})
