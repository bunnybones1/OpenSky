import clsx from 'clsx'
import { memo } from 'react'

import { SoundClient } from '~/shared/clients'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  ArrowPath,
  BodyPath,
  MainPath,
  QuestRerollButtonStyle,
  RectOne,
  RectTwo
} from './QuestRerollButton.css'

interface QuestRerollButtonProps {
  onReroll: () => void
  isRerolling: boolean
}

export const QuestRerollButton = memo(
  ({ onReroll, isRerolling }: QuestRerollButtonProps) => {
    return (
      <svg
        viewBox="0 0 56 56"
        fill="none"
        data-id="reroll-quest"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 4
          }),
          { isRerolling },
          QuestRerollButtonStyle
        )}
        onClick={isRerolling ? undefined : onReroll}
        onMouseEnter={() => {
          if (!isRerolling) SoundClient.playSound('CursorMainHover')
        }}
        onMouseDown={() => {
          if (!isRerolling) SoundClient.playSound('JuicySwipeStandalone')
        }}
      >
        <g clipPath="url(#clip-0)">
          <rect
            width="56"
            height="56"
            transform="matrix(-1 0 0 1 56 0)"
            fill="url(#paint-0)"
            className={RectOne}
          />
          <rect
            width="56"
            height="56"
            transform="matrix(-1 0 0 1 56 0)"
            fill="url(#paint-1)"
            className={RectTwo}
          />
          <path
            d="M48.1305 1.2946L47.8373 1H47.4217H12H11V2V12.678V13.0908L11.2912 13.3834L30.5201 32.7054L30.8133 33H31.2289H54H55V32V8.61017V8.19737L54.7088 7.90477L48.1305 1.2946Z"
            stroke="black"
            strokeWidth="2"
          />
          <path
            d="M12.5 12.4716V2.5H47.2139L53.5 8.81657V31.5H31.4367L12.5 12.4716Z"
            fill="#AC1E69"
            stroke="#FF429D"
            className={MainPath}
          />
          <path
            d="M17.5 13.5V3H47L53 9V29.5H33.5L17.5 13.5Z"
            fill="#4E0405"
            className={BodyPath}
          />
          <g className={clsx(ArrowPath, { isRerolling })} filter="url(#filter-0)">
            <path
              d="M37.9189 20.3163C36.772 20.3163 35.6721 19.8607 34.8611 19.0498C34.0501 18.2387 33.5945 17.1388 33.5945 15.992C33.5945 14.8451 34.0501 13.7452 34.8611 12.9342C35.6721 12.1232 36.772 11.6676 37.9189 11.6676C39.0657 11.6676 40.1656 12.1232 40.9767 12.9342C41.7876 13.7452 42.2432 14.8451 42.2432 15.992L40.0811 15.992L43.5405 21.1812L47 15.992L44.8378 15.992C44.8378 14.1569 44.1088 12.3972 42.8113 11.0996C41.5138 9.80199 39.754 9.07306 37.9189 9.07306C36.0838 9.07306 34.3242 9.80208 33.0265 11.0996C31.7289 12.3971 31 14.1569 31 15.992C31 17.827 31.729 19.5867 33.0265 20.8843C34.3241 22.182 36.0838 22.9109 37.9189 22.9109L37.9189 20.3163Z"
              fill="white"
            />
          </g>
        </g>
        <defs>
          <filter
            id="filter-0"
            x="15.8649"
            y="-6.06208"
            width="46.2703"
            height="44.1081"
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
            <feGaussianBlur stdDeviation="7.56757" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.0470588 0 0 0 0 0.0235294 0 0 0 0 0.117647 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_878_60456"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="7.56757" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.0470588 0 0 0 0 0.0235294 0 0 0 0 0.117647 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="effect1_dropShadow_878_60456"
              result="effect2_dropShadow_878_60456"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="3.78378" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1 0 0 0 0 0.258824 0 0 0 0 0.615686 0 0 0 1 0"
            />
            <feBlend
              mode="normal"
              in2="effect2_dropShadow_878_60456"
              result="effect3_dropShadow_878_60456"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect3_dropShadow_878_60456"
              result="shape"
            />
          </filter>
          <radialGradient
            id="paint-0"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(34.5 21.5) rotate(-62.0205) scale(18.1177 9.1982)"
          >
            <stop offset="0.138845" stopColor="#0C061E" />
            <stop offset="1" stopColor="#0C061E" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="hover-paint-0"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(34.5 21.5) rotate(-62.0205) scale(18.1177 9.1982)"
          >
            <stop offset="0.138845" stopColor="#AC1E69" />
            <stop offset="1" stopColor="#AC1E69" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="paint-1"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(4.16216 26.8649) rotate(-2.29061) scale(37.8681 19.2253)"
          >
            <stop offset="0.138845" stopColor="#0C061E" />
            <stop offset="1" stopColor="#0C061E" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="hover-paint-1"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(4.16216 26.8649) rotate(-2.29061) scale(37.8681 19.2253)"
          >
            <stop offset="0.138845" stopColor="#AC1E69" />
            <stop offset="1" stopColor="#AC1E69" stopOpacity="0" />
          </radialGradient>
          <clipPath id="clip-0">
            <rect width="56" height="56" fill="white" />
          </clipPath>
        </defs>
      </svg>
    )
  }
)

QuestRerollButton.displayName = 'QuestRerollButton'
