import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TriggerSummon = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={49} boxHeight={50} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.76688 45.6795C1.76688 24.7862 13.5316 14.3777 19.7979 14.3777C23.9355 14.3777 30.4134 17.8433 30.7325 24.5678H23.0926L23.8084 25.9252L35.2073 47.5731L36.0255 49.1288L36.8468 47.573L48.2456 25.9254L48.9614 24.5679L40.4127 24.5678C40.0567 9.94088 30.7325 0.9988 22.077 1.00177C19.7978 1.00256 21.7333 0.9988 21.5593 1.00177C9.50686 1.20088 -2.91926 10.213 1.76688 45.6795Z"
      fill="white"
    />
  </ImageIconSVG>
))

TriggerSummon.displayName = 'TriggerSummon'
