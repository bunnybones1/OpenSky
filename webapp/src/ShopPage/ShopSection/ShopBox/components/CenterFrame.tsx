import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CenterFrameStyle } from './CenterFrame.css'

export const CenterFrame = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          top: 0,
          pointerEvents: 'none',
          zIndex: 4,
          display: 'flex'
        }),
        CenterFrameStyle
      )}
    >
      <svg
        className={Sprinkles({ height: 'full' })}
        viewBox="0 0 64 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M2 11H0V0H64V11H61.5L57.5 15H6L2 11Z" fill="black" />
        <path d="M14 3L18 7L45.5 7L49.5 3" stroke="#705BAB" strokeLinecap="square" />
        <path d="M64 2.5H0" stroke="#705BAB" />
        <path
          d="M63.5 8L60.5 8L55.5 13L7.5 13L2.5 8.00001L0.5 8.00001"
          stroke="#4D3C7B"
          strokeLinecap="square"
        />
      </svg>
    </div>
  )
})

CenterFrame.displayName = 'CenterFrame'
