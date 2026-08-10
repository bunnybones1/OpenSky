import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const LockDiamond = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M24 0L48 24L24 48L-1.20156e-06 24L24 0ZM24 6.26889L6.26889 24L24 41.7311L41.7311 24L24 6.26889Z"
      fill="black"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M24 4.17938L43.8207 24.0001L24 43.8209L4.17926 24.0001L24 4.17938ZM24 6.26901L6.26889 24.0001L24 41.7312L41.7311 24.0001L24 6.26901Z"
    />
    <path
      d="M24 6.26892L41.7311 24L24 41.7311L6.26889 24L24 6.26892Z"
      fill="#0C061E"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M23.9478 16.7939C22.5229 16.7939 21.553 17.7638 21.553 19.1888V21.5836H26.3427V19.1888C26.3427 17.7638 25.3728 16.7939 23.9478 16.7939ZM24.132 14.5833C26.7105 14.5833 28.7989 16.656 28.7989 19.2151V21.531H31.1323V30.7945H17.1318V21.531H19.4652V19.2151C19.4652 16.656 21.5536 14.5833 24.132 14.5833Z"
    />
  </IconSVG>
))

LockDiamond.displayName = 'LockDiamond'
