import { CardBack as CardBackType } from '@opensky/shared/constants'
import clsx from 'clsx'
import { ComponentType, memo, useCallback, useMemo } from 'react'

import { SoundClient } from '~/shared/clients'
import { AllCardBacks, CARDBACK_BASE_CLASSNAME } from '~/shared/constants/card-backs'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemLock } from '../ItemLock'
import { TiltWrapper } from '../TiltWrapper'
import { CardBackImageWrapper, CardBackWrapper, LockStyle } from './CardBack.css'
import { CardBackImage } from './components/CardBackImage'

interface CardBackProps {
  onClick?: (heroSkin: CardBackType) => void
  id: number
  isTiltable?: boolean
  className?: string
  BalanceAndPriceInfo?: ComponentType<{ id: number }>
  isLocked?: boolean
  NewBadge?: ComponentType<{ id: number }>
  EquipBadge?: ComponentType<{ id: number }>
  onHover?: () => void
}

export const CardBack = memo(
  ({
    id,
    onClick,
    isTiltable,
    className,
    BalanceAndPriceInfo,
    isLocked,
    NewBadge,
    onHover,
    EquipBadge
  }: CardBackProps) => {
    const cardBack = useMemo(() => {
      return AllCardBacks.get(id)
    }, [id])

    const handleClick = useCallback(() => {
      if (!!onClick && !!cardBack) {
        onClick(cardBack)
      }
    }, [cardBack, onClick])

    if (!cardBack) return null

    return (
      <div
        className={clsx(
          className,
          Sprinkles({
            width: 'full',
            position: 'relative',
            cursor: !!onClick ? 'pointer' : undefined
          }),
          CARDBACK_BASE_CLASSNAME,
          CardBackWrapper
        )}
        onMouseEnter={() => {
          SoundClient.playSound('CursorMainHover')
          if (onHover) onHover()
        }}
        data-cardback-id={id}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'absolute',
              left: 0,
              top: 0
            }),
            CardBackImageWrapper,
            { isLocked }
          )}
          onClick={handleClick}
        >
          <TiltWrapper isEnabled={!!isTiltable}>
            <CardBackImage artID={cardBack.artID} />
          </TiltWrapper>
        </div>
        {!!BalanceAndPriceInfo && <BalanceAndPriceInfo id={id} />}
        {!!isLocked && (
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'full',
                position: 'absolute',
                left: 0,
                pointerEvents: 'none'
              }),
              LockStyle
            )}
          >
            <ItemLock />
          </div>
        )}
        {!!NewBadge && <NewBadge id={id} />}
        {!!EquipBadge && <EquipBadge id={id} />}
      </div>
    )
  }
)

CardBack.displayName = 'CardBack'
