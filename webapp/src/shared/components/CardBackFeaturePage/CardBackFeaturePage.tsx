import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { ComponentType, memo, useMemo } from 'react'

import { AllCardBacks } from '~/shared/constants/card-backs'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemLock } from '../ItemLock'
import { TiltWrapper } from '../TiltWrapper'
import {
  CardBackFeatureCardBack,
  CardBackFeatureStyle,
  CardBackImage,
  FeatureBgStyle,
  LockStyle
} from './CardBackFeaturePage.css'
import { BackButton } from './components/BackButton'
import { SkyPassControls } from './components/SkyPassControls'

interface CardBackFeaturePageProps {
  id: number
  showLockIfLocked?: boolean
  EquipControls?: ComponentType<{ id: number }>
  ShopControls?: ComponentType<{ id: number }>
}

export const CardBackFeaturePage = memo(
  ({
    id,
    EquipControls,
    showLockIfLocked,
    ShopControls
  }: CardBackFeaturePageProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { data: balance } = useTokenBalance(ItemType.SW_CARD_BACKS, id)
    const { isLoaded, handleLoad, imgRef } = useImageIsLoaded()
    const {
      isLoaded: isCardBackLoaded,
      handleLoad: handleCardBackLoad,
      imgRef: cardBackRef
    } = useImageIsLoaded()
    const cardBack = useMemo(() => AllCardBacks.get(id), [id])

    if (!cardBack) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'relative',
            width: 'full'
          }),
          CardBackFeatureStyle
        )}
      >
        <BackButton />
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              height: 'full',
              display: 'flex',
              zIndex: 2,
              alignItems: 'center',
              justifyContent: 'center'
            }),
            CardBackFeatureCardBack,
            { isLocked: !!showLockIfLocked && (!balance || balance.balance === 0) }
          )}
        >
          {!!getAssetUrl && (
            <TiltWrapper isEnabled={true}>
              <img
                className={clsx(
                  Sprinkles({ opacity: isCardBackLoaded ? 1 : 0 }),
                  CardBackImage,
                  {
                    isLocked:
                      !!showLockIfLocked && (!balance || balance.balance === 0)
                  }
                )}
                src={getAssetUrl(`webapp/card-backs/6x/${cardBack.artID}.webp`)}
                ref={cardBackRef}
                onLoad={handleCardBackLoad}
              />
            </TiltWrapper>
          )}
          {!!showLockIfLocked && (!balance || balance.balance === 0) && (
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

CardBackFeaturePage.displayName = 'CardBackFeaturePage'
