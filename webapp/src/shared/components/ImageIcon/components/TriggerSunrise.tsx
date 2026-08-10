import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TriggerSunrise = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22.7488 4.17059V0H25.2511V4.17059H22.7488ZM39.9999 6.62235L38.2305 4.85292L34.6917 8.39178L36.4611 10.1612L39.9999 6.62235ZM36.5117 17.9336H11.4882V17.9335C11.4882 11.0235 17.0899 5.42177 23.9999 5.42177C30.91 5.42177 36.5117 11.0235 36.5117 17.9335V17.9336ZM13.3082 8.39181L9.76937 4.85295L7.99994 6.62238L11.5388 10.1612L13.3082 8.39181Z"
      fill="white"
    />
    <path d="M33 48L15 48L19 32L29 32L33 48Z" fill="white" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 38L24 20L42 38L24 32.5L6 38Z"
      fill="white"
    />
    <rect x="4" y="16" width="5" height="2" fill="white" />
    <rect x="39" y="16" width="5" height="2" fill="white" />
  </ImageIconSVG>
))

TriggerSunrise.displayName = 'TriggerSunrise'
