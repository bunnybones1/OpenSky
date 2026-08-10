import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const ElementLight = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fill="rgb(221, 191, 42)"
      d="M43.71,23.52l-8.25-4.35,2.82-8.76a.56.56,0,0,0-.69-.69l-8.76,2.82L24.48,4.29a.54.54,0,0,0-1,0l-4.35,8.25L10.41,9.72a.56.56,0,0,0-.69.69l2.82,8.76L4.29,23.52a.54.54,0,0,0,0,1l8.25,4.35L9.72,37.59a.56.56,0,0,0,.69.69l8.76-2.82,4.35,8.25a.54.54,0,0,0,1,0l4.35-8.25,8.76,2.82a.56.56,0,0,0,.69-.69l-2.82-8.76,8.25-4.35a.54.54,0,0,0,0-1Zm-14.16,6A7.85,7.85,0,1,1,31.85,24,7.8,7.8,0,0,1,29.55,29.55Z"
    />
  </ImageIconSVG>
))

ElementLight.displayName = 'ElementLight'
