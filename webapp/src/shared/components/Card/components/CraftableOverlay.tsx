import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CraftableIcon, CraftableOverlayStyle } from './CraftableOverlay.css'

interface CraftableOverlayProps {
  isCraftable: boolean
}

export const CraftableOverlay = memo(({ isCraftable }: CraftableOverlayProps) => {
  const id = useMemo(() => v4(), [])

  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'full',
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: isCraftable ? 1 : 0,
          pointerEvents: 'none'
        }),
        CraftableOverlayStyle
      )}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 225 358"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask
          id={`${id}-mask-1`}
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="17"
          width="225"
          height="334"
        >
          <path
            d="M11 77.7045L0.5 71.5V46L22.5 33L44.5 45.5V45.8505L118 17L225 59V307L118 350.5L11 307V77.7045Z"
            fill={`url(#${id}-paint-1)`}
          />
        </mask>
        <g mask={`url(#${id}-mask-1)`}>
          <path
            d="M11.5 77.7045V77.4192L11.2544 77.2741L1 71.2147V46.2853L22.5049 33.5779L44 45.791V45.8505V46.5839L44.6827 46.3159L118 17.5371L224.5 59.3409V306.664L118 349.96L11.5 306.664V77.7045Z"
            fill={`url(#${id}-paint-2)`}
            fillOpacity="0.5"
          />
          <path
            d="M11.5 77.7045V77.4192L11.2544 77.2741L1 71.2147V46.2853L22.5049 33.5779L44 45.791V45.8505V46.5839L44.6827 46.3159L118 17.5371L224.5 59.3409V306.664L118 349.96L11.5 306.664V77.7045Z"
            fill={`url(#${id}-paint-3)`}
            fillOpacity="0.6"
          />
          <path
            d="M11.5 77.7045V77.4192L11.2544 77.2741L1 71.2147V46.2853L22.5049 33.5779L44 45.791V45.8505V46.5839L44.6827 46.3159L118 17.5371L224.5 59.3409V306.664L118 349.96L11.5 306.664V77.7045Z"
            fill={`url(#${id}-paint-4)`}
            fillOpacity="0.6"
          />
          <path
            d="M11.5 77.7045V77.4192L11.2544 77.2741L1 71.2147V46.2853L22.5049 33.5779L44 45.791V45.8505V46.5839L44.6827 46.3159L118 17.5371L224.5 59.3409V306.664L118 349.96L11.5 306.664V77.7045Z"
            fill={`url(#${id}-paint-5)`}
            fillOpacity="0.6"
          />
          <path
            d="M11.5 77.7045V77.4192L11.2544 77.2741L1 71.2147V46.2853L22.5049 33.5779L44 45.791V45.8505V46.5839L44.6827 46.3159L118 17.5371L224.5 59.3409V306.664L118 349.96L11.5 306.664V77.7045Z"
            stroke="#023DC3"
          />
        </g>
        <mask
          id={`${id}-mask-2`}
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="17"
          width="225"
          height="334"
        >
          <path
            d="M11 77.7045L0.5 71.5V46L22.5 33L44.5 45.5V45.8505L118 17L225 59V307L118 350.5L11 307V77.7045Z"
            fill={`url(#${id}-paint-6)`}
          />
        </mask>
        <g mask={`url(#${id}-mask-2)`}>
          <path
            d="M11 77.7045L0.5 71.5V46L22.5 33L44.5 45.5V45.8505L118 17L225 59V307L118 350.5L11 307V77.7045Z"
            fill={`url(#${id}-paint-7)`}
          />
          <g filter={`url(#${id}-filter-1)`}>
            <circle
              cx="10"
              cy="128"
              r="47"
              fill="url(#${id}-paint-8)"
              fillOpacity="0.35"
            />
          </g>
          <g filter={`url(#${id}-filter-2)`}>
            <circle
              cx="195"
              cy="250"
              r="47"
              fill={`url(#${id}-paint-9)`}
              fillOpacity="0.35"
            />
          </g>
          <g filter={`url(#${id}-filter-3)`}>
            <circle
              cx="31.5"
              cy="264.5"
              r="61.5"
              fill={`url(#${id}-paint-10)`}
              fillOpacity="0.35"
            />
          </g>
          <g filter={`url(#${id}-filter-4)`}>
            <circle
              cx="169.5"
              cy="152.5"
              r="50.5"
              fill={`url(#${id}-paint-11)`}
              fillOpacity="0.35"
            />
          </g>
          <g filter={`url(#${id}-filter-5)`}>
            <circle
              cx="156.5"
              cy="67.5"
              r="50.5"
              fill={`url(#${id}-paint-12)`}
              fillOpacity="0.35"
            />
          </g>
        </g>
        <rect x="10" width="215" height="74" fill={`url(#${id}-paint-13)`} />
        <rect x="10" y="284" width="215" height="74" fill={`url(#${id}-paint-14)`} />
        <defs>
          <filter
            id={`${id}-filter-1`}
            x="-97"
            y="21"
            width="214"
            height="214"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="30"
              result="effect1_foregroundBlur_1498_156067"
            />
          </filter>
          <filter
            id={`${id}-filter-2`}
            x="88"
            y="143"
            width="214"
            height="214"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="30"
              result="effect1_foregroundBlur_1498_156067"
            />
          </filter>
          <filter
            id={`${id}-filter-3`}
            x="-90"
            y="143"
            width="243"
            height="243"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="30"
              result="effect1_foregroundBlur_1498_156067"
            />
          </filter>
          <filter
            id={`${id}-filter-4`}
            x="59"
            y="42"
            width="221"
            height="221"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="30"
              result="effect1_foregroundBlur_1498_156067"
            />
          </filter>
          <filter
            id={`${id}-filter-5`}
            x="46"
            y="-43"
            width="221"
            height="221"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="30"
              result="effect1_foregroundBlur_1498_156067"
            />
          </filter>
          <pattern
            id={`${id}-pattern-1`}
            patternContentUnits="objectBoundingBox"
            width="1"
            height="1"
          >
            <use
              xlinkHref="#image0_1498_156067"
              transform="matrix(0.00299929 0 0 0.00458716 -0.000882136 0)"
            />
          </pattern>
          <linearGradient
            id={`${id}-paint-1`}
            x1="121.5"
            y1="29"
            x2="121.5"
            y2="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" />
            <stop offset="0.167702" />
            <stop offset="0.785714" />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id={`${id}-paint-2`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(121.5 171.5) rotate(-90) scale(154.5 103)"
          >
            <stop offset="0.484375" stopColor="#0066FF" stopOpacity="0.5" />
            <stop offset="0.994792" stopColor="#0031E0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-3`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(225 260) rotate(-145.9) scale(135.558 136.649)"
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
            gradientTransform="translate(13.6133 72.5) rotate(47.582) scale(146.971 147.773)"
          >
            <stop stopColor="#023AFF" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-5`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(112.75 184) scale(100.71 96)"
          >
            <stop stopColor="#023AFF" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={`${id}-paint-6`}
            x1="121.5"
            y1="29"
            x2="121.5"
            y2="329"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" />
            <stop offset="0.167702" />
            <stop offset="0.785714" />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id={`${id}-paint-7`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(118.5 192) scale(157.5 263.819)"
          >
            <stop offset="0.557292" stopColor="#0C061E" stopOpacity="0" />
            <stop offset="1" stopColor="#0C061E" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-8`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(10 128) rotate(90) scale(82.5)"
          >
            <stop offset="1" stopColor="#AD00FF" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-9`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(195 250) rotate(90) scale(82.5)"
          >
            <stop offset="1" stopColor="#AD00FF" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-10`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(31.5 264.5) rotate(90) scale(107.952)"
          >
            <stop offset="1" stopColor="#AD00FF" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-11`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(169.5 152.5) rotate(90) scale(88.6436)"
          >
            <stop offset="1" stopColor="#AD00FF" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-12`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(156.5 67.5) rotate(90) scale(88.6436)"
          >
            <stop offset="1" stopColor="#AD00FF" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-13`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(117.063 36.7413) rotate(90) scale(34.1539 102.97)"
          >
            <stop stopColor="#023AFF" stopOpacity="0.46" />
            <stop offset="1" stopColor="#023AFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id={`${id}-paint-14`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(117.063 320.741) rotate(90) scale(34.1539 102.97)"
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
          CraftableIcon
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

CraftableOverlay.displayName = 'CraftableOverlay'
