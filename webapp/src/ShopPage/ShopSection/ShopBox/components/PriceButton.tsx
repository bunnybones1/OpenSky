import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import noop from 'lodash-es/noop'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PriceButtonStyle, PriceContainerStyle } from './PriceButton.css'

interface PriceButtonProps {
  price: number
  type: ItemType
  isClaimed: boolean
  isClaimable: boolean | undefined
}

export const PriceButton = memo(
  ({ price, type, isClaimable, isClaimed }: PriceButtonProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()
    const isTablet = useResponsiveQuery('tablet')
    const isDesktop = useResponsiveQuery('desktop')

    const buttonIcon = useMemo(() => {
      switch (type) {
        case ItemType.SW_CRYSTALS:
          return 'spark-icon'
        default:
          return 'usdc'
      }
    }, [type])

    const buttonText = useMemo(() => {
      if (isClaimed) return t('shop.CLAIMED')
      else if (isClaimable) return t('shop.CLAIM')
      return String(price)
    }, [isClaimable, isClaimed, price, t])

    return (
      <div
        className={clsx(
          Sprinkles({
            zIndex: 5,
            position: 'absolute',
            display: 'flex'
          }),
          PriceContainerStyle
        )}
      >
        <Button
          disabled={isClaimed}
          onClick={noop}
          text={buttonText}
          colorType="secondary"
          frameType="defaultFlipped"
          buttonClassName={clsx(PriceButtonStyle, { isClaimed })}
          height={isDesktop ? '44px' : isTablet ? '36px' : '28px'}
          leftAdornment={{
            icon: isClaimed ? 'check' : undefined,
            image:
              !isClaimed && !isClaimable && !!getAssetUrl
                ? getAssetUrl(`webapp/icons/${buttonIcon}.webp`)
                : undefined
          }}
        />
      </div>
    )
  }
)

PriceButton.displayName = 'PriceButton'
