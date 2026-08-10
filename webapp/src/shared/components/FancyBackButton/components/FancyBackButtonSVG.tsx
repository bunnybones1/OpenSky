import { memo } from 'react'

export const FancyBackButtonSVG = memo(() => {
  return (
    <svg
      height="100%"
      viewBox="0 0 74 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7351_78523)">
        <rect width="74" height="74" fill="url(#paint0_radial_7351_78523)" />
        <rect width="74" height="74" fill="url(#paint1_radial_7351_78523)" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 46V0H64V23.1624L40.9142 46H0ZM63 22.7527L40.5 45.0108H1V0.989247H63V22.7527Z"
          fill="#0C061E"
        />
        <path d="M40.5 45.0108H1V0.989258H63V22.7527L40.5 45.0108Z" fill="#0BB5FF" />
        <path
          d="M39.5 43.5269H1V41.5484V0.989258H61V22.2581L39.5 43.5269Z"
          fill="#026A92"
        />
        <path d="M53 0.989258H1V41.5484H33.5L53 22.2581V0.989258Z" fill="#021821" />
        <rect
          x="1"
          y="1"
          width="17"
          height="42.5"
          fill="url(#paint2_linear_7351_78523)"
        />
        <g filter="url(#filter0_ddd_7351_78523)">
          <path
            d="M14 18.5L22.5 10H29.5L21.5 18.5L29.5 27H22.5L14 18.5Z"
            fill="#52FFFF"
          />
          <path
            d="M27 18.5L31 14.5H36.5L33 18.5L36.5 22.5H31L27 18.5Z"
            fill="#52FFFF"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_ddd_7351_78523"
          x="-6"
          y="-10"
          width="62.5"
          height="57"
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
          <feGaussianBlur stdDeviation="10" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0470588 0 0 0 0 0.0235294 0 0 0 0 0.117647 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_7351_78523"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="10" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0470588 0 0 0 0 0.0235294 0 0 0 0 0.117647 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="effect1_dropShadow_7351_78523"
            result="effect2_dropShadow_7351_78523"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0392157 0 0 0 0 0.709804 0 0 0 0 1 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="effect2_dropShadow_7351_78523"
            result="effect3_dropShadow_7351_78523"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect3_dropShadow_7351_78523"
            result="shape"
          />
        </filter>
        <radialGradient
          id="paint0_radial_7351_78523"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(52 21.5) rotate(-63.8532) scale(30.6349 15.5531)"
        >
          <stop offset="0.138845" stopColor="#0C061E" />
          <stop offset="1" stopColor="#0C061E" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="paint1_radial_7351_78523"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(5.5 35.5) rotate(-2.29061) scale(50.04 25.4049)"
        >
          <stop offset="0.138845" stopColor="#0C061E" />
          <stop offset="1" stopColor="#0C061E" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="paint2_linear_7351_78523"
          x1="1"
          y1="20.3182"
          x2="17.5"
          y2="20.3182"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0C061E" />
          <stop offset="1" stopColor="#0C061E" stopOpacity="0" />
        </linearGradient>
        <clipPath id="clip0_7351_78523">
          <rect width="74" height="74" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
})

FancyBackButtonSVG.displayName = 'FancyBackButtonSVG'
