import { BREAKPOINTS } from '~/shared/style/Theme'

import { useMediaQuery } from './useMediaQuery'

export const useResponsiveQuery = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
  const query = `screen and (min-width: ${BREAKPOINTS[breakpoint]}px)`

  return useMediaQuery(query)
}
