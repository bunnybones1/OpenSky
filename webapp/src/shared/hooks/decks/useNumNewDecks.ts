import { useMemo } from 'react'

import { useUserDecks } from '~/shared/queries/decks/useUserDecks'

export const useNumNewDecks = () => {
  const { data: decks } = useUserDecks()

  return useMemo(() => {
    if (!decks) return 0
    let count = 0

    decks.forEach((deck) => {
      if (deck.isNew) count += 1
    })

    return count
  }, [decks])
}
