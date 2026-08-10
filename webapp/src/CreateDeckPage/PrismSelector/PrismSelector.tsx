import { DeckClass } from '@opensky/proto'
import {
  CODE_PRISMS,
  COMBINED_CODES,
  MONO_PRISM_CODES,
  PrismClass
} from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  createDeckState,
  updateCreateDeckState
} from '../shared/state/create-deck-state'
import { SelectBarStructure } from './components/SelectBarStructure'
import { PrismButton } from './PrismButton/PrismButton'
import { PrismSelectorInner, PrismSelectorStyle } from './PrismSelector.css'

const PrismSelector = memo(() => {
  const { deckClass } = useSnapshot(createDeckState)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const isWide = useResponsiveQuery('desktop')
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()

  const onClick = useCallback(
    (_prism: DeckClass) => {
      const prism = _prism as unknown as PrismClass

      let newPrisms = CODE_PRISMS[createDeckState.deckClass]

      const isSelected = newPrisms.includes(prism)

      if (isSelected) {
        newPrisms = [...newPrisms.filter((p) => p !== prism)]
      } else if (newPrisms.length === 2) {
        newPrisms = [newPrisms[1], prism]
      } else if (!newPrisms.length) {
        newPrisms = [prism]
      } else {
        newPrisms = [newPrisms[0], prism]
      }

      const newDeckClass = COMBINED_CODES.find((code) => {
        const codePrisms = CODE_PRISMS[code]

        return newPrisms.every((p) => codePrisms.includes(p))
      })

      if (!newDeckClass || newDeckClass === DeckClass.UNKNOWN_CLASS) {
        return
      }

      if (!unlockedDeckClasses || !unlockedDeckClasses.includes(newDeckClass)) {
        if (!!unlockedDeckClasses && unlockedDeckClasses.includes(_prism)) {
          updateCreateDeckState('deckClass', _prism)
          return
        } else {
          return
        }
      }
      updateCreateDeckState('deckClass', newDeckClass)
    },
    [unlockedDeckClasses]
  )

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexDirection: 'column',
          zIndex: 4
        }),
        PrismSelectorStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute'
          }),
          PrismSelectorInner
        )}
      >
        {MONO_PRISM_CODES.map((code) => (
          <PrismButton
            isSelected={CODE_PRISMS[deckClass].includes(
              code as unknown as PrismClass
            )}
            deckClass={code}
            onClick={onClick}
            key={code}
          />
        ))}
      </div>
      <SelectBarStructure
        width={isWide ? 1069 : !isTabletWide ? 475 : 660}
        height={isWide ? 73 : !isTabletWide ? 30 : 45}
      />
    </div>
  )
})

PrismSelector.displayName = 'PrismSelector'

export default PrismSelector
