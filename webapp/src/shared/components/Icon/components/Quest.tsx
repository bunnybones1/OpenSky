import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Quest = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <rect x="7" y="2" width="34" height="8" fillOpacity={0.65} />
    <path d="M0 4L5 2V12L0 10V4Z" fillOpacity={0.65} />
    <path d="M48 4L43 2V12L48 10V4Z" fillOpacity={0.65} />
    <path
      d="M7 13V35L24 47L41 35V13H37.9091V33.4723L24 43.2905L10.0909 33.4723V13H7Z"
      fillOpacity={0.65}
    />
    <path d="M18 15.9091L21 13H27L30 15.9091L27 29H21L18 15.9091Z" />
    <path d="M27.125 31.5H20.875L19 34L20.875 36.5H24H27.125L29 34L27.125 31.5Z" />
  </IconSVG>
))

Quest.displayName = 'Quest'
