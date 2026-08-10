import { memo } from 'react'

export const FancyCloseButtonSVG = memo(() => {
  return (
    <svg
      height="100%"
      viewBox="0 0 74 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7817_88432)">
        <rect
          width="74"
          height="74"
          transform="matrix(-1 0 0 1 74 0)"
          fill="url(#paint0_radial_7817_88432)"
        />
        <rect
          width="74"
          height="74"
          transform="matrix(-1 0 0 1 74 0)"
          fill="url(#paint1_radial_7817_88432)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M74 46V0H10V23.1624L33.0858 46H74ZM11 22.7527L33.5 45.0108H73V0.989247H11V22.7527Z"
          fill="#0C061E"
        />
        <path d="M33.5 45.0108H73V0.989258H11V22.7527L33.5 45.0108Z" fill="#FF429D" />
        <path
          d="M34.5 43.5376H73V41.5591V1H13V22.2688L34.5 43.5376Z"
          fill="#AC1E69"
        />
        <path d="M21 0.989258H73V41.5484H40.5L21 22.2581V0.989258Z" fill="#4E0405" />
        <rect
          width="17"
          height="42.5"
          transform="matrix(-1 0 0 1 73 1)"
          fill="url(#paint2_linear_7817_88432)"
        />
        <g filter="url(#filter0_ddd_7817_88432)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M44.7145 18.2499L37.7322 11.2677L41.2678 7.73218L48.25 14.7144L55.2322 7.73218L58.7678 11.2677L51.7855 18.2499L58.7678 25.2322L55.2322 28.7677L48.25 21.7855L41.2678 28.7677L37.7322 25.2322L44.7145 18.2499Z"
            fill="white"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_ddd_7817_88432"
          x="17.7322"
          y="-12.2678"
          width="61.0355"
          height="61.0355"
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
            result="effect1_dropShadow_7817_88432"
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
            in2="effect1_dropShadow_7817_88432"
            result="effect2_dropShadow_7817_88432"
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
            values="0 0 0 0 1 0 0 0 0 0.258824 0 0 0 0 0.615686 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="effect2_dropShadow_7817_88432"
            result="effect3_dropShadow_7817_88432"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect3_dropShadow_7817_88432"
            result="shape"
          />
        </filter>
        <radialGradient
          id="paint0_radial_7817_88432"
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
          id="paint1_radial_7817_88432"
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
          id="paint2_linear_7817_88432"
          x1="3.05659e-07"
          y1="19.3182"
          x2="16.5"
          y2="19.3182"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0C061E" />
          <stop offset="1" stopColor="#0C061E" stopOpacity="0" />
        </linearGradient>
        <clipPath id="clip0_7817_88432">
          <rect width="74" height="74" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
})

FancyCloseButtonSVG.displayName = 'FancyCloseButtonSVG'
