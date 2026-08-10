import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Cards = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.4248 11.4002L30.668 0.443848L45.4591 11.4002V36.5997L30.668 47.556L16.4248 36.5997V11.4002Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9222 1.31763L1 15.587L7.52212 39.9279L22.5344 46.1673L11.5 38V9.50005L18.354 3.85493L11.9222 1.31763Z"
      fillOpacity={0.65}
    />
  </IconSVG>
))

Cards.displayName = 'Cards'
