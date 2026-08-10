import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const Twitch = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={192} boxHeight={192} height={height}>
    <path d="M28 8H180V108L122 162H28V8Z" fill="white" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.9376 0L4 32.96V167.648H49.996V192H75.8793L100.31 167.648H137.686L188 117.496V0H16.9376ZM36 16H172V107.253L143.667 135.768H98.3287L74.2436 160V135.768H36V16ZM128 100H144V48H128V100ZM80 100H96V48H80V100Z"
      fill="#874AF6"
    />
  </ImageIconSVG>
))

Twitch.displayName = 'Twitch'
