import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useState } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FrameBadge } from './components/FrameBadge'
import { HorizontalFrame } from './components/HorizontalFrame'
import { OfferCountdown } from './components/OfferCountdown'
import { OriginalPrice } from './components/OriginalPrice'
import { PriceButton } from './components/PriceButton'
import { VerticalFrame } from './components/VerticalFrame'
import { SHOP_BOX_CLASSNAME } from './shared/constants'
import { Container, Glow, Inner, ShopBoxGradient, SoldOutBanner } from './ShopBox.css'

interface ShopBoxProps {
  aspectRatio: 'VERTICAL' | 'HORIZONTAL'
  saleAmount: number | undefined
  valueAmount: number | undefined
  originalPrice: number | undefined
  price: number
  expiration: string
  priceItemType: ItemType
  isSoldOut: boolean
  isClaimed: boolean
  isClaimable: boolean | undefined
}

export const ShopBox = memo(
  ({
    aspectRatio,
    saleAmount,
    valueAmount,
    price,
    expiration,
    originalPrice,
    priceItemType,
    isSoldOut,
    isClaimable,
    isClaimed
  }: ShopBoxProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const [isHovered, setIsHovered] = useState(false)

    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }),
          {
            isVertical: aspectRatio === 'VERTICAL',
            isHorizontal: aspectRatio === 'HORIZONTAL'
          },
          SHOP_BOX_CLASSNAME,
          Container
        )}
      >
        {aspectRatio === 'VERTICAL' ? (
          <VerticalFrame
            price={price}
            expiration={expiration}
            isHovered={isHovered}
          />
        ) : (
          <HorizontalFrame
            price={price}
            expiration={expiration}
            isHovered={isHovered}
          />
        )}
        {isSoldOut && aspectRatio === 'VERTICAL' && !!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/misc/sold-out-banner.webp')}
            className={clsx(
              Sprinkles({
                height: 'auto',
                position: 'absolute',
                zIndex: 5
              }),
              SoldOutBanner
            )}
          />
        )}
        <FrameBadge type="SALE" amount={saleAmount} />
        <FrameBadge type="VALUE" amount={valueAmount} />
        <PriceButton
          price={price}
          type={priceItemType}
          isClaimable={isClaimable}
          isClaimed={isClaimed}
        />
        <OfferCountdown expiration={expiration} />
        {!isClaimable && !isClaimed && (
          <OriginalPrice type={priceItemType} originalPrice={originalPrice} />
        )}
        <div
          className={clsx(Sprinkles({ width: 'full', height: 'full' }), Glow, {
            isHovered
          })}
        >
          <div
            className={clsx(
              Sprinkles({
                backgroundColor: 'cold6',
                width: 'full',
                height: 'full',
                position: 'relative'
              }),
              Inner,
              {
                isVertical: aspectRatio === 'VERTICAL',
                isHorizontal: aspectRatio === 'HORIZONTAL'
              }
            )}
          >
            <div
              className={clsx(
                Sprinkles({ width: 'full', height: 'full', zIndex: 2 }),
                ShopBoxGradient
              )}
            />
          </div>
        </div>
      </div>
    )
  }
)

ShopBox.displayName = 'ShopBox'
