import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  OriginalPriceFontStyle,
  OriginalPriceFrameStyle,
  OriginalPriceImageStyle,
  OriginalPriceLineStyle,
  OriginalPriceStyle,
  OriginalPriceTextStyle
} from './OriginalPrice.css'

interface PriceButtonProps {
  originalPrice?: number
  type: ItemType
}

const FontSize = {
  base: '10px',
  tablet: '14px',
  desktop: '16px'
} as const

export const OriginalPrice = memo(({ originalPrice, type }: PriceButtonProps) => {
  const { getAssetUrl } = useGetAssetContext()

  const buttonIcon = useMemo(() => {
    switch (type) {
      case ItemType.SW_CRYSTALS:
        return 'spark-icon'
      default:
        return 'usdc'
    }
  }, [type])

  if (!originalPrice) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          position: 'absolute',
          zIndex: 5
        }),
        OriginalPriceStyle
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 115 27"
        className={
          (Sprinkles({ width: 'full', height: 'full' }), OriginalPriceFrameStyle)
        }
      >
        <path
          stroke="url(#paint0_linear_210_21766)"
          strokeWidth="1.4"
          d="M114.401 1h-76.3c-6.73 7.974-20.052 24.1-19.495 24.809.557.708-9.478.295-18.066 0"
          opacity="0.3"
        />
        <defs>
          <linearGradient
            id="paint0_linear_210_21766"
            x1="114.401"
            x2="1.001"
            y1="19.98"
            y2="19.98"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#AC8FFF" />
            <stop offset="0.71" stopColor="#AC8FFF" />
            <stop offset="1" stopColor="#AC8FFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute'
          }),
          OriginalPriceTextStyle
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              backgroundColor: 'purple8',
              width: 'full'
            }),
            OriginalPriceLineStyle
          )}
        />
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(`webapp/icons/${buttonIcon}.webp`)}
            className={OriginalPriceImageStyle}
          />
        )}
        <Text color="purple8" fontSize={FontSize} className={OriginalPriceFontStyle}>
          {originalPrice}
        </Text>
      </div>
    </div>
  )
})

OriginalPrice.displayName = 'OriginalPrice'
