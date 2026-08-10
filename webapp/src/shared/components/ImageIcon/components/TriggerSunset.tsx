import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TriggerSunset = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M38.2306 34.8529L40 36.6223L36.4611 40.1612L34.6917 38.3918L38.2306 34.8529ZM11.4882 47.9336H36.5118V47.9335C36.5118 41.0235 30.9101 35.4217 24 35.4217C17.0899 35.4217 11.4882 41.0235 11.4882 47.9335V47.9336ZM9.76943 34.8529L13.3083 38.3918L11.5389 40.1612L8 36.6224L9.76943 34.8529Z"
      fill="white"
    />
    <path d="M15 0L33 3.14722e-06L29 21L19 21L15 0Z" fill="white" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M42 15L24 33L6 15L24 20.5L42 15Z"
      fill="white"
    />
    <rect x="4" y="46" width="5" height="2" fill="white" />
    <rect x="39" y="46" width="5" height="2" fill="white" />
  </ImageIconSVG>
))

TriggerSunset.displayName = 'TriggerSunset'
