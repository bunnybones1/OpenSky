import { useMemo } from 'react'

import { Deck, DeckType } from '~/lib/proto'

export const useIsStarterDeck = (deckType?: Deck['deckType']) => {
  return useMemo(() => {
    if (!deckType) return false
    return (
      deckType === DeckType.LOCKED_STARTER || deckType === DeckType.UNLOCKED_STARTER
    )
  }, [deckType])
}
