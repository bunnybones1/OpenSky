import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const CaretDown = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M11.8891 16C10.2016 16 9.35784 18.0625 10.5766 19.2812L22.5766 31.2812C23.3266 32.0312 24.5453 32.0312 25.2953 31.2812L37.2953 19.2812C38.514 18.0625 37.6703 16 35.9828 16H11.8891Z" />
  </IconSVG>
))

CaretDown.displayName = 'CaretDown'
