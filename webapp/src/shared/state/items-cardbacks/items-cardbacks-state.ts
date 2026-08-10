import { proxy, subscribe } from 'valtio'

import { itemsCardbacksFilterState } from './items-cardbacks-filter-state'

interface ItemsCardbacksState {
  numSearchResults?: number
}

export const itemsCardbacksState = proxy<ItemsCardbacksState>({
  numSearchResults: undefined
})

export const updateItemsCardbacksState = <T extends keyof ItemsCardbacksState>(
  key: T,
  value: ItemsCardbacksState[T]
) => {
  itemsCardbacksState[key] = value
}

subscribe(itemsCardbacksFilterState, () => {
  window.scrollTo({ top: 0 })
})
