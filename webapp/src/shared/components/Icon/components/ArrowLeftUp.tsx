import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const ArrowLeftUp = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M9.59897 11.2218L19.349 0.721826C20.2396 -0.234424 21.7583 -0.234424 22.649 0.721826L32.399 11.2218C33.7302 12.6562 32.7083 15 30.749 15H24.749V40.5H32.624C32.924 40.5 33.2052 40.6218 33.4208 40.8281L38.6708 46.0781C39.374 46.7906 38.8771 48 37.874 48H19.499C18.2521 48 17.249 46.9968 17.249 45.75V15H11.249C9.29897 15 8.26772 12.6562 9.59897 11.2218Z" />
  </IconSVG>
))

ArrowLeftUp.displayName = 'ArrowLeftUp'
