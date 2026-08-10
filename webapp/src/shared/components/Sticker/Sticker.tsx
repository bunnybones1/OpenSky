import { Sticker as StickerType } from '@opensky/shared/constants'
import clsx from 'clsx'
import { ComponentType, memo, useCallback, useMemo } from 'react'

import { SoundClient } from '~/shared/clients'
import { ItemLock } from '~/shared/components/ItemLock'
import { AllStickers, STICKER_BASE_CLASSNAME } from '~/shared/constants/stickers'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { TiltWrapper } from '../TiltWrapper'
import { StickerImage } from './components/StickerImage'
import { LockStyle, StickerImageWrapper, StickerWrapper } from './Sticker.css'

interface StickerProps {
  onClick?: (heroSkin: StickerType) => void
  id: number
  isTiltable?: boolean
  className?: string
  BalanceAndPriceInfo?: ComponentType<{ id: number }>
  isLocked?: boolean
  NewBadge?: ComponentType<{ id: number }>
  EquipBadge?: ComponentType<{ id: number }>
  onHover?: () => void
  hasSound?: boolean
}

export const Sticker = memo(
  ({
    id,
    onClick,
    isTiltable,
    className,
    BalanceAndPriceInfo,
    isLocked,
    NewBadge,
    onHover,
    EquipBadge,
    hasSound = true
  }: StickerProps) => {
    const sticker = useMemo(() => {
      return AllStickers.get(id)
    }, [id])

    const handleClick = useCallback(() => {
      if (!!onClick && !!sticker) {
        onClick(sticker)
      }
    }, [sticker, onClick])

    if (!sticker) return null

    return (
      <div
        className={clsx(
          className,
          Sprinkles({
            width: 'full',
            position: 'relative',
            cursor: !!onClick ? 'pointer' : undefined
          }),
          STICKER_BASE_CLASSNAME,
          StickerWrapper
        )}
        data-sticker-id={id}
        onMouseEnter={() => {
          if (hasSound) SoundClient.playSound('CursorMainHover')
          if (onHover) onHover()
        }}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'absolute',
              left: 0,
              top: 0,
              height: 'full'
            }),
            StickerImageWrapper,
            { isLocked }
          )}
          onClick={handleClick}
        >
          <TiltWrapper isEnabled={!!isTiltable}>
            <StickerImage artID={sticker.artID} />
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

Sticker.displayName = 'Hero'
