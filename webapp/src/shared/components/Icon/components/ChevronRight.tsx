import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const ChevronRight = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M26.0696 14.0311L16.5755 4.53839L14.5185 6.59533L12.4616 8.65227L19.9369 16.1276L27.4108 23.6029L19.9623 31.0527L12.5138 38.4998L14.5454 40.5313L16.5769 42.5629L26.0696 33.0702C31.2903 27.8494 35.5637 23.5662 35.5637 23.5506C35.5637 23.5365 31.2903 19.2532 26.0696 14.0311Z"
    />
  </IconSVG>
))

ChevronRight.displayName = 'ChevronRight'
