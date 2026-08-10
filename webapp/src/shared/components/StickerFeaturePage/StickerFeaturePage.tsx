import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { ComponentType, memo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Sticker } from '../Sticker/Sticker'
import { BackButton } from './components/BackButton'
import { SkyPassControls } from './components/SkyPassControls'
import {
  FeatureBgStyle,
  StickerFeatureSticker,
  StickerFeatureStyle
} from './StickerFeaturePage.css'

interface StickerFeaturePageProps {
  id: number
  showLockIfLocked?: boolean
  EquipControls?: ComponentType<{ id: number }>
  ShopControls?: ComponentType<{ id: number }>
}

export const StickerFeaturePage = memo(
  ({
    id,
    EquipControls,
    showLockIfLocked,
    ShopControls
  }: StickerFeaturePageProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { data: balance } = useTokenBalance(ItemType.SW_STICKERS, id)
    const { isLoaded, handleLoad, imgRef } = useImageIsLoaded()

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'relative',
            width: 'full'
          }),
          StickerFeatureStyle
        )}
      >
        <BackButton />
        <div
          className={clsx(
            Sprinkles({ position: 'absolute', zIndex: 2 }),
            StickerFeatureSticker
          )}
        >
          <Sticker
            id={id}
            isLocked={!!showLockIfLocked && (!balance || balance.balance === 0)}
            isTiltable
            hasSound={false}
          />
        </div>
        {!!EquipControls && <EquipControls id={id} />}
        {!!ShopControls && <ShopControls id={id} />}
        <SkyPassControls id={id} />
        {!!getAssetUrl && (
          <img
            ref={imgRef}
            src={getAssetUrl('webapp/backgrounds/bg-skyblank.webp')}
            onLoad={handleLoad}
            className={clsx(
              Sprinkles({
                opacity: isLoaded ? 1 : 0,
                width: 'full',
                position: 'absolute',
                height: 'full',
                top: 0,
                zIndex: 1
              }),
              FeatureBgStyle
            )}
          />
        )}
      </div>
    )
  }
)

StickerFeaturePage.displayName = 'StickerFeaturePage'
