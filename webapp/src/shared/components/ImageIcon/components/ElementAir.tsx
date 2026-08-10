import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const ElementAir = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fill="rgb(113, 198, 184)"
      d="M27.53,11a13.31,13.31,0,0,1,15.9,1.73A16.57,16.57,0,0,0,29.44,4h0A16.55,16.55,0,0,0,13.51,26.89,13.28,13.28,0,0,1,7.06,12.27,16.57,16.57,0,0,0,34.28,31.09,13.28,13.28,0,0,1,24.84,44a16.57,16.57,0,0,0,2.69-33ZM25.19,28.48a5.48,5.48,0,0,1-5.61-5.38.88.88,0,0,1,0-.23,5.5,5.5,0,0,1,11-.15v.15A5.48,5.48,0,0,1,25.19,28.48Z"
    />
  </ImageIconSVG>
))

ElementAir.displayName = 'ElementAir'
