import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Eraser = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M46.682 25.682C48.4393 23.9246 48.4393 21.0754 46.682 19.318L31.682 4.31804C29.9246 2.5607 27.0755 2.56061 25.318 4.31804L1.31795 28.318C-0.439397 30.0754 -0.439397 32.9246 1.31795 34.682L10.3179 43.682C11.1619 44.5259 12.3065 45 13.5 45H46.875C47.4963 45 48 44.4963 48 43.875V40.125C48 39.5037 47.4963 39 46.875 39H33.364L46.682 25.682ZM18.3107 19.8107L31.1894 32.6894L24.8787 39H14.1214L6.62139 31.5L18.3107 19.8107Z" />
  </IconSVG>
))

Eraser.displayName = 'Eraser'
