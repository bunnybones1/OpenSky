import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TriggerGeneric = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M27 0L9 30H20.997V48L39 18H27V0Z"
      fill="white"
    />
  </ImageIconSVG>
))

TriggerGeneric.displayName = 'TriggerGeneric'
