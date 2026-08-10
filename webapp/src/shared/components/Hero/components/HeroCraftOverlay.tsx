import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { HeroCrafOverlaytIcon, HeroCraftOverlayStyle } from './HeroCraftOverlay.css'

interface CraftableOverlayProps {
  isCraftable: boolean
}

export const HeroCraftOverlay = memo(({ isCraftable }: CraftableOverlayProps) => {
  const id = useMemo(() => v4(), [])

  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          top: 0,
          opacity: isCraftable ? 1 : 0,
          pointerEvents: 'none'
        }),
        HeroCraftOverlayStyle
      )}
    >
      <svg
        className={Sprinkles({ width: 'full' })}
        viewBox="0 0 239 353"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask
          id={`${id}-mask-0`}
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="15"
          width="239"
          height="338"
        >
          <path
            d="M10.3882 60.4193L119.756 15.5964L228.764 59.3796V281.776H239L221.6 303.311L215.97 304.346L198.57 322.979L176.563 326.603L167.351 336.954L140.739 341.095L119.244 353L98.2612 341.095L72.1606 336.954L62.9486 326.603L41.454 322.979L27.1242 307.452L23.5418 303.828L17.4004 302.793L0 281.572L10.3882 281.776V60.4193Z"
            fill={`url(#${id}-paint-0)`}
          />
        </mask>
        <g mask={`url(#${id}-mask-0)`}>
          <path
            d="M17.6683 302.331L1.07394 282.093L10.3784 282.276L10.8882 282.286V281.776V60.7548L119.758 16.136L228.264 59.7176V281.776V282.276H228.764H237.953L221.327 302.853L215.88 303.854L215.717 303.884L215.605 304.005L198.32 322.514L176.482 326.109L176.307 326.138L176.19 326.27L167.097 336.488L140.662 340.601L140.574 340.615L140.497 340.658L119.247 352.427L98.508 340.66L98.4291 340.616L98.3396 340.601L72.4154 336.489L63.3221 326.27L63.2052 326.139L63.0317 326.11L41.7055 322.515L27.4916 307.113L27.4858 307.106L27.4797 307.1L23.8973 303.477L23.7839 303.362L23.6249 303.335L17.6683 302.331Z"
            fill={`url(#${id}-paint-1)`}
            fillOpacity="0.5"
          />
          <path
            d="M17.6683 302.331L1.07394 282.093L10.3784 282.276L10.8882 282.286V281.776V60.7548L119.758 16.136L228.264 59.7176V281.776V282.276H228.764H237.953L221.327 302.853L215.88 303.854L215.717 303.884L215.605 304.005L198.32 322.514L176.482 326.109L176.307 326.138L176.19 326.27L167.097 336.488L140.662 340.601L140.574 340.615L140.497 340.658L119.247 352.427L98.508 340.66L98.4291 340.616L98.3396 340.601L72.4154 336.489L63.3221 326.27L63.2052 326.139L63.0317 326.11L41.7055 322.515L27.4916 307.113L27.4858 307.106L27.4797 307.1L23.8973 303.477L23.7839 303.362L23.6249 303.335L17.6683 302.331Z"
            fill={`url(#${id}-paint-2)`}
            fillOpacity="0.6"
          />
          <path
            d="M17.6683 302.331L1.07394 282.093L10.3784 282.276L10.8882 282.286V281.776V60.7548L119.758 16.136L228.264 59.7176V281.776V282.276H228.764H237.953L221.327 302.853L215.88 303.854L215.717 303.884L215.605 304.005L198.32 322.514L176.482 326.109L176.307 326.138L176.19 326.27L167.097 336.488L140.662 340.601L140.574 340.615L140.497 340.658L119.247 352.427L98.508 340.66L98.4291 340.616L98.3396 340.601L72.4154 336.489L63.3221 326.27L63.2052 326.139L63.0317 326.11L41.7055 322.515L27.4916 307.113L27.4858 307.106L27.4797 307.1L23.8973 303.477L23.7839 303.362L23.6249 303.335L17.6683 302.331Z"
            fill={`url(#${id}-paint-3)`}
            fillOpacity="0.6"
          />
          <path
            d="M17.6683 302.331L1.07394 282.093L10.3784 282.276L10.8882 282.286V281.776V60.7548L119.758 16.136L228.264 59.7176V281.776V282.276H228.764H237.953L221.327 302.853L215.88 303.854L215.717 303.884L215.605 304.005L198.32 322.514L176.482 326.109L176.307 326.138L176.19 326.27L167.097 336.488L140.662 340.601L140.574 340.615L140.497 340.658L119.247 352.427L98.508 340.66L98.4291 340.616L98.3396 340.601L72.4154 336.489L63.3221 326.27L63.2052 326.139L63.0317 326.11L41.7055 322.515L27.4916 307.113L27.4858 307.106L27.4797 307.1L23.8973 303.477L23.7839 303.362L23.6249 303.335L17.6683 302.331Z"
            fill={`url(#${id}-paint-4)`}
            fillOpacity="0.6"
          />
          <path
            d="M17.6683 302.331L1.07394 282.093L10.3784 282.276L10.8882 282.286V281.776V60.7548L119.758 16.136L228.264 59.7176V281.776V282.276H228.764H237.953L221.327 302.853L215.88 303.854L215.717 303.884L215.605 304.005L198.32 322.514L176.482 326.109L176.307 326.138L176.19 326.27L167.097 336.488L140.662 340.601L140.574 340.615L140.497 340.658L119.247 352.427L98.508 340.66L98.4291 340.616L98.3396 340.601L72.4154 336.489L63.3221 326.27L63.2052 326.139L63.0317 326.11L41.7055 322.515L27.4916 307.113L27.4858 307.106L27.4797 307.1L23.8973 303.477L23.7839 303.362L23.6249 303.335L17.6683 302.331Z"
            stroke="#023DC3"
          />
        </g>
        <mask
          id={`${id}-mask-1`}
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="15"
          width="239"
          height="339"
        >
          <path
            d="M10.3882 60.4194L119.756 15.5966L228.764 59.3797V281.776H239L221.6 303.311L215.97 304.346L198.57 322.98L176.563 326.603L167.351 336.955L140.739 341.095L119.244 353L98.2612 341.095L72.1606 336.955L62.9486 326.603L41.454 322.98L27.1242 307.452L23.5418 303.829L17.4004 302.793L0 281.572L10.3882 281.776V60.4194Z"
            fill={`url(#${id}-paint-5)`}
          />
        </mask>
        <g mask={`url(#${id}-mask-1)`}>
          <path
            d="M10.3882 60.4194L119.756 15.5966L228.764 59.3797V281.776H239L221.6 303.311L215.97 304.346L198.57 322.98L176.563 326.603L167.351 336.955L140.739 341.095L119.244 353L98.2612 341.095L72.1606 336.955L62.9486 326.603L41.454 322.98L27.1242 307.452L23.5418 303.829L17.4004 302.793L0 281.572L10.3882 281.776V60.4194Z"
            fill={`url(#${id}-paint-6)`}
          />
        </g>
        <rect
          x="85.01"
          y="154.335"
          width="68.2409"
          height="45.5847"
          fill={`url(#${id}-pattern-0)`}
        />
        <path
          d="M107.088 177.6L119.534 164.351L132.1 176.87L119.534 190.377L107.088 177.6Z"
          fill="#070412"
        />
        <path
          d="M113.619 173.131C113.439 172.743 113.516 172.285 113.813 171.981L114.747 171.027C115.043 170.724 115.495 170.645 115.872 170.829L116.847 169.836C117.363 169.309 118.196 169.309 118.712 169.836L120.578 171.742C121.094 172.269 121.094 173.12 120.578 173.647L116.38 177.936C115.864 178.463 115.03 178.463 114.514 177.936L112.649 176.03C112.133 175.503 112.133 174.652 112.649 174.124L113.619 173.131ZM118.245 177.936L120.578 175.553L123.844 178.89L121.512 181.273L118.245 177.936ZM121.512 181.273L123.844 178.89L125.01 180.082C125.643 180.751 125.625 181.819 124.969 182.465C124.329 183.095 123.318 183.095 122.678 182.465L121.512 181.273Z"
          fill="#32A9FF"
        />
        <rect
          x="9.82764"
          width="199.165"
          height="70.0332"
          fill={`url(#${id}-paint-7)`}
        />
        <rect
          x="9.82764"
          y="268.776"
          width="199.165"
          height="70.0332"
          fill={`url(#${id}-paint-8)`}
        />
        <defs>
          <pattern
            id={`${id}-pattern-0`}
            patternContentUnits="objectBoundingBox"
            width="1"
            height="1"
          >
            <use
              xlinkHref="#image0_1683_209518"
              transform="matrix(0.00306421 0 0 0.00458716 -0.0117222 0)"
            />
          </pattern>
          <linearGradient
            id={`${id}-paint-0`}
            x1="128.815"
            y1="27.7369"
            x2="128.815"
            y2="342.377"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" />
            <stop offset="0.167702" />
            <stop offset="0.785714" />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id={`${id}-paint-1`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(128.815 171.905) rotate(-90) scale(156.308 109.653)"
          >
            <stop offset="0.484375" stopColor="#0066FF" stopOpacity="0.5" />
            <stop offset="0.994792" stopColor="#0031E0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-2`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(239 261.441) rotate(-147.242) scale(142.099 140.403)"
          >
            <stop stopColor="#023AFF" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-3`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(13.9603 71.746) rotate(46.1256) scale(152.276 153.613)"
          >
            <stop stopColor="#023AFF" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-4`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(119.5 184.551) scale(107.215 97.1237)"
          >
            <stop stopColor="#023AFF" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={`${id}-paint-5`}
            x1="128.815"
            y1="27.737"
            x2="128.815"
            y2="331.248"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" />
            <stop offset="0.167702" />
            <stop offset="0.785714" />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id={`${id}-paint-6`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(125.274 192.645) scale(165.159 266.907)"
          >
            <stop offset="0.557292" stopColor="#0C061E" stopOpacity="0" />
            <stop offset="1" stopColor="#0C061E" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-7`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(109.005 34.7717) rotate(90) scale(32.323 95.3859)"
          >
            <stop stopColor="#023AFF" stopOpacity="0.46" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-8`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(109.005 303.547) rotate(90) scale(32.323 95.3859)"
          >
            <stop stopColor="#023AFF" stopOpacity="0.46" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 2
          }),
          HeroCrafOverlaytIcon
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/icons/craftable-diamond.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        )}
      </div>
    </div>
  )
})

HeroCraftOverlay.displayName = 'HeroCraftOverlay'
