import { DeckClass } from '@opensky/proto'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { useCallback } from 'react'

import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'

export const useGenerateRandomDeckClass = () => {
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()

  const generateRandomDeckClass = useCallback(() => {
    const prisms = (Object.keys(DECKCLASS_HEROES) as DeckClass[]).filter(
      (deckClass) =>
        deckClass !== DeckClass.UNKNOWN_CLASS &&
        !!unlockedDeckClasses &&
        unlockedDeckClasses.includes(deckClass)
    )

    const randomNumber = Math.floor(Math.random() * prisms.length)
    return prisms[randomNumber]
  }, [unlockedDeckClasses])

  return {
    generateRandomDeckClass
  }
}
