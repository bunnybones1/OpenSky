import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Clock = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M6.15455 23.9942C6.15455 33.8501 14.1441 41.8396 24 41.8396V41.8454C33.8559 41.8454 41.8454 33.8559 41.8454 23.9999V23.9942C41.8454 14.1383 33.8559 6.14879 24 6.14879C14.1441 6.14879 6.15455 14.1383 6.15455 23.9942ZM0 24C0 10.745 10.745 -3.05176e-05 24 -3.05176e-05C37.2544 -3.05176e-05 48 10.745 48 24C48 37.2544 37.2544 48 24 48C10.745 48 0 37.2544 0 24ZM20.9714 26.9083V10.9751H27.0286V20.851H33.916V26.9083H20.9714Z" />
  </IconSVG>
))

Clock.displayName = 'Clock'
