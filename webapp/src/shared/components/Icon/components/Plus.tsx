import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Plus = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M21.1325 7V21.1325H7V26.8675H21.1325V41H26.8675V26.8675H41V21.1325H26.8675V7H21.1325Z" />
  </IconSVG>
))

Plus.displayName = 'Plus'
