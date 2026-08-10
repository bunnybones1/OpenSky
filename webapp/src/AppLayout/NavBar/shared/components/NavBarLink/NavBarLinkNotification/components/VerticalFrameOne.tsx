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
  LinkGradientStyle,
  VerticalFrameStyle
} from '../shared/styles.css'
import { FrameOneVerticalClipMaskStyle } from './VerticalFrameOne.css'

export const VerticalFrameOne = memo(() => {
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
      width="190"
      height="80"
      viewBox="0 0 190 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        Sprinkles({
          left: 0,
          position: 'absolute',
          zIndex: 3,
          opacity: hasAnimEnded ? 0 : 1,
          pointerEvents: 'none'
        }),
        VerticalFrameStyle,
        FrameOneStyle
      )}
    >
      {/* Rect that covers link */}
      <rect
        y="15"
        width="54"
        height="50"
        fill={`url(#${id}-link-gradient)`}
        className={clsx(
          LinkGradientStyle,
          Sprinkles({ opacity: hasAnimStarted ? 1 : 0 })
        )}
      />
      {/* Gradient behind lines */}
      <path
        d="M64.7071 25.7071L168 25.7071V54.7071L64.7071 54.7071L54 65.4142V45L49 40L54 35L54 15L64.7071 25.7071Z"
        fill={`url(#${id}-behind-lines-gradient)`}
        mask={`url(#${id}-clip-mask)`}
      />
      {/* Lines */}
      <g mask={`url(#${id}-clip-mask)`}>
        <path
          d="M54.5 -0.500025L54.5 15.9999M54.5 39.9999L54.5 25.9999L54.5 20.9999M54.5 39.9999L54.5 53.9999L54.5 58.9999M54.5 39.9999L73.5 39.9999M168 39.9999L168 45.7499L147.375 45.7499M168 39.9999L145.5 39.9999M168 39.9999L168 34.25L155 34.2499L147.375 34.2499M54.5 80L54.5 63.9999M131.5 26L98.5 26M131.5 26L134 28.5M131.5 26L139.125 26M131.5 53.9999L98.5 53.9999M131.5 53.9999L134 51.4999M131.5 53.9999L139.125 53.9999M145.5 39.9999L125 39.9999M145.5 39.9999L139.75 45.7499M145.5 39.9999L139.75 34.2499M74.5 25.9999L90.5 9.99995M74.5 25.9999L64.5 25.9999M74.5 25.9999L98.5 26M74.5 53.9999L90.5 70M74.5 53.9999L64.5 53.9999M74.5 53.9999L98.5 53.9999M64.5 25.9999L54.5 15.9999M64.5 25.9999L59.5 25.9999L57 23.4999M54.5 15.9999L54.5 20.9999M64.5 53.9999L54.5 63.9999M64.5 53.9999L59.5 53.9999L57 56.4999M54.5 63.9999L54.5 58.9999M54.5 20.9999L62 28.5M54.5 20.9999L57 23.4999M73.5 39.9999L62 28.5M73.5 39.9999L62 51.4999M73.5 39.9999L77.5 39.9999M54.5 58.9999L57 56.4999M168 26L139.125 26M168 53.9999L139.125 53.9999M125 39.9999L113.5 28.5M125 39.9999L113.5 51.4999M125 39.9999L77.5 39.9999M113.5 28.5L101 28.5M113.5 28.5L134 28.5M101 28.5L98.5 26M101 28.5L66 28.5M113.5 51.4999L101 51.4999M113.5 51.4999L134 51.4999M101 51.4999L98.5 53.9999M101 51.4999L66 51.4999M134 51.4999L139.75 45.7499M134 28.5L139.75 34.2499M62 28.5L66 28.5M62 51.4999L66 51.4999M62 51.4999L57 56.4999M139.75 45.7499L147.375 45.7499M139.75 34.2499L147.375 34.2499M147.375 34.2499L139.125 26M147.375 45.7499L139.125 53.9999M66 28.5L77.5 39.9999M77.5 39.9999L66 51.4999M57 23.4999L57 56.4999M57 23.4999L57 70L57 56.4999M57 23.4999L57 9.99995"
          stroke={`url(#${id}-lines-mask-paint-1)`}
          strokeOpacity="0.5"
        />
        <path
          d="M54.5 -0.500025L54.5 15.9999M54.5 39.9999L54.5 25.9999L54.5 20.9999M54.5 39.9999L54.5 53.9999L54.5 58.9999M54.5 39.9999L73.5 39.9999M168 39.9999L168 45.7499L147.375 45.7499M168 39.9999L145.5 39.9999M168 39.9999L168 34.25L155 34.2499L147.375 34.2499M54.5 80L54.5 63.9999M131.5 26L98.5 26M131.5 26L134 28.5M131.5 26L139.125 26M131.5 53.9999L98.5 53.9999M131.5 53.9999L134 51.4999M131.5 53.9999L139.125 53.9999M145.5 39.9999L125 39.9999M145.5 39.9999L139.75 45.7499M145.5 39.9999L139.75 34.2499M74.5 25.9999L90.5 9.99995M74.5 25.9999L64.5 25.9999M74.5 25.9999L98.5 26M74.5 53.9999L90.5 70M74.5 53.9999L64.5 53.9999M74.5 53.9999L98.5 53.9999M64.5 25.9999L54.5 15.9999M64.5 25.9999L59.5 25.9999L57 23.4999M54.5 15.9999L54.5 20.9999M64.5 53.9999L54.5 63.9999M64.5 53.9999L59.5 53.9999L57 56.4999M54.5 63.9999L54.5 58.9999M54.5 20.9999L62 28.5M54.5 20.9999L57 23.4999M73.5 39.9999L62 28.5M73.5 39.9999L62 51.4999M73.5 39.9999L77.5 39.9999M54.5 58.9999L57 56.4999M168 26L139.125 26M168 53.9999L139.125 53.9999M125 39.9999L113.5 28.5M125 39.9999L113.5 51.4999M125 39.9999L77.5 39.9999M113.5 28.5L101 28.5M113.5 28.5L134 28.5M101 28.5L98.5 26M101 28.5L66 28.5M113.5 51.4999L101 51.4999M113.5 51.4999L134 51.4999M101 51.4999L98.5 53.9999M101 51.4999L66 51.4999M134 51.4999L139.75 45.7499M134 28.5L139.75 34.2499M62 28.5L66 28.5M62 51.4999L66 51.4999M62 51.4999L57 56.4999M139.75 45.7499L147.375 45.7499M139.75 34.2499L147.375 34.2499M147.375 34.2499L139.125 26M147.375 45.7499L139.125 53.9999M66 28.5L77.5 39.9999M77.5 39.9999L66 51.4999M57 23.4999L57 56.4999M57 23.4999L57 70L57 56.4999M57 23.4999L57 9.99995"
          stroke={`url(#${id}-lines-mask-paint-2)`}
        />
        <path
          d="M54.5 -0.500025L54.5 15.9999M54.5 39.9999L54.5 25.9999L54.5 20.9999M54.5 39.9999L54.5 53.9999L54.5 58.9999M54.5 39.9999L73.5 39.9999M168 39.9999L168 45.7499L147.375 45.7499M168 39.9999L145.5 39.9999M168 39.9999L168 34.25L155 34.2499L147.375 34.2499M54.5 80L54.5 63.9999M131.5 26L98.5 26M131.5 26L134 28.5M131.5 26L139.125 26M131.5 53.9999L98.5 53.9999M131.5 53.9999L134 51.4999M131.5 53.9999L139.125 53.9999M145.5 39.9999L125 39.9999M145.5 39.9999L139.75 45.7499M145.5 39.9999L139.75 34.2499M74.5 25.9999L90.5 9.99995M74.5 25.9999L64.5 25.9999M74.5 25.9999L98.5 26M74.5 53.9999L90.5 70M74.5 53.9999L64.5 53.9999M74.5 53.9999L98.5 53.9999M64.5 25.9999L54.5 15.9999M64.5 25.9999L59.5 25.9999L57 23.4999M54.5 15.9999L54.5 20.9999M64.5 53.9999L54.5 63.9999M64.5 53.9999L59.5 53.9999L57 56.4999M54.5 63.9999L54.5 58.9999M54.5 20.9999L62 28.5M54.5 20.9999L57 23.4999M73.5 39.9999L62 28.5M73.5 39.9999L62 51.4999M73.5 39.9999L77.5 39.9999M54.5 58.9999L57 56.4999M168 26L139.125 26M168 53.9999L139.125 53.9999M125 39.9999L113.5 28.5M125 39.9999L113.5 51.4999M125 39.9999L77.5 39.9999M113.5 28.5L101 28.5M113.5 28.5L134 28.5M101 28.5L98.5 26M101 28.5L66 28.5M113.5 51.4999L101 51.4999M113.5 51.4999L134 51.4999M101 51.4999L98.5 53.9999M101 51.4999L66 51.4999M134 51.4999L139.75 45.7499M134 28.5L139.75 34.2499M62 28.5L66 28.5M62 51.4999L66 51.4999M62 51.4999L57 56.4999M139.75 45.7499L147.375 45.7499M139.75 34.2499L147.375 34.2499M147.375 34.2499L139.125 26M147.375 45.7499L139.125 53.9999M66 28.5L77.5 39.9999M77.5 39.9999L66 51.4999M57 23.4999L57 56.4999M57 23.4999L57 70L57 56.4999M57 23.4999L57 9.99995"
          stroke={`url(#${id}-lines-mask-paint-3)`}
        />
      </g>
      <defs>
        {/* Clipping gradient */}
        <linearGradient id={`${id}-clip-gradient`}>
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <radialGradient
          id={`${id}-lines-mask-paint-1`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(98 39.9993) scale(70.5 28.5)"
        >
          <stop offset="0.442708" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`${id}-lines-mask-paint-2`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(54.5 39.9993) scale(28 30)"
        >
          <stop offset="0.34375" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`${id}-lines-mask-paint-3`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(54 39) rotate(90) scale(38 3.33783)"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${id}-link-gradient`}
          x1="54"
          y1="40"
          x2="-1.5"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C3530B" />
          <stop offset="0.207207" stopColor="#9E3703" stopOpacity="0.7" />
          <stop offset="1" stopColor="#9E3703" stopOpacity="0" />
        </linearGradient>

        <linearGradient
          id={`${id}-behind-lines-gradient`}
          x1="42"
          y1="40.2071"
          x2="168"
          y2="40.2071"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.317708" stopColor="#F8F6E8" />
          <stop offset="0.46875" stopColor="#FFFD65" />
          <stop offset="0.784314" stopColor="#9E3703" />
          <stop offset="1" stopColor="#9E3703" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-clip-gradient`}>
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id={`${id}-clip-mask`}>
          <rect
            x="48"
            y="0"
            height="80"
            width={hasAnimStarted ? '300' : '0'}
            fill={`url(#${id}-clip-gradient)`}
            className={FrameOneVerticalClipMaskStyle}
          />
        </mask>
      </defs>
    </svg>
  )
})

VerticalFrameOne.displayName = 'VerticalFrameOne'
