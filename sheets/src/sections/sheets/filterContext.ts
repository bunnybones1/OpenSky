import { createContext } from 'react'

import { filterDisabled } from '../../filters/types'

type Filters = Record<string, unknown | typeof filterDisabled>

interface FilterContext {
  setFilters: (newFilters: Filters) => void
  filters: Filters
  primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters: string[]
}

export const FilterContext = createContext<FilterContext>({
  filters: {},
  setFilters: () => {},
  primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters: []
})
