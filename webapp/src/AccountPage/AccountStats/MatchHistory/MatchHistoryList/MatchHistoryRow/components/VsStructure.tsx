import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  VsStructureLine,
  VsStructureRightSide,
  VsStructureStyle
} from './VsStructure.css'

const Struct = memo(() => {
  const uniqueId = useMemo(() => {
    return v4()
  }, [])
  return (
    <svg
      height="100%"
      viewBox="0 0 86 46"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs>
        <rect id={`path-${uniqueId}`} x="40" y="0" width="28" height="46" />
        <linearGradient
          x1="50%"
          y1="100%"
          x2="50%"
          y2="44.9060503%"
          id={`gradient-1-${uniqueId}`}
        >
          <stop stopColor="#705BAB" offset="0%" />
          <stop stopColor="#705BAB" stopOpacity="0" offset="100%" />
        </linearGradient>
        <linearGradient
          x1="70.0512035%"
          y1="50%"
          x2="0%"
          y2="50%"
          id={`gradient-2-${uniqueId}`}
        >
          <stop stopColor="#705BAB" offset="0%" />
          <stop stopColor="#705BAB" stopOpacity="0" offset="100%" />
        </linearGradient>
      </defs>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g>
          <mask id={`mask-${uniqueId}`} fill="white">
            <use xlinkHref={`#path-${uniqueId}`} />
          </mask>
          <polygon
            mask={`url(#mask-${uniqueId})`}
            points="43 0.307981672 43 65.3079817 67 0.307981672"
          />
          <polygon
            fill="#705BAB"
            opacity="0.5"
            transform="translate(54.676697, 32.654216) scale(-1, -1) rotate(20.000000) translate(-54.676697, -32.654216)"
            points="54.1332935 -1.89741206 55.2968109 -2.32089777 55.1792931 67.2211777 54.0565829 67.6298108"
          />
          <polygon
            fillOpacity="0.5"
            fill={`url(#gradient-1-${uniqueId})`}
            transform="translate(49.671179, 32.653991) scale(-1, -1) rotate(20.000000) translate(-49.671179, -32.653991)"
            points="49.1225133 -1.89596241 50.2860308 -2.31944812 50.14755 67.2302572 49.0563273 67.6274298"
          />
          <rect
            fill={`url(#gradient-2-${uniqueId})`}
            x="0"
            y="0"
            width="86"
            height="1"
          />
        </g>
      </g>
    </svg>
  )
})

Struct.displayName = 'Struct'

export const VsStructure = memo(() => (
  <div
    className={clsx(
      Sprinkles({
        height: 'full',
        top: 0,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 2
      }),
      VsStructureStyle
    )}
  >
    <div className={Sprinkles({ position: 'relative', height: 'full' })}>
      <Struct />
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            bottom: 0,
            position: 'absolute',
            zIndex: 1
          }),
          VsStructureLine
        )}
      />
    </div>
    <div
      className={clsx(
        Sprinkles({ position: 'relative', height: 'full' }),
        VsStructureRightSide
      )}
    >
      <Struct />
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            bottom: 0,
            position: 'absolute',
            zIndex: 1
          }),
          VsStructureLine
        )}
      />
    </div>
  </div>
))

VsStructure.displayName = 'VsStructure'
