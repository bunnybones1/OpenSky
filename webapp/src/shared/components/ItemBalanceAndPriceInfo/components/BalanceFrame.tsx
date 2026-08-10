import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BalanceFrameStyle } from './BalanceFrame.css'

/* eslint-disable max-len */
export const BalanceFrame = memo(() => {
  const uniqueId = useMemo(() => {
    return v4()
  }, [])
  return (
    <svg
      className={clsx(Sprinkles({ width: 'full' }), BalanceFrameStyle)}
      viewBox="0 0 176 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          id={`radial-${uniqueId}`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(88 44.25) rotate(90) scale(33.25 52.25)"
        >
          <stop stopColor="#03010A" />
          <stop offset="1" stopColor="#03010A" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`paint-1-${uniqueId}`}
          x1="88"
          y1="24.5"
          x2="88"
          y2="36.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#321D62" stopOpacity="0" />
          <stop offset="1" stopColor="#321D62" />
        </linearGradient>
        <linearGradient
          id={`paint-2-${uniqueId}`}
          x1="88"
          y1="24.5"
          x2="88"
          y2="36.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#321D62" stopOpacity="0" />
          <stop offset="1" stopColor="#321D62" />
        </linearGradient>
        <linearGradient
          id={`paint-3-${uniqueId}`}
          x1="17.4712"
          y1="9.5"
          x2="17.4712"
          y2="39"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#321D62" stopOpacity="0" />
          <stop offset="1" stopColor="#321D62" />
        </linearGradient>
        <linearGradient
          id={`paint-4-${uniqueId}`}
          x1="88"
          y1="24.5"
          x2="88"
          y2="36.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#321D62" stopOpacity="0" />
          <stop offset="1" stopColor="#321D62" />
        </linearGradient>
        <linearGradient
          id={`paint-5-${uniqueId}`}
          x1="158.5"
          y1="9.5"
          x2="158.5"
          y2="39"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#321D62" stopOpacity="0" />
          <stop offset="1" stopColor="#321D62" />
        </linearGradient>
        <radialGradient
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(72.5 41) rotate(90) scale(8 12)"
        >
          <stop stopColor="#C7D7F7" />
          <stop offset="1" stopColor="#C7D7F7" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(104.5 41) rotate(90) scale(8 12)"
        >
          <stop stopColor="#F1D55E" />
          <stop offset="1" stopColor="#F1D55E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M35 55H141L175 21V1H1V21L35 55Z" fill={`url(#radial-${uniqueId})`} />
      <path d="M35 55H141" stroke={`url(#paint-1-${uniqueId})`} />
      <path d="M35 55L1 21" stroke={`url(#paint-2-${uniqueId})`} />
      <path d="M19 30L44 55" stroke="#321D62" strokeOpacity="0.6" />
      <path d="M1.00018 1L18.9712 18.971V39" stroke={`url(#paint-3-${uniqueId})`} />
      <path d="M141 55L175 21" stroke={`url(#paint-4-${uniqueId})`} />
      <path d="M157 30L132 55" stroke="#321D62" strokeOpacity="0.6" />
      <path d="M174.971 1L157 18.971V39" stroke={`url(#paint-5-${uniqueId})`} />
    </svg>
  )
})

BalanceFrame.displayName = 'BalanceFrame'
