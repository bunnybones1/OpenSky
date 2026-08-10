import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const External = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M8.00031 40V8H20.0003V12H12.0003V36H36.0003V28H40.0003V40H8.00031ZM30.5314 13.6809L24.843 8H39.9997V23.1511L34.3187 17.472L25.7935 26.0028L22.0044 22.208L30.5314 13.6809Z" />
  </IconSVG>
))

External.displayName = 'External'
