import { proxy, subscribe } from 'valtio'

import { marketCardsFilterState } from './market-cards-filter-state'

interface MarketCardsState {
  numSearchResults?: number
}

export const marketCardsState = proxy<MarketCardsState>({
  numSearchResults: undefined
})

export const updateMarketCardsState = <T extends keyof MarketCardsState>(
  key: T,
  value: MarketCardsState[T]
) => {
  marketCardsState[key] = value
}

subscribe(marketCardsFilterState, () => {
  window.scrollTo({ top: 0 })
})
