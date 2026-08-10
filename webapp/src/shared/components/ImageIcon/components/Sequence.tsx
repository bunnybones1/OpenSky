import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const Sequence = memo(({ height }: ImageIconSVGProps) => {
  const uniqueId = useMemo(() => {
    return v4()
  }, [])
  return (
    <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
      <g clipPath={`url(#clip-1-${uniqueId})`}>
        <g clipPath={`url(#clip-2-${uniqueId})`}>
          <path
            d="M0 13.1823L0 35.323C0 39.842 3.65336 43.5054 8.16 43.5054H39.84C44.3466 43.5054 48 39.842 48 35.323V13.1823C48 8.66327 44.3466 4.99988 39.84 4.99988H8.16C3.65336 4.99988 0 8.66327 0 13.1823Z"
            fill="#111111"
          />
          <path
            d="M0 13.1823L0 35.323C0 39.842 3.65336 43.5054 8.16 43.5054H39.84C44.3466 43.5054 48 39.842 48 35.323V13.1823C48 8.66327 44.3466 4.99988 39.84 4.99988H8.16C3.65336 4.99988 0 8.66327 0 13.1823Z"
            fill={`url(#paint-0-${uniqueId})`}
          />
          <path
            d="M12 14.6263C12 13.2972 10.9255 12.2197 9.59998 12.2197C8.2745 12.2197 7.19998 13.2972 7.19998 14.6263C7.19998 15.9554 8.2745 17.0329 9.59998 17.0329C10.9255 17.0329 12 15.9554 12 14.6263Z"
            fill={`url(#paint-1-${uniqueId})`}
          />
          <path
            d="M12 14.6263C12 13.2972 10.9255 12.2197 9.59998 12.2197C8.2745 12.2197 7.19998 13.2972 7.19998 14.6263C7.19998 15.9554 8.2745 17.0329 9.59998 17.0329C10.9255 17.0329 12 15.9554 12 14.6263Z"
            fill={`url(#paint-2-${uniqueId})`}
          />
          <path
            d="M12 14.6263C12 13.2972 10.9255 12.2197 9.59998 12.2197C8.2745 12.2197 7.19998 13.2972 7.19998 14.6263C7.19998 15.9554 8.2745 17.0329 9.59998 17.0329C10.9255 17.0329 12 15.9554 12 14.6263Z"
            fill={`url(#paint-3-${uniqueId})`}
          />
          <path
            d="M12 33.8636C12 32.5345 10.9255 31.457 9.59998 31.457C8.2745 31.457 7.19998 32.5345 7.19998 33.8636C7.19998 35.1928 8.2745 36.2702 9.59998 36.2702C10.9255 36.2702 12 35.1928 12 33.8636Z"
            fill={`url(#paint-4-${uniqueId})`}
          />
          <path
            d="M40.8 24.2528C40.8 22.9237 39.7255 21.8462 38.4 21.8462C37.0745 21.8462 36 22.9237 36 24.2528C36 25.5819 37.0745 26.6594 38.4 26.6594C39.7255 26.6594 40.8 25.5819 40.8 24.2528Z"
            fill={`url(#paint-5-${uniqueId})`}
          />
          <path
            d="M40.8 24.2528C40.8 22.9237 39.7255 21.8462 38.4 21.8462C37.0745 21.8462 36 22.9237 36 24.2528C36 25.5819 37.0745 26.6594 38.4 26.6594C39.7255 26.6594 40.8 25.5819 40.8 24.2528Z"
            fill={`url(#paint-6-${uniqueId})`}
          />
          <path
            d="M38.4 12.2197H19.2C17.8745 12.2197 16.8 13.2972 16.8 14.6263C16.8 15.9554 17.8745 17.0329 19.2 17.0329H38.4C39.7255 17.0329 40.8 15.9554 40.8 14.6263C40.8 13.2972 39.7255 12.2197 38.4 12.2197Z"
            fill={`url(#paint-7-${uniqueId})`}
          />
          <path
            d="M38.4 31.457H19.2C17.8745 31.457 16.8 32.5345 16.8 33.8636C16.8 35.1928 17.8745 36.2702 19.2 36.2702H38.4C39.7255 36.2702 40.8 35.1928 40.8 33.8636C40.8 32.5345 39.7255 31.457 38.4 31.457Z"
            fill={`url(#paint-8-${uniqueId})`}
          />
          <path
            d="M28.8 21.8462H9.60001C8.27453 21.8462 7.20001 22.9237 7.20001 24.2528C7.20001 25.5819 8.27453 26.6594 9.60001 26.6594H28.8C30.1255 26.6594 31.2 25.5819 31.2 24.2528C31.2 22.9237 30.1255 21.8462 28.8 21.8462Z"
            fill={`url(#paint-9-${uniqueId})`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`paint-0-${uniqueId}`}
          x1="24"
          y1="4.99988"
          x2="24"
          y2="43.5453"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1D273D" />
          <stop offset="1" stopColor="#0D0F13" />
        </linearGradient>
        <linearGradient
          id={`paint-1-${uniqueId}`}
          x1="7.93939"
          y1="16.9999"
          x2="11.2121"
          y2="12.6363"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4462FE" />
          <stop offset="1" stopColor="#7D69FA" />
        </linearGradient>
        <linearGradient
          id={`paint-2-${uniqueId}`}
          x1="7.6218"
          y1="17.0352"
          x2="11.653"
          y2="16.8292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3757FD" />
          <stop offset="1" stopColor="#6980FA" />
        </linearGradient>
        <linearGradient
          id={`paint-3-${uniqueId}`}
          x1="7.6218"
          y1="17.0352"
          x2="11.653"
          y2="16.8292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2447FF" />
          <stop offset="1" stopColor="#6980FA" />
        </linearGradient>
        <linearGradient
          id={`paint-4-${uniqueId}`}
          x1="7.87878"
          y1="35.4847"
          x2="11.0909"
          y2="32.0907"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#BC3EE6" />
          <stop offset="1" stopColor="#D972F1" />
        </linearGradient>
        <linearGradient
          id={`paint-5-${uniqueId}`}
          x1="36.9697"
          y1="25.8485"
          x2="39.9394"
          y2="22.697"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#29BDFF" />
          <stop offset="1" stopColor="#96E7FB" />
        </linearGradient>
        <linearGradient
          id={`paint-6-${uniqueId}`}
          x1="36.3855"
          y1="26.6264"
          x2="40.5536"
          y2="26.427"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#23BBFF" />
          <stop offset="1" stopColor="#85E7FF" />
        </linearGradient>
        <linearGradient
          id={`paint-7-${uniqueId}`}
          x1="18.7273"
          y1="16.9999"
          x2="38.4849"
          y2="12.2727"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#23BBFF" />
          <stop offset="1" stopColor="#85E7FF" />
        </linearGradient>
        <linearGradient
          id={`paint-8-${uniqueId}`}
          x1="18.9091"
          y1="36.2726"
          x2="37.8788"
          y2="31.4241"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2447FF" />
          <stop offset="1" stopColor="#6980FA" />
        </linearGradient>
        <linearGradient
          id={`paint-9-${uniqueId}`}
          x1="10.4243"
          y1="26.697"
          x2="28.5455"
          y2="21.8485"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6634FF" />
          <stop offset="1" stopColor="#9C6DFF" />
        </linearGradient>
        <clipPath id={`clip-1-${uniqueId}`}>
          <rect width="48" height="38.5055" fill="white" transform="translate(0 5)" />
        </clipPath>
        <clipPath id={`clip-2-${uniqueId}`}>
          <rect width="48" height="38.5055" fill="white" transform="translate(0 5)" />
        </clipPath>
      </defs>
    </ImageIconSVG>
  )
})

Sequence.displayName = 'Sequence'
