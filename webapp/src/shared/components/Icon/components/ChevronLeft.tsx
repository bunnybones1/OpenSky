import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const ChevronLeft = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.9557 14.0311L31.4498 4.53839L33.5068 6.59533L35.5637 8.65227L28.0884 16.1276L20.6145 23.6029L28.063 31.0527L35.5115 38.4998L33.48 40.5313L31.4484 42.5629L21.9557 33.0702C16.735 27.8495 12.4616 23.5662 12.4616 23.5506C12.4616 23.5365 16.735 19.2532 21.9557 14.0311"
    />
  </IconSVG>
))

ChevronLeft.displayName = 'ChevronLeft'
