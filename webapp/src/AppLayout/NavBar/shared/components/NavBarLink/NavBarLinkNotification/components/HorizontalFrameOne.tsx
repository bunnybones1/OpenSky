import clsx from 'clsx'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { v4 } from 'uuid'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY
} from '../shared/constants'
import {
  FrameOneStyle,
  HorizontalFrameStyle,
  LinkGradientStyle
} from '../shared/styles.css'
import { FrameOneHorizontalClipMaskStyle } from './HorizontalFrameOne.css'

export const HorizontalFrameOne = memo(() => {
  const id = useMemo(() => v4(), [])

  const [hasAnimStarted, setHasAnimStarted] = useState(false)
  const hasAnimStartedTimeout = useRef<number | null>(null)
  const hasAnimEndedTimeout = useRef<number | null>(null)
  const [hasAnimEnded, setHasAnimEnded] = useState(false)

  useLayoutEffect(() => {
    hasAnimStartedTimeout.current = window.setTimeout(
      () => {
        setHasAnimStarted(true)
      },
      NOTIF_ANIM_DELAY + FRAME_ONE_APPEAR / 2
    )
    hasAnimEndedTimeout.current = window.setTimeout(
      () => {
        setHasAnimEnded(true)
        // eslint-disable-next-line max-len
      },
      NOTIF_ANIM_DELAY +
        FRAME_ONE_APPEAR +
        FRAME_TRANSITION_DELAY +
        FRAME_TWO_APPEAR / 2
    )
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
      width="81"
      height="190"
      viewBox="0 0 81 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        Sprinkles({
          position: 'absolute',
          zIndex: 3,
          top: 0,
          opacity: hasAnimEnded ? 0 : 1,
          pointerEvents: 'none'
        }),
        HorizontalFrameStyle,
        FrameOneStyle
      )}
    >
      {/* Link Gradient */}
      <rect
        x="69.8"
        width="54"
        height="60"
        transform="rotate(90 69.8 0)"
        fill={`url(#${id}-link-gradient)`}
        className={clsx(
          LinkGradientStyle,
          Sprinkles({ opacity: hasAnimStarted ? 1 : 0 })
        )}
      />
      {/* Gradient behind lines */}
      <path
        d="M55.0429 64.7071L55.0429 168H26.0429L26.0429 64.7071L15.3358 54H35.75L40.75 49L45.75 54L65.75 54L55.0429 64.7071Z"
        fill={`url(#${id}-gradient-paint)`}
        mask={`url(#${id}-clip-mask)`}
      />
      {/* Lines */}
      <g mask={`url(#${id}-clip-mask)`}>
        <path
          d="M81.25 54.5L64.75 54.5M40.7501 54.5L54.75 54.5L59.75 54.5M40.7501 54.5L26.7501 54.5L21.7501 54.5M40.7501 54.5L40.7501 73.5M40.75 168L35 168L35 147.375M40.75 168L40.75 145.5M40.75 168L46.5 168L46.5 155L46.5 147.375M0.749971 54.5L16.7501 54.5M54.75 131.5L54.75 98.5M54.75 131.5L52.25 134M54.75 131.5L54.75 139.125M26.75 131.5L26.7501 98.5M26.75 131.5L29.25 134M26.75 131.5L26.75 139.125M40.75 145.5L40.75 125M40.75 145.5L35 139.75M40.75 145.5L46.5 139.75M54.75 74.5L70.75 90.5M54.75 74.5L54.75 64.5M54.75 74.5L54.75 98.5M26.7501 74.5L10.75 90.5M26.7501 74.5L26.7501 64.5M26.7501 74.5L26.7501 98.5M54.75 64.5L64.75 54.5M54.75 64.5L54.75 59.5L57.25 57M64.75 54.5L59.75 54.5M26.7501 64.5L16.7501 54.5M26.7501 64.5L26.7501 59.5L24.2501 57M16.7501 54.5L21.7501 54.5M59.75 54.5L52.25 62M59.75 54.5L57.25 57M40.7501 73.5L52.25 62M40.7501 73.5L29.25 62M40.7501 73.5L40.7501 77.5M21.7501 54.5L24.2501 57M54.75 168L54.75 139.125M26.75 168L26.75 139.125M40.75 125L52.25 113.5M40.75 125L29.2501 113.5M40.75 125L40.7501 77.5M52.25 113.5L52.25 101M52.25 113.5L52.25 134M52.25 101L54.75 98.5M52.25 101L52.25 66M29.2501 113.5L29.25 101M29.2501 113.5L29.25 134M29.25 101L26.7501 98.5M29.25 101L29.25 66M29.25 134L35 139.75M52.25 134L46.5 139.75M52.25 62L52.25 66M29.25 62L29.25 66M29.25 62L24.2501 57M35 139.75L35 147.375M46.5 139.75L46.5 147.375M46.5 147.375L54.75 139.125M35 147.375L26.75 139.125M52.25 66L40.7501 77.5M40.7501 77.5L29.25 66M57.25 57L24.2501 57M57.25 57L10.75 57L24.2501 57M57.25 57L70.75 57"
          stroke={`url(#${id}-lines-paint-1)`}
          strokeOpacity="0.5"
        />
        <path
          d="M81.25 54.5L64.75 54.5M40.7501 54.5L54.75 54.5L59.75 54.5M40.7501 54.5L26.7501 54.5L21.7501 54.5M40.7501 54.5L40.7501 73.5M40.75 168L35 168L35 147.375M40.75 168L40.75 145.5M40.75 168L46.5 168L46.5 155L46.5 147.375M0.749971 54.5L16.7501 54.5M54.75 131.5L54.75 98.5M54.75 131.5L52.25 134M54.75 131.5L54.75 139.125M26.75 131.5L26.7501 98.5M26.75 131.5L29.25 134M26.75 131.5L26.75 139.125M40.75 145.5L40.75 125M40.75 145.5L35 139.75M40.75 145.5L46.5 139.75M54.75 74.5L70.75 90.5M54.75 74.5L54.75 64.5M54.75 74.5L54.75 98.5M26.7501 74.5L10.75 90.5M26.7501 74.5L26.7501 64.5M26.7501 74.5L26.7501 98.5M54.75 64.5L64.75 54.5M54.75 64.5L54.75 59.5L57.25 57M64.75 54.5L59.75 54.5M26.7501 64.5L16.7501 54.5M26.7501 64.5L26.7501 59.5L24.2501 57M16.7501 54.5L21.7501 54.5M59.75 54.5L52.25 62M59.75 54.5L57.25 57M40.7501 73.5L52.25 62M40.7501 73.5L29.25 62M40.7501 73.5L40.7501 77.5M21.7501 54.5L24.2501 57M54.75 168L54.75 139.125M26.75 168L26.75 139.125M40.75 125L52.25 113.5M40.75 125L29.2501 113.5M40.75 125L40.7501 77.5M52.25 113.5L52.25 101M52.25 113.5L52.25 134M52.25 101L54.75 98.5M52.25 101L52.25 66M29.2501 113.5L29.25 101M29.2501 113.5L29.25 134M29.25 101L26.7501 98.5M29.25 101L29.25 66M29.25 134L35 139.75M52.25 134L46.5 139.75M52.25 62L52.25 66M29.25 62L29.25 66M29.25 62L24.2501 57M35 139.75L35 147.375M46.5 139.75L46.5 147.375M46.5 147.375L54.75 139.125M35 147.375L26.75 139.125M52.25 66L40.7501 77.5M40.7501 77.5L29.25 66M57.25 57L24.2501 57M57.25 57L10.75 57L24.2501 57M57.25 57L70.75 57"
          stroke={`url(#${id}-lines-paint-2)`}
        />
        <path
          d="M81.25 54.5L64.75 54.5M40.7501 54.5L54.75 54.5L59.75 54.5M40.7501 54.5L26.7501 54.5L21.7501 54.5M40.7501 54.5L40.7501 73.5M40.75 168L35 168L35 147.375M40.75 168L40.75 145.5M40.75 168L46.5 168L46.5 155L46.5 147.375M0.749971 54.5L16.7501 54.5M54.75 131.5L54.75 98.5M54.75 131.5L52.25 134M54.75 131.5L54.75 139.125M26.75 131.5L26.7501 98.5M26.75 131.5L29.25 134M26.75 131.5L26.75 139.125M40.75 145.5L40.75 125M40.75 145.5L35 139.75M40.75 145.5L46.5 139.75M54.75 74.5L70.75 90.5M54.75 74.5L54.75 64.5M54.75 74.5L54.75 98.5M26.7501 74.5L10.75 90.5M26.7501 74.5L26.7501 64.5M26.7501 74.5L26.7501 98.5M54.75 64.5L64.75 54.5M54.75 64.5L54.75 59.5L57.25 57M64.75 54.5L59.75 54.5M26.7501 64.5L16.7501 54.5M26.7501 64.5L26.7501 59.5L24.2501 57M16.7501 54.5L21.7501 54.5M59.75 54.5L52.25 62M59.75 54.5L57.25 57M40.7501 73.5L52.25 62M40.7501 73.5L29.25 62M40.7501 73.5L40.7501 77.5M21.7501 54.5L24.2501 57M54.75 168L54.75 139.125M26.75 168L26.75 139.125M40.75 125L52.25 113.5M40.75 125L29.2501 113.5M40.75 125L40.7501 77.5M52.25 113.5L52.25 101M52.25 113.5L52.25 134M52.25 101L54.75 98.5M52.25 101L52.25 66M29.2501 113.5L29.25 101M29.2501 113.5L29.25 134M29.25 101L26.7501 98.5M29.25 101L29.25 66M29.25 134L35 139.75M52.25 134L46.5 139.75M52.25 62L52.25 66M29.25 62L29.25 66M29.25 62L24.2501 57M35 139.75L35 147.375M46.5 139.75L46.5 147.375M46.5 147.375L54.75 139.125M35 147.375L26.75 139.125M52.25 66L40.7501 77.5M40.7501 77.5L29.25 66M57.25 57L24.2501 57M57.25 57L10.75 57L24.2501 57M57.25 57L70.75 57"
          stroke={`url(#${id}-lines-paint-3)`}
        />
      </g>
      <defs>
        <linearGradient
          id={`${id}-link-gradient`}
          x1="119.75"
          y1="25"
          x2="64.25"
          y2="25"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C3530B" />
          <stop offset="0.207207" stopColor="#9E3703" stopOpacity="0.7" />
          <stop offset="1" stopColor="#9E3703" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-gradient-paint`}
          x1="40.5429"
          y1="41"
          x2="40.5429"
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
          gradientTransform="translate(40.7507 98) rotate(90) scale(70.5 28.5)"
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
          gradientTransform="translate(40.7507 54.5) rotate(90) scale(28 30)"
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
          gradientTransform="translate(41.75 54) rotate(-180) scale(38 3.33783)"
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
            height={hasAnimStarted ? '300' : '0'}
            fill={`url(#${id}-clip-gradient)`}
            className={FrameOneHorizontalClipMaskStyle}
          />
        </mask>
      </defs>
    </svg>
  )
})

HorizontalFrameOne.displayName = 'HorizontalFrameOne'
