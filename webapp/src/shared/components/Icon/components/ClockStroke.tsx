import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const ClockStroke = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <circle cx="24" cy="24" r="24" fill="#0C061E" />
    <path d="M9.12885 23.9952C9.12885 32.2084 15.7868 38.8663 24 38.8663V38.8711C32.2133 38.8711 38.8712 32.2132 38.8712 23.9999V23.9952C38.8712 15.7819 32.2133 9.12397 24 9.12397C15.7868 9.12397 9.12885 15.7819 9.12885 23.9952ZM4 24C4 12.9542 12.9542 4 24 4C35.0453 4 44 12.9542 44 24C44 35.0453 35.0453 44 24 44C12.9542 44 4 35.0453 4 24ZM21.4761 13.1459H26.5238V21.3759H32.2633V26.4236H21.4761V13.1459Z" />
  </IconSVG>
))

ClockStroke.displayName = 'ClockStroke'
