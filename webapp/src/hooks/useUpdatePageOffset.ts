import { useLayoutEffect } from 'react'

import { DISCLAIMER_HEIGHT, NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useBanners } from '~/shared/queries/useBanners'
import { TOP_OFFSET_KEY } from '~/shared/style/constants'

export const useUpdatePageOffsets = () => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { data: banners } = useBanners()

  useLayoutEffect(() => {
    const hasActiveBanner = banners && banners.length > 0

    let offset = 0

    if (isTabletWide) {
      offset = hasActiveBanner ? NAVBAR_HEIGHT + DISCLAIMER_HEIGHT : NAVBAR_HEIGHT
    } else {
      offset = hasActiveBanner ? DISCLAIMER_HEIGHT : 0
    }

    document.documentElement.style.setProperty(TOP_OFFSET_KEY, `${offset}px`)
  }, [isTabletWide, banners])
}
