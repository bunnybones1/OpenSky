import clsx from 'clsx'
import { memo, ReactNode } from 'react'

import { IconSprinkles } from '~/shared/style/IconSprinkles.css'

import { IconSVGSprinkles } from '../style/IconSVG.css'
import { IconSVGProps as _IconSVGProps } from '../types/icon-svg-props'

export interface IconSVGProps extends _IconSVGProps {
  children: ReactNode
  boxHeight: number
  boxWidth: number
  className?: string
}

export const IconSVG = memo(
  ({ color, height, children, boxHeight, boxWidth, className }: IconSVGProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      aria-hidden={true}
      className={clsx(
        'horizon-icon',
        IconSVGSprinkles({ fill: color }),
        IconSprinkles({ height }),
        className
      )}
    >
      {children}
    </svg>
  )
)

IconSVG.displayName = 'IconSVG'
