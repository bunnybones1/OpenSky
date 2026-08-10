import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const ElementEarth = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fill="rgb(50, 193, 30)"
      d="M42.79,14.5C30.48,14.5,25.7,21.77,24,29.16,22.3,21.77,17.52,14.5,5.21,14.5c0,0-1.14,10,7.63,12,13,3,11.37,10,5.37,18H29.79c-6-8-7.63-15,5.37-18C43.93,24.48,42.79,14.5,42.79,14.5Z"
    />
    <path
      fill="rgb(50, 193, 30)"
      d="M24,21.11a19,19,0,0,1,5.11-5.6,18.92,18.92,0,0,0-5.29-12,18.89,18.89,0,0,0-5.28,11.75A18.83,18.83,0,0,1,24,21.11Z"
    />
  </ImageIconSVG>
))

ElementEarth.displayName = 'ElementEarth'
