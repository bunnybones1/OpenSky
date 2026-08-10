import { ItemType } from '@opensky/proto'
import { HeroSkin } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import clsx from 'clsx'
import { ComponentType, memo, useCallback, useMemo } from 'react'

import { SoundClient } from '~/shared/clients'
import { ItemLock } from '~/shared/components/ItemLock'
import { HERO_BASE_CLASSNAME } from '~/shared/constants/hero-skins'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { openItemCraftingDialog } from '../ItemCraftingDialog/shared/item-crafting-state'
import { TiltWrapper } from '../TiltWrapper'
import { HeroCraftOverlay } from './components/HeroCraftOverlay'
import { HeroSkinImage } from './components/HeroSkinImage'
import { HeroSkinImageWrapper, HeroSkinWrapper, LockStyle } from './Hero.css'

interface HeroSkinProps {
  onClick?: (heroSkin: HeroSkin) => void
  id: number
  isTiltable?: boolean
  className?: string
  BalanceAndPriceInfo?: ComponentType<{ id: number }>
  isLocked?: boolean
  NewBadge?: ComponentType<{ id: number }>
  onHover?: () => void
  // Not used currently, but added for when crafting is working
  isCraftable?: boolean
}

export const Hero = memo(
  ({
    id,
    onClick,
    isTiltable,
    className,
    BalanceAndPriceInfo,
    isLocked,
    NewBadge,
    onHover,
    isCraftable
  }: HeroSkinProps) => {
    const heroSkin = useMemo(() => {
      return HeroSkinLibrary.get(id)
    }, [id])

    const handleClick = useCallback(() => {
      if (!!isCraftable) {
        openItemCraftingDialog({ id, itemType: ItemType.SW_HERO })
      } else if (!!onClick && !!heroSkin) {
        onClick(heroSkin)
      }
    }, [heroSkin, id, isCraftable, onClick])

    if (!heroSkin) return null

    return (
      <div
        className={clsx(
          className,
          Sprinkles({
            width: 'full',
            position: 'relative',
            cursor: !!onClick ? 'pointer' : undefined
          }),
          HERO_BASE_CLASSNAME,
          HeroSkinWrapper
        )}
        onMouseEnter={() => {
          SoundClient.playSound('CursorMainHover')
          if (onHover) onHover()
        }}
        data-hero-id={id}
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
            HeroSkinImageWrapper,
            { isLocked }
          )}
          onClick={handleClick}
        >
          <TiltWrapper isEnabled={!!isTiltable && !isCraftable}>
            <HeroSkinImage artID={heroSkin.artID} />
          </TiltWrapper>
        </div>
        <HeroCraftOverlay isCraftable={!!isCraftable} />
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
      </div>
    )
  }
)

Hero.displayName = 'Hero'
