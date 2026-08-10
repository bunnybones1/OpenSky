import { useMemo } from 'react'

import { MOBILE_SUBNAV_HEIGHT, SUBNAV_HEIGHT } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { TOP_OFFSET_KEY } from '~/shared/style/constants'

export const useShopTopOffset = () => {
  const isTabletWide = useResponsiveQuery('tabletWide')

  return useMemo(() => {
    const offsetPx = document.documentElement.style.getPropertyValue(TOP_OFFSET_KEY)

    let offset = 0

    if (offsetPx) {
      offset = offset + Number(offsetPx.replace('px', ''))
    }

    if (isTabletWide) {
      offset = offset + SUBNAV_HEIGHT
    } else {
      offset = offset + MOBILE_SUBNAV_HEIGHT
    }

    return offset
  }, [isTabletWide])
}
