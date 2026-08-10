import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const Windows = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      d="M0 6.81818L19.4727 4.14545V22.9636H0V6.81818ZM21.8182 3.76364L47.6182 0V22.8H21.8182V3.76364ZM0 24.9491H19.4727V43.8218L0 41.0945V24.9491ZM21.8182 25.2H47.6182V47.7818L21.8182 44.1273V25.2Z"
      fill="#0078D6"
    />
  </ImageIconSVG>
))

Windows.displayName = 'Windows'
