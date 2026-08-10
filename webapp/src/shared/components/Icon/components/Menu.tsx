import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Menu = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M0,14 L48,14 L48,10 L0,10 L0,14 Z M0,26 L48,26 L48,22 L0,22 L0,26 Z M0,38 L48,38 L48,34 L0,34 L0,38 Z" />
  </IconSVG>
))

Menu.displayName = 'Menu'
