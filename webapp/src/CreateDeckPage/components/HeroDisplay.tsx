import { BASE_HERO_SKINS, DECKCLASS_HEROES } from '@opensky/shared/constants'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { createDeckState } from '../shared/state/create-deck-state'
import {
  HeroDisplayGradient,
  HeroDisplayImage,
  HeroDisplayInner,
  HeroDisplayStyle
} from './HeroDisplay.css'

export const HeroDisplay = memo(() => {
  const isTablet = useResponsiveQuery('tablet')
  const { deckClass } = useSnapshot(createDeckState)
  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          flex: 1,
          pointerEvents: 'none',
          height: 'full',
          position: 'relative',
          width: isTablet ? 'auto' : 'full'
        }),
        HeroDisplayStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            height: 'full',
            position: 'relative',
            bottom: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexDirection: 'column',
            marginTop: { base: '0px', mobile: '16px', tablet: '0px' }
          }),
          HeroDisplayInner
        )}
      >
        <AnimatePresence>
          {!!getAssetUrl && (
            <motion.img
              key={BASE_HERO_SKINS[DECKCLASS_HEROES[deckClass]].artID}
              src={getAssetUrl(
                `webapp/heroes/art/6x/${
                  BASE_HERO_SKINS[DECKCLASS_HEROES[deckClass]].artID
                }@6x.webp`
              )}
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  left: 0,
                  width: 'full',
                  zIndex: 1
                }),
                HeroDisplayImage
              )}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </div>
      <div
        className={clsx(
          Sprinkles({
            position: 'fixed',
            bottom: 0,
            left: 0,
            zIndex: 1
          }),
          HeroDisplayGradient
        )}
      />
    </div>
  )
})

HeroDisplay.displayName = 'HeroDisplay'
