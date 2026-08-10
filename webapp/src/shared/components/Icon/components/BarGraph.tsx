import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const BarGraph = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 5C14.3431 5 13 6.34315 13 8V39C13 40.6569 14.3431 42 16 42H20C21.6569 42 23 40.6569 23 39V8C23 6.34315 21.6569 5 20 5H16ZM3 15C1.34315 15 0 16.3431 0 18V39C0 40.6569 1.34315 42 3 42H7C8.65685 42 10 40.6569 10 39V18C10 16.3431 8.65685 15 7 15H3ZM26 24C26 22.3431 27.3431 21 29 21H33C34.6569 21 36 22.3431 36 24V39C36 40.6569 34.6569 42 33 42H29C27.3431 42 26 40.6569 26 39V24ZM41 28C39.3431 28 38 29.3431 38 31V39C38 40.6569 39.3431 42 41 42H45C46.6569 42 48 40.6569 48 39V31C48 29.3431 46.6569 28 45 28H41Z"
    />
  </IconSVG>
))

BarGraph.displayName = 'BarGraph'
