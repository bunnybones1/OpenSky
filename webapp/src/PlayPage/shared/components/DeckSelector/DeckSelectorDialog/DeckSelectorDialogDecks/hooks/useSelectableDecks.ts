import { DeckType } from '@opensky/proto'
import { useMemo } from 'react'

import {
  deckFavouriteSort,
  isDeckStarterSort
} from '~/shared/helpers/decks/deck-sorting'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { useConquestStatus } from '~/shared/queries/play/useConquestStatus'
import { useHeroUnlockLevels } from '~/shared/queries/useHeroUnlockLevels'

export const useSelectableDecks = (isConquest?: boolean) => {
  const { data: decks } = useUserDecks()
  const { data: unlockLevels } = useHeroUnlockLevels()
  const { data: conquestStatus } = useConquestStatus(!!isConquest)

  const selectableDecks = useMemo(() => {
    if (!!isConquest) {
      return decks
        ?.filter((deck) => {
          if (!conquestStatus?.deckClass) {
            return deck.deckType !== DeckType.LOCKED_STARTER
          }
          return (
            deck.class === conquestStatus.deckClass &&
            deck.deckType !== DeckType.LOCKED_STARTER
          )
        })
        .sort((a, b) => {
          if (!!unlockLevels) {
            return isDeckStarterSort(a, b, unlockLevels)
          }
          return 0
        })
        .sort(deckFavouriteSort)
    }
    return decks
      ?.filter((deck) => deck.deckType !== DeckType.LOCKED_STARTER)
      .sort((a, b) => {
        if (!!unlockLevels) {
          return isDeckStarterSort(a, b, unlockLevels)
        }
        return 0
      })
      .sort(deckFavouriteSort)
  }, [isConquest, decks, conquestStatus?.deckClass, unlockLevels])

  const lockedDecks = useMemo(() => {
    if (!!isConquest && !!conquestStatus?.deckClass) {
      return decks
        ?.filter(
          (deck) =>
            deck.class !== conquestStatus.deckClass &&
            deck.deckType !== DeckType.LOCKED_STARTER
        )
        .sort((a, b) => {
          if (!!unlockLevels) {
            return isDeckStarterSort(a, b, unlockLevels)
          }
          return 0
        })
        .sort(deckFavouriteSort)
    }
    return []
  }, [conquestStatus?.deckClass, decks, isConquest, unlockLevels])

  return {
    lockedDecks,
    selectableDecks
  }
}
