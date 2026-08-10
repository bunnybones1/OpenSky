import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Minimize = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <rect x="9" y="21" width="30" height="6" rx="1" />
  </IconSVG>
))

Minimize.displayName = 'Minimize'
