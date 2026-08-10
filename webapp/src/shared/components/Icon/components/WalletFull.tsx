import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const WalletFull = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M46.1537 44.9999C47.1715 44.9999 47.9999 44.1432 47.9999 43.0908V14.4545C47.9999 13.4021 47.1715 12.5454 46.1537 12.5454H7.3846C6.36462 12.5454 5.53845 11.6911 5.53845 10.6363C5.53845 9.58159 6.36462 8.72726 7.3846 8.72726H40.6153V4.90909C40.6153 3.85667 39.7869 3 38.7691 3H5.53845C2.48426 3 0 5.56895 0 8.72726V39.2726C0 42.431 2.48426 44.9999 5.53845 44.9999H46.1537ZM38.7691 24C40.808 24 42.4614 25.7098 42.4614 27.8181C42.4614 29.9265 40.808 31.6363 38.7691 31.6363C36.7303 31.6363 35.0768 29.9265 35.0768 27.8181C35.0768 25.7098 36.7303 24 38.7691 24Z"
    />
  </IconSVG>
))

WalletFull.displayName = 'Wallet'
