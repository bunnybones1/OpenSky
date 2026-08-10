import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TriggerInspire = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M23.9705 0L19.0762 17.2968L11.2779 13.8416L15.9195 20.4274L0 23.9977L15.7741 27.5382L11.181 34.0518L19.0332 30.571L23.9651 48L28.8968 30.5797L36.7918 34.0817L32.1934 27.5552L48 24.0063L32.0376 20.4233L36.6951 13.816L28.8644 17.2883L23.9705 0Z"
      fill="white"
    />
  </ImageIconSVG>
))

TriggerInspire.displayName = 'TriggerInspire'
