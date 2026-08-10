import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TraitWither = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.7295 0.136809C20.8078 0.122306 20.8832 0.110704 20.9644 0.0991027C30.768 -1.40043 47.0308 14.3577 48.5013 31.0556C42.782 21.4832 35.622 15.2462 29.9362 10.2933C25.5297 6.45483 22.0085 3.3876 20.7295 0.136809ZM8.67524 6.60771C11.0335 11.1569 16.4028 15.6231 22.5629 20.7472C29.4264 26.4563 37.2717 32.982 43.0281 41.3493C41.546 24.5209 18.4556 4.82103 8.67524 6.60771ZM0 16.5649C2.24191 20.391 6.22884 23.5245 11.2358 27.4597C17.3123 32.2354 24.891 38.1919 32.6764 48C31.1943 31.1716 9.77741 14.7812 0 16.5649Z"
      fill="#F251C1"
    />
  </ImageIconSVG>
))

TraitWither.displayName = 'TraitWither'
