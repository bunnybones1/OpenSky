import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  FrameBadgeAmount,
  FrameBadgeAmountText,
  FrameBadgeStyle
} from './FrameBadge.css'

interface FrameBadgeProps {
  type: 'SALE' | 'VALUE'
  amount: number | undefined
}

const STOP_COLORS = {
  VALUE: ['#22D4D4', '#0930B9'],
  SALE: ['#2254D5', '#7609B9']
} as const

const STOP_LINE_COLORS = {
  VALUE: ['#84C1EE', '#84C1EE'],
  SALE: ['#62ABE0', '#9C49DD']
} as const

export const FrameBadge = memo(({ type, amount }: FrameBadgeProps) => {
  const { t } = useTranslation()

  if (!amount) return null

  return (
    <div
      className={clsx(
        Sprinkles({ zIndex: 5, position: 'absolute' }),
        FrameBadgeStyle
      )}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            paddingX: '8px'
          })}
        >
          <Text
            textAlign="center"
            color="white"
            fontWeight="700"
            className={FrameBadgeAmount}
          >
            {type === 'VALUE' && '+'}
            {amount}%
          </Text>
          <Text
            textAlign="center"
            color="white"
            fontWeight="700"
            className={type === 'VALUE' ? FrameBadgeAmountText : FrameBadgeAmount}
          >
            {t(`shop.${type === 'SALE' ? 'OFF' : 'VALUE'}`)}
          </Text>
        </div>
        <svg
          className={Sprinkles({ height: 'full' })}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 66 66"
        >
          <circle
            cx="33"
            cy="33"
            r="32"
            fill={`url(#paint0_linear_${type})`}
            stroke="#000"
            strokeWidth="2"
          />
          <path
            fill={`url(#paint1_linear_${type})`}
            fillRule="evenodd"
            d="M62 33c0 16.016-12.984 29-29 29S4 49.016 4 33 16.984 4 33 4s29 12.984 29 29zM33 61c15.464 0 28-12.536 28-28S48.464 5 33 5 5 17.536 5 33s12.536 28 28 28z"
            clipRule="evenodd"
          />
          <defs>
            <linearGradient
              id={`paint0_linear_${type}`}
              x1="2"
              x2="50.696"
              y1="5.5"
              y2="59"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={STOP_COLORS[type][0]} />
              <stop offset="1" stopColor={STOP_COLORS[type][1]} />
            </linearGradient>
            <linearGradient
              id={`paint1_linear_${type}`}
              x1="11"
              x2="43.5"
              y1="18.5"
              y2="54"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={STOP_LINE_COLORS[type][0]} />
              <stop offset="1" stopColor={STOP_LINE_COLORS[type][1]} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
})

FrameBadge.displayName = 'FrameBadge'
