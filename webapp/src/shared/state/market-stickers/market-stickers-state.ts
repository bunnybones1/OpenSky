import { proxy, subscribe } from 'valtio'

import { marketStickersFilterState } from './market-stickers-filter-state'

interface MarketStickersState {
  numSearchResults?: number
}

export const marketStickersState = proxy<MarketStickersState>({
  numSearchResults: undefined
})

export const updateMarketStickersState = <T extends keyof MarketStickersState>(
  key: T,
  value: MarketStickersState[T]
) => {
  marketStickersState[key] = value
}

subscribe(marketStickersFilterState, () => {
  window.scrollTo({ top: 0 })
})
