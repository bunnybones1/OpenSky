import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const SkyPassPremium = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={16} boxHeight={16} color={color} height={height}>
    <path
      d="M0 4.66732L6 8.66732L2.66667 8.50065L4.95 12.1673L4.5 14.1673L2.33333 13.0007L3 12.1673L0.666667 9.16732L2.08883 9.40982L0 6.16732V4.66732Z"
      fill="white"
    />
    <path
      d="M16 4.66732L10 8.66732L13.3333 8.50065L11.05 12.1673L11.5 14.1673L13.6667 13.0007L13 12.1673L15.3333 9.16732L13.9112 9.40982L16 6.16732V4.66732Z"
      fill="white"
    />
    <path
      d="M9.83333 4.50065L11.146 3.80041L12.8333 5.33398L9.66667 7.00065L7.83333 5.16732L5.84083 7.00065L2.83333 5.33398L4.52126 3.80041L5.84083 4.50065L7.83333 1.33398L9.83333 4.50065Z"
      fill="white"
    />
    <path
      d="M11.3335 9.3458L8.8835 9.5549L7.83326 6.66602L6.7835 9.5549L4.3335 9.3458L6.2585 12.0827L5.43334 15.3327L7.83326 13.5271L10.2336 15.3327L9.4085 12.0827L11.3335 9.3458Z"
      fill="white"
    />
  </IconSVG>
))

SkyPassPremium.displayName = 'SkyPassPremium'
