import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const PrismAgility = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={96} boxHeight={96} color={color} height={height}>
    <path d="M63.4286 17.1429L80.5714 0H84.0017V17.1429L70.2874 34.2857H84.0017L70.2874 51.4286H80.5714L73.7143 61.7143H45.372H42.8571H39.4303L38.016 63.1269L36.0017 65.1429V85.7126L39.4303 82.2857L46.2857 75.4286V68.5714H53.1446L56.6246 72.0531V78.8057H56.6211L56.5731 78.8571L42.8571 92.5714L39.4303 96H32.5714L12 75.4286V68.5714L15.4286 65.1429L63.4286 17.1429ZM12.0007 58.8273V47.9998L36.0007 6.85697L42.9264 27.8038L12.0007 58.8273Z" />
  </IconSVG>
))

PrismAgility.displayName = 'PrismAgility'
