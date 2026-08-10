import { proxy, subscribe } from 'valtio'

import { itemsHeroesFilterState } from './items-heroes-filter-state'

interface ItemsHeroesState {
  numSearchResults?: number
}

export const itemsHeroesState = proxy<ItemsHeroesState>({
  numSearchResults: undefined
})

export const updateItemsHeroesState = <T extends keyof ItemsHeroesState>(
  key: T,
  value: ItemsHeroesState[T]
) => {
  itemsHeroesState[key] = value
}

subscribe(itemsHeroesFilterState, () => {
  window.scrollTo({ top: 0 })
})
