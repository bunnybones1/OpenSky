import { proxy, subscribe } from 'valtio'

import { selectSilversFilterState } from './select-silvers-filter-state'

interface SelectSilversState {
  numSearchResults?: number
  selectedCards: {
    id: number
    quantity: number
  }[]
}

export const selectSilversState = proxy<SelectSilversState>({
  numSearchResults: undefined,
  selectedCards: []
})

export const updateSelectSilversState = <T extends keyof SelectSilversState>(
  key: T,
  value: SelectSilversState[T]
) => {
  selectSilversState[key] = value
}

export const resetSelectSilversState = () => {
  selectSilversState.numSearchResults = undefined
  selectSilversState.selectedCards = []
}

subscribe(selectSilversFilterState, () => {
  window.scrollTo({ top: 0 })
})
