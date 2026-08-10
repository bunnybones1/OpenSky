import { proxy, subscribe } from 'valtio'

import { itemsCardsFiltersState } from './items-cards-filter-state'

interface ItemsCardsState {
  numSearchResults?: number
}

export const itemsCardsState = proxy<ItemsCardsState>({
  numSearchResults: undefined
})

export const updateItemsCardsState = <T extends keyof ItemsCardsState>(
  key: T,
  value: ItemsCardsState[T]
) => {
  itemsCardsState[key] = value
}

subscribe(itemsCardsFiltersState, () => {
  window.scrollTo({ top: 0 })
})
