import clsx from 'clsx'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { v4 } from 'uuid'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY,
  NOTIF_DISAPPEAR,
  NOTIF_READ_DELAY
} from '../shared/constants'
import { FrameTwoStyle, HorizontalFrameStyle } from '../shared/styles.css'
import { FrameTwoHorizontalClipMaskStyle } from './HorizontalFrameTwo.css'

const HAS_STARTED_DURATION =
  NOTIF_ANIM_DELAY + FRAME_ONE_APPEAR + FRAME_TRANSITION_DELAY + FRAME_TWO_APPEAR / 2

const HAS_ENDED_DURATION =
  NOTIF_ANIM_DELAY +
  FRAME_ONE_APPEAR +
  FRAME_TRANSITION_DELAY +
  FRAME_TWO_APPEAR +
  NOTIF_READ_DELAY +
  NOTIF_DISAPPEAR / 2

export const HorizontalFrameTwo = memo(() => {
  const id = useMemo(() => v4(), [])

  const [hasAnimStarted, setHasAnimStarted] = useState(false)
  const hasAnimStartedTimeout = useRef<number | null>(null)
  const hasAnimEndedTimeout = useRef<number | null>(null)
  const [hasAnimEnded, setHasAnimEnded] = useState(false)

  useLayoutEffect(() => {
    hasAnimStartedTimeout.current = window.setTimeout(() => {
      setHasAnimStarted(true)
    }, HAS_STARTED_DURATION)
    hasAnimEndedTimeout.current = window.setTimeout(() => {
      setHasAnimEnded(true)
      // eslint-disable-next-line max-len
    }, HAS_ENDED_DURATION)
  }, [])

  useEffect(() => {
    return () => {
      if (!!hasAnimStartedTimeout.current) {
        window.clearTimeout(hasAnimStartedTimeout.current)
      }
      if (!!hasAnimEndedTimeout.current) {
        window.clearTimeout(hasAnimEndedTimeout.current)
      }
    }
  }, [])

  return (
    <svg
      width="85"
      height="190"
      viewBox="0 0 85 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        Sprinkles({
          position: 'absolute',
          zIndex: 2,
          top: 0,
          opacity: hasAnimStarted ? 1 : 0
        }),
        HorizontalFrameStyle,
        FrameTwoStyle
      )}
    >
      {/* Gradient Behind Lines */}
      <path
        d="M57.0429 64.7071L57.0429 168H28.0429L28.0429 64.7071L17.3358 54H37.75L42.75 49L47.75 54L67.75 54L57.0429 64.7071Z"
        fill={`url(#${id}-gradient-paint)`}
        mask={`url(#${id}-clip-mask)`}
      />
      {/* Lines */}
      <g mask={`url(#${id}-clip-mask)`}>
        <path
          d="M83.25 54.5L66.7501 54.5M42.7501 54.5L56.7501 54.5L61.7501 54.5M42.7501 54.5L28.7501 54.5L23.7501 54.5M42.7501 54.5L42.7501 73.5M42.7501 168L37.0001 168L37.0001 147.375M42.7501 168L42.7501 145.5M42.7501 168L48.5 168L48.5001 155L48.5001 147.375M2.75 54.5L18.7501 54.5M56.75 131.5L56.75 98.5M56.75 131.5L54.25 134M56.75 131.5L56.75 139.125M28.7501 131.5L28.7501 98.5M28.7501 131.5L31.2501 134M28.7501 131.5L28.7501 139.125M42.7501 145.5L42.7501 125M42.7501 145.5L37.0001 139.75M42.7501 145.5L48.5001 139.75M56.7501 74.5L72.75 90.5M56.7501 74.5L56.7501 64.5M56.7501 74.5L56.75 98.5M28.7501 74.5L12.75 90.5M28.7501 74.5L28.7501 64.5M28.7501 74.5L28.7501 98.5M56.7501 64.5L66.7501 54.5M56.7501 64.5L56.7501 59.5L59.2501 57M66.7501 54.5L61.7501 54.5M28.7501 64.5L18.7501 54.5M28.7501 64.5L28.7501 59.5L26.2501 57M18.7501 54.5L23.7501 54.5M61.7501 54.5L54.25 62M61.7501 54.5L59.2501 57M42.7501 73.5L54.25 62M42.7501 73.5L31.2501 62M42.7501 73.5L42.7501 77.5M23.7501 54.5L26.2501 57M56.75 168L56.75 139.125M28.7501 168L28.7501 139.125M42.7501 125L54.25 113.5M42.7501 125L31.2501 113.5M42.7501 125L42.7501 77.5M54.25 113.5L54.25 101M54.25 113.5L54.25 134M54.25 101L56.75 98.5M54.25 101L54.25 66M31.2501 113.5L31.2501 101M31.2501 113.5L31.2501 134M31.2501 101L28.7501 98.5M31.2501 101L31.2501 66M31.2501 134L37.0001 139.75M54.25 134L48.5001 139.75M54.25 62L54.25 66M31.2501 62L31.2501 66M31.2501 62L26.2501 57M37.0001 139.75L37.0001 147.375M48.5001 139.75L48.5001 147.375M48.5001 147.375L56.75 139.125M37.0001 147.375L28.7501 139.125M54.25 66L42.7501 77.5M42.7501 77.5L31.2501 66M59.2501 57L26.2501 57M59.2501 57L12.75 57L26.2501 57M59.2501 57L72.7501 57"
          stroke={`url(#${id}-lines-paint-1)`}
          strokeOpacity="0.5"
        />
        <path
          d="M83.25 54.5L66.7501 54.5M42.7501 54.5L56.7501 54.5L61.7501 54.5M42.7501 54.5L28.7501 54.5L23.7501 54.5M42.7501 54.5L42.7501 73.5M42.7501 168L37.0001 168L37.0001 147.375M42.7501 168L42.7501 145.5M42.7501 168L48.5 168L48.5001 155L48.5001 147.375M2.75 54.5L18.7501 54.5M56.75 131.5L56.75 98.5M56.75 131.5L54.25 134M56.75 131.5L56.75 139.125M28.7501 131.5L28.7501 98.5M28.7501 131.5L31.2501 134M28.7501 131.5L28.7501 139.125M42.7501 145.5L42.7501 125M42.7501 145.5L37.0001 139.75M42.7501 145.5L48.5001 139.75M56.7501 74.5L72.75 90.5M56.7501 74.5L56.7501 64.5M56.7501 74.5L56.75 98.5M28.7501 74.5L12.75 90.5M28.7501 74.5L28.7501 64.5M28.7501 74.5L28.7501 98.5M56.7501 64.5L66.7501 54.5M56.7501 64.5L56.7501 59.5L59.2501 57M66.7501 54.5L61.7501 54.5M28.7501 64.5L18.7501 54.5M28.7501 64.5L28.7501 59.5L26.2501 57M18.7501 54.5L23.7501 54.5M61.7501 54.5L54.25 62M61.7501 54.5L59.2501 57M42.7501 73.5L54.25 62M42.7501 73.5L31.2501 62M42.7501 73.5L42.7501 77.5M23.7501 54.5L26.2501 57M56.75 168L56.75 139.125M28.7501 168L28.7501 139.125M42.7501 125L54.25 113.5M42.7501 125L31.2501 113.5M42.7501 125L42.7501 77.5M54.25 113.5L54.25 101M54.25 113.5L54.25 134M54.25 101L56.75 98.5M54.25 101L54.25 66M31.2501 113.5L31.2501 101M31.2501 113.5L31.2501 134M31.2501 101L28.7501 98.5M31.2501 101L31.2501 66M31.2501 134L37.0001 139.75M54.25 134L48.5001 139.75M54.25 62L54.25 66M31.2501 62L31.2501 66M31.2501 62L26.2501 57M37.0001 139.75L37.0001 147.375M48.5001 139.75L48.5001 147.375M48.5001 147.375L56.75 139.125M37.0001 147.375L28.7501 139.125M54.25 66L42.7501 77.5M42.7501 77.5L31.2501 66M59.2501 57L26.2501 57M59.2501 57L12.75 57L26.2501 57M59.2501 57L72.7501 57"
          stroke={`url(#${id}-lines-paint-2)`}
        />
        <path
          d="M83.25 54.5L66.7501 54.5M42.7501 54.5L56.7501 54.5L61.7501 54.5M42.7501 54.5L28.7501 54.5L23.7501 54.5M42.7501 54.5L42.7501 73.5M42.7501 168L37.0001 168L37.0001 147.375M42.7501 168L42.7501 145.5M42.7501 168L48.5 168L48.5001 155L48.5001 147.375M2.75 54.5L18.7501 54.5M56.75 131.5L56.75 98.5M56.75 131.5L54.25 134M56.75 131.5L56.75 139.125M28.7501 131.5L28.7501 98.5M28.7501 131.5L31.2501 134M28.7501 131.5L28.7501 139.125M42.7501 145.5L42.7501 125M42.7501 145.5L37.0001 139.75M42.7501 145.5L48.5001 139.75M56.7501 74.5L72.75 90.5M56.7501 74.5L56.7501 64.5M56.7501 74.5L56.75 98.5M28.7501 74.5L12.75 90.5M28.7501 74.5L28.7501 64.5M28.7501 74.5L28.7501 98.5M56.7501 64.5L66.7501 54.5M56.7501 64.5L56.7501 59.5L59.2501 57M66.7501 54.5L61.7501 54.5M28.7501 64.5L18.7501 54.5M28.7501 64.5L28.7501 59.5L26.2501 57M18.7501 54.5L23.7501 54.5M61.7501 54.5L54.25 62M61.7501 54.5L59.2501 57M42.7501 73.5L54.25 62M42.7501 73.5L31.2501 62M42.7501 73.5L42.7501 77.5M23.7501 54.5L26.2501 57M56.75 168L56.75 139.125M28.7501 168L28.7501 139.125M42.7501 125L54.25 113.5M42.7501 125L31.2501 113.5M42.7501 125L42.7501 77.5M54.25 113.5L54.25 101M54.25 113.5L54.25 134M54.25 101L56.75 98.5M54.25 101L54.25 66M31.2501 113.5L31.2501 101M31.2501 113.5L31.2501 134M31.2501 101L28.7501 98.5M31.2501 101L31.2501 66M31.2501 134L37.0001 139.75M54.25 134L48.5001 139.75M54.25 62L54.25 66M31.2501 62L31.2501 66M31.2501 62L26.2501 57M37.0001 139.75L37.0001 147.375M48.5001 139.75L48.5001 147.375M48.5001 147.375L56.75 139.125M37.0001 147.375L28.7501 139.125M54.25 66L42.7501 77.5M42.7501 77.5L31.2501 66M59.2501 57L26.2501 57M59.2501 57L12.75 57L26.2501 57M59.2501 57L72.7501 57"
          stroke={`url(#${id}-lines-paint-3)`}
        />
      </g>
      <defs>
        <linearGradient
          id={`${id}-gradient-paint`}
          x1="42.5429"
          y1="-10.5"
          x2="42.5429"
          y2="168"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.317708" stopColor="#F8F6E8" />
          <stop offset="0.46875" stopColor="#FFFD65" />
          <stop offset="0.784314" stopColor="#9E3703" />
          <stop offset="1" stopColor="#9E3703" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id={`${id}-lines-paint-1`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(42.7507 98) rotate(90) scale(70.5 28.5)"
        >
          <stop offset="0.442708" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`${id}-lines-paint-2`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(42.7507 54.5) rotate(90) scale(28 30)"
        >
          <stop offset="0.34375" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`${id}-lines-paint-3`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(43.75 54) rotate(-180) scale(38 3.33783)"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-clip-gradient`} gradientTransform="rotate(90)">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id={`${id}-clip-mask`}>
          <rect
            x="0"
            y="48"
            width="80"
            height={hasAnimEnded ? '0' : '300'}
            fill={`url(#${id}-clip-gradient)`}
            className={FrameTwoHorizontalClipMaskStyle}
          />
        </mask>
      </defs>
    </svg>
  )
})

HorizontalFrameTwo.displayName = 'HorizontalFrameTwo'
