import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Play = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillOpacity={0.65}
      d="M4.0058 29.9498L9.70762 35.5716L1.17816 43.9775L4.46107 47.2167L12.9891 38.808L18.7665 44.5069L22.224 41.096L18.6225 37.5425L20.6094 35.5513L13.3323 28.376L11.3454 30.3658L7.46616 26.5404L4.0058 29.9498Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fillOpacity={0.65}
      d="M37.7175 4.36103L27.4135 14.4018L34.6891 21.577L44.9931 11.5392L47.7379 1.38794L37.7175 4.36103Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.74515 11.1498L25.4099 33.5004L29.1161 37.1542L25.5146 40.7076L28.9735 44.1185L34.7481 38.424L43.2761 46.8327L46.5604 43.5949L38.0324 35.1847L43.7328 29.5644L40.2724 26.152L36.3932 29.9789L32.687 26.3236L10.0222 3.97455L0.000427246 1L2.74515 11.1498Z"
    />
  </IconSVG>
))

Play.displayName = 'Play'
