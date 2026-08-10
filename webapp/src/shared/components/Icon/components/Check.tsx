import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Check = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M41.6 7L19.2 30.8411L5.33333 19.6812L0 26.2759L19.7333 42L48 12.5802L41.6 7Z" />
  </IconSVG>
))

Check.displayName = 'Check'
