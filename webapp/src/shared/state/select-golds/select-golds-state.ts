import { proxy, subscribe } from 'valtio'

import { CartItem } from '~/shared/types/market'

import { selectGoldsFilterState } from './select-golds-filter-state'

interface SelectGoldsState {
  numSearchResults?: number
  previousFeatureId?: number
  selectedCards: CartItem[]
}

export const selectGoldsState = proxy<SelectGoldsState>({
  numSearchResults: undefined,
  selectedCards: []
})

export const updateSelectGoldsState = <T extends keyof SelectGoldsState>(
  key: T,
  value: SelectGoldsState[T]
) => {
  selectGoldsState[key] = value
}

export const resetSelectGoldsState = () => {
  selectGoldsState.numSearchResults = undefined
}

subscribe(selectGoldsFilterState, () => {
  window.scrollTo({ top: 0 })
})
