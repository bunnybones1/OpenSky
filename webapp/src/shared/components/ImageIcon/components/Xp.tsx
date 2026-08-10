import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const Xp = memo(({ height }: ImageIconSVGProps) => {
  const id = useMemo(() => {
    return v4()
  }, [])
  return (
    <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
      <g clipPath={`url(#${id}-clip-0)`}>
        <path d="M10 15L24 6L37.5 15V33.5L24 42L10 33.5V15Z" fill="#003C9D" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M24.01 4.80478L38.5 14.4648V34.0521L24.0096 43.1757L9 34.0627V14.454L24.01 4.80478ZM10 33.5V15L24 5.99999L37.5 15V33.5L24 42L10 33.5Z"
          fill="black"
        />
        <g filter={`url(#${id}-filter-1)`}>
          <path
            d="M10.0918 14.9409L23.8899 6.0708C23.9568 6.02779 24.0428 6.02851 24.1089 6.07262L37.4109 14.9406C37.4666 14.9777 37.5 15.0402 37.5 15.107V33.3896C37.5 33.4583 37.4647 33.5222 37.4066 33.5588L24.1047 41.9341C24.0405 41.9745 23.9591 41.9751 23.8943 41.9358L10.0962 33.5584C10.0365 33.5221 10 33.4573 10 33.3874V15.1092C10 15.0411 10.0346 14.9777 10.0918 14.9409Z"
            fill="#012669"
          />
        </g>
        <g filter={`url(#${id}-filter-1)`}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M22.8564 43.6454L22.8563 43.6454L9.05825 35.268L10.0956 33.5594L9.05824 35.268C8.4012 34.869 8 34.1561 8 33.3874V15.1092C8 14.3606 8.38063 13.6634 9.01033 13.2586C9.01034 13.2586 9.01034 13.2586 9.01035 13.2586L22.8083 4.38844L23.8899 6.0708L10.0918 14.9409C10.0346 14.9777 10 15.0411 10 15.1092V33.3874C10 33.4573 10.0365 33.5221 10.0962 33.5584L23.8943 41.9358C23.9591 41.9751 24.0405 41.9745 24.1047 41.9341L25.1703 43.6266C24.4648 44.0707 23.569 44.078 22.8564 43.6454ZM37.4066 33.5588L24.1047 41.9341L25.1703 43.6266L38.4722 35.2513C39.1119 34.8485 39.5 34.1455 39.5 33.3896V15.107C39.5 14.3714 39.1324 13.6845 38.5203 13.2765L37.4275 14.9158L38.5203 13.2765L25.2183 4.40852C24.4905 3.92326 23.5442 3.91538 22.8083 4.38844L23.8899 6.0708C23.9568 6.02779 24.0428 6.02851 24.1089 6.07262L37.4109 14.9406C37.4666 14.9777 37.5 15.0402 37.5 15.107V33.3896C37.5 33.4583 37.4647 33.5222 37.4066 33.5588Z"
            fill="#52FFFF"
          />
        </g>
        <g filter={`url(#${id}-filter-2)`}>
          <path
            d="M10.0918 14.9409L23.8899 6.0708C23.9568 6.02779 24.0428 6.02851 24.1089 6.07262L37.4109 14.9406C37.4666 14.9777 37.5 15.0402 37.5 15.107V33.3896C37.5 33.4583 37.4647 33.5222 37.4066 33.5588L24.1047 41.9341C24.0405 41.9745 23.9591 41.9751 23.8943 41.9358L10.0962 33.5584C10.0365 33.5221 10 33.4573 10 33.3874V15.1092C10 15.0411 10.0346 14.9777 10.0918 14.9409Z"
            fill="#012669"
          />
        </g>
        <g filter={`url(#${id}-filter-3)`}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.0918 14.9409C10.0346 14.9777 10 15.0411 10 15.1092V33.3874C10 33.4573 10.0365 33.5221 10.0962 33.5584L23.8943 41.9358C23.9591 41.9751 24.0405 41.9745 24.1047 41.9341L37.4066 33.5588C37.4647 33.5222 37.5 33.4583 37.5 33.3896V15.107C37.5 15.0402 37.4666 14.9777 37.4109 14.9406L24.1089 6.07262C24.0428 6.02851 23.9568 6.02779 23.8899 6.0708L10.0918 14.9409ZM11 15.5459V32.9373L23.9904 40.8243L36.5 32.9479V15.5352L23.99 7.1952L11 15.5459Z"
            fill="#00161F"
          />
        </g>
        <path
          d="M17.4592 32.2048L24 28L30.5408 32.2048C30.827 32.3888 31 32.7057 31 33.046V33.954C31 34.2943 30.827 34.6112 30.5408 34.7952L24 39L17.4592 34.7952C17.173 34.6112 17 34.2943 17 33.954V33.046C17 32.7057 17.173 32.3888 17.4592 32.2048Z"
          fill="#0234B3"
        />
        <path
          d="M12.4453 25.7031L23.4333 18.3778C23.7752 18.1499 24.2218 18.1543 24.5591 18.3889L35.0711 25.7016C35.3398 25.8885 35.5 26.1952 35.5 26.5225V28.8358C35.5 29.101 35.3946 29.3554 35.2071 29.5429L34.1066 30.6434C33.7723 30.9777 33.2494 31.0322 32.8533 30.7739L24.5348 25.3488C24.2087 25.1361 23.7887 25.132 23.4586 25.3384L14.6746 30.8284C14.2797 31.0752 13.7668 31.0168 13.4375 30.6875L12.2929 29.5429C12.1054 29.3554 12 29.101 12 28.8358V26.5352C12 26.2008 12.1671 25.8886 12.4453 25.7031Z"
          fill="#0234B3"
        />
        <path
          d="M24 9L35.0711 16.7016C35.3398 16.8885 35.5 17.1952 35.5 17.5225V19.8358C35.5 20.101 35.3946 20.3554 35.2071 20.5429L34.1066 21.6434C33.7723 21.9777 33.2494 22.0322 32.8533 21.7739L24 16L14.6746 21.8284C14.2797 22.0752 13.7668 22.0168 13.4375 21.6875L12.2929 20.5429C12.1054 20.3554 12 20.101 12 19.8358V17.5352C12 17.2008 12.1671 16.8886 12.4453 16.7031L24 9Z"
          fill="#0234B3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M51.5241 7.85166L38.5241 15.8517L37.4759 14.1483L50.4759 6.14835L51.5241 7.85166Z"
          fill={`url(#${id}-paint-0)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M50.4759 42.8517L37.4759 34.8517L38.5241 33.1483L51.5241 41.1483L50.4759 42.8517Z"
          fill={`url(#${id}-paint-1)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M-2.47591 6.14835L10.5241 14.1483L9.47589 15.8517L-3.52411 7.85166L-2.47591 6.14835Z"
          fill={`url(#${id}-paint-2)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M-3.52411 41.1483L9.47589 33.1483L10.5241 34.8517L-2.47591 42.8517L-3.52411 41.1483Z"
          fill={`url(#${id}-paint-3)`}
        />
        <g filter={`url(#${id}-filter-4)`}>
          <path
            d="M13.7786 29.8462C13.6996 29.8462 13.6319 29.8292 13.5755 29.7954C13.5304 29.7503 13.5078 29.6995 13.5078 29.6431C13.5078 29.5979 13.5247 29.5415 13.5586 29.4738L16.6724 24.0077C16.7063 23.9513 16.7063 23.8949 16.6724 23.8385L13.5586 18.3723C13.5247 18.3046 13.5078 18.2482 13.5078 18.2031C13.5078 18.1467 13.5304 18.1015 13.5755 18.0677C13.6319 18.0226 13.6996 18 13.7786 18H16.1817C16.3283 18 16.4468 18.0733 16.537 18.22L18.3817 21.6385C18.4042 21.6836 18.4324 21.7062 18.4663 21.7062C18.5001 21.7062 18.5283 21.6836 18.5509 21.6385L20.4124 18.22C20.5027 18.0733 20.6211 18 20.7678 18H23.154C23.2329 18 23.295 18.0226 23.3401 18.0677C23.3965 18.1015 23.4247 18.1467 23.4247 18.2031C23.4247 18.2482 23.4078 18.3046 23.374 18.3723L20.277 23.8385C20.2545 23.8949 20.2545 23.9513 20.277 24.0077L23.374 29.4738C23.4078 29.5415 23.4247 29.5979 23.4247 29.6431C23.4247 29.6995 23.3965 29.7503 23.3401 29.7954C23.295 29.8292 23.2329 29.8462 23.154 29.8462H20.7847C20.6381 29.8462 20.5196 29.7728 20.4294 29.6262L18.5509 26.2246C18.5283 26.1795 18.5001 26.1569 18.4663 26.1569C18.4324 26.1569 18.4042 26.1795 18.3817 26.2246L16.5201 29.6262C16.4299 29.7728 16.3114 29.8462 16.1647 29.8462H13.7786Z"
            fill="white"
          />
          <path
            d="M30.7529 18C31.5201 18 32.197 18.1579 32.7837 18.4738C33.3816 18.7897 33.8386 19.2354 34.1545 19.8108C34.4816 20.3749 34.6452 21.0292 34.6452 21.7738C34.6452 22.5072 34.476 23.1559 34.1375 23.72C33.8104 24.2841 33.3422 24.7185 32.7329 25.0231C32.1237 25.3277 31.4186 25.48 30.6175 25.48H28.5868C28.5078 25.48 28.4683 25.5195 28.4683 25.5985V29.5415C28.4683 29.6318 28.4401 29.7051 28.3837 29.7615C28.3273 29.8179 28.254 29.8462 28.1637 29.8462H25.9637C25.8734 29.8462 25.8001 29.8179 25.7437 29.7615C25.6873 29.7051 25.6591 29.6318 25.6591 29.5415V18.3046C25.6591 18.2144 25.6873 18.141 25.7437 18.0846C25.8001 18.0282 25.8734 18 25.9637 18H30.7529ZM30.296 23.2462C30.7586 23.2462 31.1309 23.1164 31.4129 22.8569C31.7063 22.5974 31.8529 22.259 31.8529 21.8415C31.8529 21.4128 31.7063 21.0687 31.4129 20.8092C31.1309 20.5385 30.7586 20.4031 30.296 20.4031H28.5868C28.5078 20.4031 28.4683 20.4426 28.4683 20.5215V23.1277C28.4683 23.2067 28.5078 23.2462 28.5868 23.2462H30.296Z"
            fill="white"
          />
        </g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M23 45.5V43H25V45.5H23Z"
          fill={`url(#${id}-paint-4)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M25 2L25 4.5H23L23 2H25Z"
          fill={`url(#${id}-paint-5)`}
        />
      </g>
      <defs>
        <filter
          id={`${id}-filter-0`}
          x="4"
          y="0.039032"
          width="39.5"
          height="47.9258"
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
          <feGaussianBlur stdDeviation="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.144667 0 0 0 0 0.904167 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_9570_132063"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_9570_132063"
            result="shape"
          />
        </filter>
        <filter
          id={`${id}-filter-1`}
          x="2"
          y="-1.96097"
          width="43.5"
          height="51.9258"
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
          <feGaussianBlur stdDeviation="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.144667 0 0 0 0 0.904167 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_9570_132063"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_9570_132063"
            result="shape"
          />
        </filter>
        <filter
          id={`${id}-filter-2`}
          x="10"
          y="6.03903"
          width="27.5"
          height="35.9258"
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
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="9" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.0866738 0 0 0 0 0.120199 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_9570_132063"
          />
        </filter>
        <filter
          id={`${id}-filter-3`}
          x="10"
          y="6.03903"
          width="27.5"
          height="35.9258"
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
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="9" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.0866738 0 0 0 0 0.120199 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_9570_132063"
          />
        </filter>
        <filter
          id={`${id}-filter-4`}
          x="9.50781"
          y="14"
          width="29.1374"
          height="19.8462"
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
          <feGaussianBlur stdDeviation="2" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.76 0 0 0 0 1 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_9570_132063"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_9570_132063"
            result="shape"
          />
        </filter>
        <linearGradient
          id={`${id}-paint-0`}
          x1="38.5"
          y1="14.5"
          x2="41.5"
          y2="12.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52FFFF" />
          <stop offset="1" stopColor="#52FFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint-1`}
          x1="38.5"
          y1="34.5"
          x2="41.5"
          y2="36.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52FFFF" />
          <stop offset="1" stopColor="#52FFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint-2`}
          x1="9.49999"
          y1="14.5"
          x2="6.49999"
          y2="12.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52FFFF" />
          <stop offset="1" stopColor="#52FFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint-3`}
          x1="9.49999"
          y1="34.5"
          x2="6.49999"
          y2="36.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52FFFF" />
          <stop offset="1" stopColor="#52FFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint-4`}
          x1="24"
          y1="43"
          x2="24"
          y2="45.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52FFFF" />
          <stop offset="1" stopColor="#52FFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint-5`}
          x1="24"
          y1="4.5"
          x2="24"
          y2="2"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52FFFF" />
          <stop offset="1" stopColor="#52FFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip-0`}>
          <rect width="48" height="48" fill="white" />
        </clipPath>
      </defs>
    </ImageIconSVG>
  )
})

Xp.displayName = 'Xp'
