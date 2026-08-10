import { COMBINED_CODES_ORDERED } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { DeckClass } from '~/lib/proto'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { createDeckState } from '../shared/state/create-deck-state'
import { HeroSelectButton } from './components/HeroSelectButton'
import { HeroSelectStyle } from './HeroSelect.css'

export const HeroSelect = memo(() => {
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()
  const { deckClass } = useSnapshot(createDeckState)

  return (
    <div
      className={clsx(
        Sprinkles({
          marginTop: {
            base: '16px',
            mobile: '0px',
            tablet: '32px',
            tabletWide: '0px'
          },
          position: 'relative',
          display: 'grid'
        }),
        HeroSelectStyle
      )}
    >
      {COMBINED_CODES_ORDERED.filter((c) => c != DeckClass.UNKNOWN_CLASS).map(
        (_deckClass) => {
          return (
            <HeroSelectButton
              key={_deckClass}
              deckClass={_deckClass}
              isSelected={_deckClass === deckClass}
              isLocked={
                !unlockedDeckClasses || !unlockedDeckClasses.includes(_deckClass)
              }
            />
          )
        }
      )}
    </div>
  )
})

HeroSelect.displayName = 'HeroSelect'
