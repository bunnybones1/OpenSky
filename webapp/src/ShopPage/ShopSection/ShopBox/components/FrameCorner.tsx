import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FrameCornerStyle } from './FrameCorner.css'

interface FrameCornerProps {
  type: 'TOPLEFT' | 'TOPRIGHT' | 'BOTTOMLEFT' | 'BOTTOMRIGHT'
}

export const FrameCorner = memo(({ type }: FrameCornerProps) => {
  return (
    <div
      className={clsx(
        Sprinkles({
          zIndex: 5,
          position: 'absolute',
          top: type === 'TOPLEFT' || type === 'TOPRIGHT' ? 0 : undefined,
          bottom: type === 'BOTTOMLEFT' || type === 'BOTTOMRIGHT' ? 0 : undefined,
          right: type === 'BOTTOMRIGHT' || type === 'TOPRIGHT' ? 0 : undefined,
          left: type === 'TOPLEFT' || type === 'BOTTOMLEFT' ? 0 : undefined,
          pointerEvents: 'none'
        }),
        {
          isBottomRight: type === 'BOTTOMRIGHT',
          isBottomLeft: type === 'BOTTOMLEFT',
          isTopRight: type === 'TOPRIGHT',
          isTopLeft: type === 'TOPLEFT'
        },
        FrameCornerStyle
      )}
    >
      <svg
        className={Sprinkles({ height: 'full' })}
        viewBox="0 0 46 37"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M10 29L4.5 34.5L3 36V11.5L11.5 3H46V11H16L10 17V29Z" fill="black" />
        <rect x="3" y="33" width="3" height="4" fill="black" />
        <path d="M15 8H45.5" stroke="#4D3C7B" strokeLinecap="square" />
        <path d="M19.5 3L7.5 15V27.5L3 32" stroke="#705BAB" strokeLinecap="square" />
        <path d="M10.5 0H46V2H11.5L2 11.5V37H0V10.5L10.5 0Z" fill="black" />
        <path d="M46 2.5H11.5L2.5 11.5V37" stroke="#705BAB" />
      </svg>
    </div>
  )
})

FrameCorner.displayName = 'FrameCorner'
