import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Scroll = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M3.6 5C1.6125 5 0 6.6125 0 8.6V13.4C0 14.06 0.54 14.6 1.2 14.6H7.2V8.6C7.2 6.6125 5.5875 5 3.6 5ZM18.5 35.945V30.5H40.8V12.2C40.8 8.2325 37.5675 5 33.6 5H9.66C10.4175 6.005 10.89 7.2425 10.89 8.6V36.2C10.89 39.1175 13 40 15 40C17 40 18.5 38.3375 18.5 35.945ZM21.6 33.8V36.2C21.6 40.1675 18.3675 43.4 14.4 43.4H39.6C44.2425 43.4 48 39.6425 48 35C48 34.34 47.46 33.8 46.8 33.8H21.6Z" />
  </IconSVG>
))

Scroll.displayName = 'Scroll'
