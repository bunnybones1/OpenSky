import { useMemo } from 'react'

import { useUserDecks } from '~/shared/queries/decks/useUserDecks'

export const useUserDeckByDeckstring = (deckString?: string) => {
  const { data: userDecks } = useUserDecks()

  return useMemo(() => {
    return userDecks?.find((deck) => deck.deckString === deckString)
  }, [deckString, userDecks])
}
