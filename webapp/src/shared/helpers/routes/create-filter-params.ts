import { produce } from 'immer'

import { getFilterParams } from './get-filter-params'

interface FilterObj {
  [key: string]: any
}

export const createFilterParams = <T extends FilterObj>(state: T, filters?: T) => {
  if (!!filters) {
    // If filters are passed in, merge them with the current filters.
    produce(state, (draft) => {
      for (const key in draft) {
        if (!!filters[key] && draft[key] !== filters[key]) {
          // @ts-ignore
          draft[key] = filters[key]
        }
      }
    })
  }

  return getFilterParams(state)
}
