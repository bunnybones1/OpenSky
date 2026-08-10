import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const EllipsisHorizontal = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M8 29C10.7614 29 13 26.7614 13 24C13 21.2386 10.7614 19 8 19C5.23858 19 3 21.2386 3 24C3 26.7614 5.23858 29 8 29ZM40 29C42.7614 29 45 26.7614 45 24C45 21.2386 42.7614 19 40 19C37.2386 19 35 21.2386 35 24C35 26.7614 37.2386 29 40 29ZM29 24C29 26.7614 26.7614 29 24 29C21.2386 29 19 26.7614 19 24C19 21.2386 21.2386 19 24 19C26.7614 19 29 21.2386 29 24Z" />
  </IconSVG>
))

EllipsisHorizontal.displayName = 'EllipsisHorizontal'
