import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  HoverBorderPath,
  HoverFilterGroup,
  HoverGlow,
  HoverPaintZero
} from './PlusButton.css'

export const PlusButton = memo(() => {
  return (
    <div className={clsx(Sprinkles({ height: 'full', position: 'relative' }))}>
      <svg
        className={Sprinkles({ height: 'full' })}
        viewBox="0 0 82 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 64H82V46.1716L36.9277 0H0V2H36.119L80.0476 47V62H0V64Z"
          fill="black"
        />
        <path d="M0 62V2H36.0116L80.0476 47V62H0Z" fill="#1C1038" />
        <path
          d="M0 2V6H34.1666L75.1666 48V62H80.0476V47L36.0116 2H0Z"
          className={HoverBorderPath}
          fill="#705BAB"
        />
        <path
          d="M31.2381 10H5.85718L15.6191 21V57H69.3096V49L31.2381 10Z"
          fill="url(#plus-button-paint-0)"
          className={HoverPaintZero}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.65039 9H31.6424L70.2857 48.5858V58H14.6428V21.3866L3.65039 9ZM8.06385 11L16.5952 20.6134V56H68.3333V49.4142L30.8337 11H8.06385Z"
          fill="url(#plus-button-paint-1)"
        />
        <g className={HoverFilterGroup} filter="none">
          <path
            d="M42.2278 33.6953C42.3193 33.7891 42.3651 33.8945 42.3651 34.0117C42.3651 34.7852 42.3651 35.9453 42.3651 37.4922C42.3651 37.6094 42.3193 37.7148 42.2278 37.8086C42.1591 37.8789 42.0676 37.9141 41.9532 37.9141C40.8779 37.9141 39.2649 37.9141 37.1142 37.9141C36.9998 37.9141 36.9426 37.9727 36.9426 38.0898C36.9426 39.168 36.9426 40.7969 36.9426 42.9766C36.9426 43.0938 36.9083 43.1875 36.8397 43.2578C36.7482 43.3516 36.6452 43.3984 36.5308 43.3984C35.7758 43.3984 34.6547 43.3984 33.1675 43.3984C33.0531 43.3984 32.9502 43.3516 32.8586 43.2578C32.7671 43.1875 32.7214 43.0938 32.7214 42.9766C32.7214 41.8984 32.7214 40.2695 32.7214 38.0898C32.7214 37.9727 32.6642 37.9141 32.5498 37.9141C31.4973 37.9141 29.8958 37.9141 27.7451 37.9141C27.6307 37.9141 27.5277 37.8789 27.4362 37.8086C27.3676 37.7148 27.3333 37.6094 27.3333 37.4922C27.3333 36.7188 27.3333 35.5586 27.3333 34.0117C27.3333 33.8945 27.3676 33.7891 27.4362 33.6953C27.5277 33.6016 27.6307 33.5547 27.7451 33.5547C28.8204 33.5547 30.422 33.5547 32.5498 33.5547C32.6642 33.5547 32.7214 33.4961 32.7214 33.3789C32.7214 32.2773 32.7214 30.625 32.7214 28.4219C32.7214 28.3047 32.7671 28.1992 32.8586 28.1055C32.9502 28.0352 33.0531 28 33.1675 28C33.8997 28 35.0208 28 36.5308 28C36.6452 28 36.7482 28.0352 36.8397 28.1055C36.9083 28.1992 36.9426 28.3047 36.9426 28.4219C36.9426 29.5234 36.9426 31.1758 36.9426 33.3789C36.9426 33.4961 36.9998 33.5547 37.1142 33.5547C38.1896 33.5547 39.8026 33.5547 41.9532 33.5547C42.0676 33.5547 42.1591 33.6016 42.2278 33.6953Z"
            fill="white"
          />
        </g>
        <path
          d="M13.6667 32H54.6667L70.2858 49V58H13.6667V32Z"
          fill="transparent"
          className={HoverGlow}
        />
        <defs>
          <linearGradient
            id="plus-button-paint-0"
            x1="37.3664"
            y1="31.6617"
            x2="37.3664"
            y2="31.983"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3E3068" />
            <stop offset="1" stopColor="#33255B" />
          </linearGradient>
          <linearGradient
            id="plus-button-paint-1"
            x1="36.7402"
            y1="31.5834"
            x2="36.7402"
            y2="31.9185"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3E3068" />
            <stop offset="1" stopColor="#33255B" />
          </linearGradient>
          {/* HOVER DEFS */}
          <filter
            id="plus-button-filter"
            x="20.3767"
            y="21.0435"
            width="28.9448"
            height="29.3115"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="3.47826" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.368333 0 0 0 0 0.241931 0 0 0 0 0.725234 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_340_25695"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="3.47826" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.368627 0 0 0 0 0.243137 0 0 0 0 0.72549 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="effect1_dropShadow_340_25695"
              result="effect2_dropShadow_340_25695"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="3.47826" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.368627 0 0 0 0 0.243137 0 0 0 0 0.72549 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="effect2_dropShadow_340_25695"
              result="effect3_dropShadow_340_25695"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="3.47826" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.368627 0 0 0 0 0.243137 0 0 0 0 0.72549 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="effect3_dropShadow_340_25695"
              result="effect4_dropShadow_340_25695"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect4_dropShadow_340_25695"
              result="shape"
            />
          </filter>
          <linearGradient
            id="paint0_linear_340_25695"
            x1="34.0545"
            y1="5.99999"
            x2="-0.195726"
            y2="5.99999"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#936FFC" />
            <stop offset="1" stopColor="#705BAB" />
          </linearGradient>
          <linearGradient
            id="plus-button-hover-paint-1"
            x1="37.3664"
            y1="31.6617"
            x2="37.3664"
            y2="31.983"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#705BAB" />
            <stop offset="1" stopColor="#4D3C7B" />
          </linearGradient>
          <radialGradient
            id="plus-button-glow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(67.3572 58) rotate(-180) scale(45.881 28.3958)"
          >
            <stop stopColor="#D9D9D9" />
            <stop offset="0.0001" stopColor="#5E3EB9" />
            <stop offset="1" stopColor="#5E3EB9" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
})

PlusButton.displayName = 'PlusButton'
