import { DeckClass } from '@opensky/proto'
import { COMBINED_CODES_ORDERED } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { playState, updatePlayState } from '~/shared/state/play-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckSelectorHero } from '../../shared/components/DeckSelectorHero/DeckSelectorHero'
import { DECK_SELECTOR_DIALOG_ID } from '../../shared/constants'
import { DeckSelectorDialogHeroesStyle } from './DeckSelectorDialogHeroes.css'

export const DeckSelectorDialogHeroes = memo(() => {
  const { selectedHero } = useSnapshot(playState)
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()

  const onClick = useCallback((deckClass: DeckClass) => {
    updatePlayState('selectedHero', deckClass)
    const { closeDialog } = controlDialog(DECK_SELECTOR_DIALOG_ID)
    closeDialog()
  }, [])

  const isDeckClassLocked = (deckClass: DeckClass) => {
    if (!unlockedDeckClasses) return true

    if (deckClass === DeckClass.UNKNOWN_CLASS) {
      return false
    }

    if (unlockedDeckClasses.includes(deckClass)) return false

    return true
  }

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          paddingBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }),
        DeckSelectorDialogHeroesStyle
      )}
    >
      {COMBINED_CODES_ORDERED.map((deckClass) => {
        const isLocked = isDeckClassLocked(deckClass)
        return (
          <DeckSelectorHero
            key={deckClass}
            deckClass={deckClass}
            isLocked={isLocked}
            isActive={selectedHero === deckClass}
            onClick={onClick}
          />
        )
      })}
    </div>
  )
})

DeckSelectorDialogHeroes.displayName = 'DeckSelectorDialogHeroes'
