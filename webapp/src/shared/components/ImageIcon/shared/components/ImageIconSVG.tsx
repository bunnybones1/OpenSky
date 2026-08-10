import clsx from 'clsx'
import { memo, ReactNode } from 'react'

import { IconSprinkles } from '~/shared/style/IconSprinkles.css'

import { ImageIconSVGProps as _ImageIconSVGProps } from '../types/image-icon-svg-props'

export interface ImageIconSVGProps extends _ImageIconSVGProps {
  children: ReactNode
  boxHeight: number
  boxWidth: number
  className?: string
}

export const ImageIconSVG = memo(
  ({ height, children, boxHeight, boxWidth, className }: ImageIconSVGProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      aria-hidden={true}
      className={clsx('horizon-icon', IconSprinkles({ height }), className)}
    >
      {children}
    </svg>
  )
)

ImageIconSVG.displayName = 'ImageIconSVG'
