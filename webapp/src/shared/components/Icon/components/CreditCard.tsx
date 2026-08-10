import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const CreditCard = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 13C0 10.2386 2.23858 8 5 8H43C45.7614 8 48 10.2386 48 13V14H0V13ZM0 20V36C0 38.7614 2.23858 41 5 41H43C45.7614 41 48 38.7614 48 36V20H0ZM32 26C32 25.4477 32.4477 25 33 25H43C43.5523 25 44 25.4477 44 26V32C44 32.5523 43.5523 33 43 33H33C32.4477 33 32 32.5523 32 32V26Z"
    />
  </IconSVG>
))

CreditCard.displayName = 'CreditCard'
