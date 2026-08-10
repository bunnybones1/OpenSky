import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const LockStroke = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={12} boxHeight={12} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.0212 3.91484C9.89123 1.85947 8.18746 0.25 6.125 0.25C4.06254 0.25 2.35877 1.85947 2.22883 3.91484H1V11.75H11.25V3.91484H10.0212Z"
      fill="black"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.02806 2.91738C5.27874 2.91738 4.7687 3.42742 4.7687 4.17674V5.43611H7.28743V4.17674C7.28743 3.42742 6.77738 2.91738 6.02806 2.91738ZM6.12493 1.75488C7.48085 1.75488 8.57908 2.84486 8.57908 4.19058V5.40843H9.80615V10.2798H2.44371V5.40843H3.67078V4.19058C3.67078 2.84486 4.76901 1.75488 6.12493 1.75488Z"
      fill="#C5B4F5"
    />
  </IconSVG>
))

LockStroke.displayName = 'LockStroke'
