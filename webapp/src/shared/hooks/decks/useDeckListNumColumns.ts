import { useMemo } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

export const DeckListColumns = {
  base: 'two',
  mobile: 'three',
  tablet: 'three',
  tabletWide: 'five',
  desktop: 'six',
  desktopWide: 'seven',
  desktopUltrawide: 'eight'
} as const

export const useDeckListNumColumns = () => {
  const isMobile = useResponsiveQuery('mobile')
  const isTablet = useResponsiveQuery('tablet')
  const isTabletWide = useResponsiveQuery('tabletWide')
  const isDesktop = useResponsiveQuery('desktop')
  const isDesktopWide = useResponsiveQuery('desktopWide')
  const isDeskTopUltra = useResponsiveQuery('desktopUltrawide')

  return useMemo(() => {
    if (isDeskTopUltra) return 8 as const
    if (isDesktopWide) return 7 as const
    if (isDesktop) return 6 as const
    if (isTabletWide) return 5 as const
    if (isTablet) return 3 as const
    if (isMobile) return 3 as const
    return 2 as const
  }, [isDeskTopUltra, isDesktop, isDesktopWide, isMobile, isTablet, isTabletWide])
}
