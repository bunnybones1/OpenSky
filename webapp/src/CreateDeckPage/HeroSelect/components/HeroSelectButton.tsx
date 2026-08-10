import { DeckClass } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { updateCreateDeckState } from '~/CreateDeckPage/shared/state/create-deck-state'
import { AngledBox } from '~/shared/components/AngledBox/AngledBox'
import { heroSkinFromDeckClass } from '~/shared/helpers/hero-skin-from-deck-class'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  HeroSelectButtonStyle,
  HeroSelectLock,
  HeroSelectOverlay
} from './HeroSelectButton.css'

interface Props {
  isSelected: boolean
  deckClass: DeckClass
  isLocked: boolean
}

export const HeroSelectButton = memo(({ isSelected, deckClass, isLocked }: Props) => {
  const onClick = useCallback(() => {
    updateCreateDeckState('deckClass', deckClass)
  }, [deckClass])

  const { getAssetUrl } = useGetAssetContext()

  const heroInfo = useMemo(() => heroSkinFromDeckClass(deckClass), [deckClass])

  return (
    <div
      className={clsx(
        Sprinkles({ position: 'relative', cursor: 'pointer' }),
        HeroSelectButtonStyle,
        {
          isLocked,
          isSelected
        }
      )}
      onClick={isLocked ? undefined : onClick}
    >
      {!!isLocked && !!getAssetUrl && (
        <img
          className={clsx(
            Sprinkles({
              position: 'absolute',
              zIndex: 2,
              cursor: 'pointer'
            }),
            HeroSelectLock
          )}
          src={getAssetUrl('webapp/misc/card-lock.webp')}
        />
      )}
      <AngledBox
        borderColor="purple7"
        borderSize="2px"
        cornerSize="12px"
        backgroundColor="purple3"
        className={Sprinkles({ position: 'relative' })}
      >
        <div
          className={clsx(
            Sprinkles({
              overflow: 'hidden',
              height: 'full',
              width: 'full',
              position: 'absolute',
              top: 0,
              left: 0
            }),
            HeroSelectOverlay,
            { isSelected }
          )}
        />
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(`webapp/heroes/thumbnails/${heroInfo.base.artID}.webp`)}
            className={Sprinkles({ width: 'full', height: 'full' })}
          />
        )}
      </AngledBox>
    </div>
  )
})

HeroSelectButton.displayName = 'HeroSelectButton'
