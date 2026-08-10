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

interface MatchMakerWidgetLogo6Props {
  color: MatchMakerColorType
}

export const MatchMakerWidgetLogo6 = memo(({ color }: MatchMakerWidgetLogo6Props) => (
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
      d="M15.2073 38.4468L12.6599 35.8945L10 36.9985L23.9688 50.9992L23.9688 47.2285L17.2022 40.4478L15.2073 38.4468Z"
      fill="url(#logo-6-paint-1)"
    />
    <path
      d="M10 17V36.9987L12.6599 35.8947V18.104L10 17Z"
      fill="url(#logo-6-paint-2)"
    />
    <defs>
      <linearGradient
        id="logo-6-paint-1"
        x1="12"
        y1="35.999"
        x2="24"
        y2="49.499"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor={ColorInfo[color].color1} />
        <stop offset="1" stopColor={ColorInfo[color].color1} stopOpacity="0" />
      </linearGradient>
      <linearGradient
        id="logo-6-paint-2"
        x1="12"
        y1="35.999"
        x2="12"
        y2="17.999"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor={ColorInfo[color].color1} />
        <stop offset="1" stopColor="white" />
      </linearGradient>
    </defs>
  </motion.svg>
))

MatchMakerWidgetLogo6.displayName = 'MatchMakerWidgetLogo6'
