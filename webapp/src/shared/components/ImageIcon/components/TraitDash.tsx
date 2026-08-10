import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TraitDash = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fill="#9BD572"
      d="M25.6396 0H20.3207L33.5 22.8571L20.3207 48H25.6396L45.7333 22.8571L25.6396 0Z"
    />
    <path
      fill="#9BD572"
      d="M13.2288 5.71429H8.5009L18 22.8571L8.5009 41.1429H13.2288L26.8216 22.8571L13.2288 5.71429Z"
    />
    <path
      fill="#9BD572"
      d="M5.54595 13.1429H2V32.5714H5.54595L12.0468 22.8571L5.54595 13.1429Z"
    />
  </ImageIconSVG>
))

TraitDash.displayName = 'TraitDash'
