import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const ElementMetal = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fill="rgb(181, 181, 143)"
      d="M24.2,14l7.37,10.17L23.8,34,16.43,23.87,24.2,14m.19-10-.53.68L9.22,23.35l-.3.38.29.4L23.1,43.31l.51.69.53-.68L38.78,24.65l.3-.38-.29-.4L24.9,4.7,24.39,4Z"
    />
  </ImageIconSVG>
))

ElementMetal.displayName = 'ElementMetal'
