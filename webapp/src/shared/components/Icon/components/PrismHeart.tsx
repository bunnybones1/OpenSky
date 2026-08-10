import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const PrismHeart = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M24.2859 6.85739L31.7139 0.000244141H38.0002L46.5716 15.4288L24.2859 35.9994L2.00018 15.4288L10.5716 0.000244141H16.857L24.2859 6.85739ZM24.2861 42.857L41.0004 27.4284H46.5718L24.2861 47.9998L2.00035 27.4284H7.57093L24.2861 42.857Z" />
  </IconSVG>
))

PrismHeart.displayName = 'PrismHeart'
