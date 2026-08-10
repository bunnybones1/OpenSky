import { proxy, subscribe } from 'valtio'

import { itemsStickersFilterState } from './items-stickers-filter-state'

interface ItemsStickersState {
  numSearchResults?: number
}

export const itemsStickersState = proxy<ItemsStickersState>({
  numSearchResults: undefined
})

export const updateItemsStickersState = <T extends keyof ItemsStickersState>(
  key: T,
  value: ItemsStickersState[T]
) => {
  itemsStickersState[key] = value
}

subscribe(itemsStickersFilterState, () => {
  window.scrollTo({ top: 0 })
})
