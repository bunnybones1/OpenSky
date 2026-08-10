import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TraitGuard = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      d="M23.5714 0C27 2.4 37.2857 7.2 44.1429 7.2V16.8C44.1429 26.4 33.8571 40.8 23.5714 48C13.2857 40.8 3 26.4 3 16.8V7.2C9.85714 7.2 20.1429 2.4 23.5714 0Z"
      fill="#61DAC5"
    />
  </ImageIconSVG>
))

TraitGuard.displayName = 'TraitGuard'
