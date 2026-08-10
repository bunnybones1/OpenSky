import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const CaretUp = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M35.9828 31.8437C37.6703 31.8437 38.5141 29.7812 37.2953 28.5625L25.2953 16.5625C24.5453 15.8125 23.3266 15.8125 22.5766 16.5625L10.5766 28.5625C9.35785 29.7812 10.2016 31.8437 11.8891 31.8437L35.9828 31.8437Z" />
  </IconSVG>
))

CaretUp.displayName = 'CaretUp'
