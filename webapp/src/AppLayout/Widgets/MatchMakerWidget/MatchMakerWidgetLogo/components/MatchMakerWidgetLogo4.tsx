import clsx from 'clsx'
import { motion } from 'framer-motion'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchMakerColorType } from '../../shared/type'
import { SharedMatchMakerWidgetLogoStyle } from '../shared/SharedMatchMakerWidgetLogoStyle.css'

const ColorInfo: {
  [key in MatchMakerColorType]: { color1: string; color2: string }
} = {
  blue: { color1: '#52FFFF', color2: '#1758C7' },
  green: { color1: '#4AD578', color2: '#154528' },
  orange: { color1: '#FDB000', color2: '#BC4918' }
}

interface MatchMakerWidgetLogo4Props {
  color: MatchMakerColorType
}

export const MatchMakerWidgetLogo4 = memo(({ color }: MatchMakerWidgetLogo4Props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 54"
    fill="none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ ease: 'linear', duration: 0.5 }}
    className={clsx(
      Sprinkles({ width: 'full', zIndex: 2, position: 'absolute' }),
      SharedMatchMakerWidgetLogoStyle
    )}
  >
    <g opacity="0.5">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23.9107 0L39.8214 15.7507V38.2493L23.9107 54L8 38.2493V15.7507L23.9107 0Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23.9107 0L39.8214 15.7507V38.2493L23.9107 54L8 38.2493V15.7507L23.9107 0Z"
        fill="black"
      />
    </g>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M23.9688 3L37.9376 17.0007V36.9993L23.9688 51L10 36.9993V17.0007L23.9688 3ZM21.9721 31.6669L17.3164 27L30.7344 13.5513L23.9688 6.77066L12.6599 18.1047V35.8953L15.2073 38.4476L21.9721 31.6669ZM35.2768 35.8953V18.1047L32.7302 15.5524L25.9646 22.3331L30.6202 27L17.2022 40.4487L23.9688 47.2293L35.2768 35.8953Z"
      fill={ColorInfo[color].color2}
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M23.9688 3L37.9376 17.0007V36.9993L23.9688 51L10 36.9993V17.0007L23.9688 3ZM21.9721 31.6669L17.3164 27L30.7344 13.5513L23.9688 6.77066L12.6599 18.1047V35.8953L15.2073 38.4476L21.9721 31.6669ZM35.2768 35.8953V18.1047L32.7302 15.5524L25.9646 22.3331L30.6202 27L17.2022 40.4487L23.9688 47.2293L35.2768 35.8953Z"
      fill={ColorInfo[color].color2}
    />
    <path
      d="M37.9688 36.9987L37.9688 17L35.3089 18.104L35.3089 35.8947L37.9688 36.9987Z"
      fill="url(#logo-4-paint-1)"
    />
    <path
      d="M24 50.9996L37.9688 36.999L35.3089 35.895L24 47.229L24 50.9996Z"
      fill="url(#logo-4-paint-2)"
    />
    <defs>
      <linearGradient
        id="logo-4-paint-1"
        x1="37.9687"
        y1="36.9996"
        x2="37.9688"
        y2="18.9996"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor={ColorInfo[color].color1} />
        <stop offset="1" stopColor={ColorInfo[color].color1} stopOpacity="0" />
      </linearGradient>
      <linearGradient
        id="logo-4-paint-2"
        x1="37.9688"
        y1="38.4996"
        x2="25.4687"
        y2="50.9996"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor={ColorInfo[color].color1} />
        <stop offset="1" stopColor="white" />
      </linearGradient>
    </defs>
  </motion.svg>
))

MatchMakerWidgetLogo4.displayName = 'MatchMakerWidgetLogo4'
