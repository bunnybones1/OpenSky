import { useMemo } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

export const useCardListNumColumns = () => {
  const isTablet = useResponsiveQuery('tablet')
  const isTabletWide = useResponsiveQuery('tabletWide')
  const isDesktop = useResponsiveQuery('desktop')
  const isDesktopWide = useResponsiveQuery('desktopWide')

  return useMemo(() => {
    if (isDesktopWide) return 8 as const
    if (isDesktop) return 6 as const
    if (isTabletWide) return 5 as const
    if (isTablet) return 4 as const
    return 3 as const
  }, [isDesktop, isDesktopWide, isTablet, isTabletWide])
}
