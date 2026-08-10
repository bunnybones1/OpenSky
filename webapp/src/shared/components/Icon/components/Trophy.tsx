import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Trophy = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M11.9962018,8 L35.9886053,8 L35.9886053,30.1111013 L25.4037214,39.7769421 L33.3723026,48 L14.6125045,48 L22.5815442,39.7769421 L11.9962018,30.1111013 L11.9962018,8 Z M-7.10542736e-15,12 L8.01266079,12 L8.01266079,24 L3.99873392,24 L-7.10542736e-15,19.210161 L-7.10542736e-15,12 Z M48,12 L48,19.210161 L44.0012661,24 L39.9873392,24 L39.9873392,12 L48,12 Z" />
  </IconSVG>
))

Trophy.displayName = 'Trophy'
