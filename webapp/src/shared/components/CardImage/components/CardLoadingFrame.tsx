import { Element } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { memo } from 'react'

import {
  CardLoadingFrameStyle,
  FrameLineVariant,
  RootStyle
} from './CardLoadingFrame.css'

interface CardLoadingFrameProps {
  element: Element
  isLoaded: boolean
}

export const CardLoadingFrame = memo(
  ({ element, isLoaded }: CardLoadingFrameProps) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="160 0 553 850"
        className={clsx(CardLoadingFrameStyle, { isLoaded })}
      >
        <g className={RootStyle}>
          <g>
            <g>
              <path
                className={FrameLineVariant[element || 'default']}
                d="M265.8,35.38,525.6,139.13V657.87l.38,81.85L265.8,844.62,6,740.87V139.13L265.8,35.38m0-4.31-1.48.59L4.52,135.41l-2.52,1V743.58l2.52,1,259.8,103.75,1.49.59,1.49-.6,260.18-104.9,2.52-1,0-2.71-.38-81.85V136.42l-2.52-1L267.28,31.66l-1.48-.59Z"
                transform="translate(181.53 0)"
              />
              <polygon
                className={FrameLineVariant[element || 'default']}
                points="373.34 779.36 346.12 806.59 348.94 809.41 377.35 781.01 373.34 779.36"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="0.28"
                y="724.18"
                width="43.44"
                height="4"
                transform="translate(-303.72 206.06) rotate(-42.55)"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="508.16"
                y="704.47"
                width="4"
                height="43.44"
                transform="translate(-188.27 610.96) rotate(-47.45)"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="20"
                y="129.85"
                width="4"
                height="43.44"
                transform="translate(76.99 65.29) rotate(-47.45)"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="488.44"
                y="149.57"
                width="43.44"
                height="4"
                transform="translate(213.36 384.89) rotate(-42.55)"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="183.53"
                y="431"
                width="491.35"
                height="4"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="183.53"
                y="510.92"
                width="491.35"
                height="4"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="674.88"
                y="431"
                width="36.01"
                height="4"
              />
              <rect
                className={FrameLineVariant[element || 'default']}
                x="674.88"
                y="510.92"
                width="36.01"
                height="4"
              />
              <g>
                <g>
                  <path
                    className={FrameLineVariant[element || 'default']}
                    d="M266,810,34,714.17V161.5L266,65.67,498,161.5V714.17ZM38,711.5l228,94.17L494,711.5V164.17L266,70,38,164.17Z"
                    transform="translate(181.53 0)"
                  />
                </g>
                <path
                  className={FrameLineVariant[element || 'default']}
                  d="M266,807.84"
                  transform="translate(181.53 0)"
                />
              </g>
              <polygon
                className={FrameLineVariant[element || 'default']}
                points="517.71 781.01 544.12 807.41 546.94 804.59 521.72 779.36 517.71 781.01"
              />
            </g>
          </g>
        </g>
      </svg>
    )
  }
)

CardLoadingFrame.displayName = 'CardLoadingFrame'
