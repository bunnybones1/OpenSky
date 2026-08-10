import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const ArrowRight = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={49} boxHeight={48} color={color} height={height}>
    <path d="M34.4312 19.7062H2.0848C1.37766 19.7062 0.799088 20.2848 0.799088 20.9919V26.9919C0.799088 27.6991 1.37766 28.2777 2.0848 28.2777H34.4312V33.2169C34.4312 35.5098 37.2062 36.6562 38.8241 35.0384L48.0491 25.8134C49.0562 24.8062 49.0562 23.1777 48.0491 22.1812L38.8241 12.9562C37.2062 11.3384 34.4312 12.4848 34.4312 14.7777V19.7062Z" />
  </IconSVG>
))

ArrowRight.displayName = 'ArrowRight'
