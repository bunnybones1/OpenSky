import { proxy, subscribe } from 'valtio'

import { itemsDecksFilterState } from './items-decks-filter-state'

interface ItemsDecksState {
  numSearchResults?: number
}

export const itemsDecksState = proxy<ItemsDecksState>({
  numSearchResults: undefined
})

export const updateItemsDecksState = <T extends keyof ItemsDecksState>(
  key: T,
  value: ItemsDecksState[T]
) => {
  itemsDecksState[key] = value
}

subscribe(itemsDecksFilterState, () => {
  window.scrollTo({ top: 0 })
})
