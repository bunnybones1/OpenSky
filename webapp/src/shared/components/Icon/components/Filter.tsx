import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Filter = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={49} boxHeight={48} color={color} height={height}>
    <path d="M45.7119 0H2.30572C0.243216 0 -0.788034 2.4375 0.711966 3.84375L18.0557 21.1875V40.5C18.0557 41.25 18.3369 42 18.9932 42.375L26.4932 47.625C27.9932 48.6562 30.0557 47.625 30.0557 45.75V21.1875L47.3057 3.84375C48.8057 2.4375 47.7745 0 45.7119 0Z" />
  </IconSVG>
))

Filter.displayName = 'Filter'
