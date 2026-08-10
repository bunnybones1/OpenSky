import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PrismBorderStroke, PrismBorderStyle } from './PrismBorder.css'
interface PrismBorderProps {
  isUnlocked: boolean
  isSelected: boolean
}

const PrismBorder = memo(({ isUnlocked, isSelected }: PrismBorderProps) => {
  const uniqueId = useMemo(() => {
    return v4()
  }, [])
  return (
    <div
      className={clsx(
        PrismBorderStyle,
        Sprinkles({ width: 'full', position: 'absolute', left: 0, top: 0 })
      )}
    >
      <svg
        viewBox="0 0 114 96"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        className={Sprinkles({ overflow: 'visible', pointerEvents: 'none' })}
      >
        <defs>
          <linearGradient
            x1="50%"
            y1="46.0886637%"
            x2="50%"
            y2="46.7898304%"
            id={`gradient=${uniqueId}`}
          >
            <stop stopColor="#4D3C7B" offset="0%" />
            <stop stopColor="#3E2F67" offset="100%" />
          </linearGradient>
          <filter
            x="-42.0%"
            y="-39.2%"
            width="184.1%"
            height="178.5%"
            filterUnits="objectBoundingBox"
            id={`filter-${uniqueId}`}
          >
            <feMorphology
              radius="3"
              operator="dilate"
              in="SourceAlpha"
              result="shadowSpreadOuter1"
            />
            <feOffset
              dx="0"
              dy="0"
              in="shadowSpreadOuter1"
              result="shadowOffsetOuter1"
            />
            <feGaussianBlur
              stdDeviation="10"
              in="shadowOffsetOuter1"
              result="shadowBlurOuter1"
            />
            <feComposite
              in="shadowBlurOuter1"
              in2="SourceAlpha"
              operator="out"
              result="shadowBlurOuter1"
            />
            <feColorMatrix
              values="0 0 0 0 0.368332999   0 0 0 0 0.241930616   0 0 0 0 0.725233844  0 0 0 1 0"
              type="matrix"
              in="shadowBlurOuter1"
            />
          </filter>
        </defs>
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <g transform="translate(-17.000000, 0.000000)">
            <g transform="translate(26.000000, 0)">
              <g>
                <polygon
                  className={PrismBorderStroke}
                  stroke={
                    isSelected
                      ? isUnlocked
                        ? '#c5b4f5'
                        : '#4d3c7b'
                      : isUnlocked
                      ? '#8E73D8'
                      : '#231445'
                  }
                  strokeWidth={isSelected ? '2' : '1'}
                  id={`path-${uniqueId}`}
                  fill={
                    isSelected && isUnlocked
                      ? '#705BAB'
                      : isUnlocked
                      ? `url(#gradient=${uniqueId})`
                      : '#1C1038'
                  }
                  points="48.0432849 0 4 23.2675848 4 71.6439713 48.0432849 96 92 71.6439713 92 23.2675848"
                />
              </g>
              <g>
                <use
                  className="prismBorderFilter dontBlockFilter"
                  fill="black"
                  fillOpacity="1"
                  opacity={isSelected ? (isUnlocked ? '1' : '0.75') : '0'}
                  filter={`url(#filter-${uniqueId})`}
                  xlinkHref={`#path-${uniqueId}`}
                />
                <use
                  stroke="#C5B4F5"
                  strokeWidth="2"
                  fill="#705BAB"
                  fillRule="evenodd"
                  xlinkHref={`#path-${uniqueId}`}
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
})

PrismBorder.displayName = 'PrismBorder'

export default PrismBorder
