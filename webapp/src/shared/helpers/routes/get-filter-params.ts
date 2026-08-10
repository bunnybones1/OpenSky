import { createSearchParams } from 'react-router-dom'

interface FilterObj {
  [key: string]: any
}

export const getFilterParams = <T extends FilterObj>(state: T) => {
  const params: Record<string, string | string[]> = {}

  for (const param in state) {
    if (!!state[param]) {
      params[param] = state[param]
    }
  }

  return createSearchParams(params)
}
