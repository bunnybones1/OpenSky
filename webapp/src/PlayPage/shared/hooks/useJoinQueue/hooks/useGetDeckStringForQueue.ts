import { encode, VERSION } from '@opensky/deck-string-codec'
import { DeckClass, GameMode } from '@opensky/proto'
import { useCallback } from 'react'

import { GameType } from '~/shared/constants/ranks'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { playState } from '~/shared/state/play-state'
import { GameModeGameType } from '~/shared/types/play'

import { useGenerateRandomDeckClass } from './useGenerateRandomDeckClass'

export const useGetDeckStringForQueue = () => {
  const { data: userDecks } = useUserDecks()
  const { generateRandomDeckClass } = useGenerateRandomDeckClass()

  const getDeckStringForQueue = useCallback(
    (mode: GameMode) => {
      let deckString: string | null = null

      const gameType = GameModeGameType[mode]

      const { selectedDeck, selectedHero, selectedConquestDeck } = playState

      if (gameType === GameType.DISCOVERY) {
        if (!selectedHero) return null

        const classToUse: DeckClass =
          selectedHero === DeckClass.UNKNOWN_CLASS
            ? generateRandomDeckClass()
            : selectedHero

        deckString = encode(VERSION, [], DeckClass[classToUse])
      } else {
        const deckToUse =
          mode === GameMode.CONQUEST_CONSTRUCTED ? selectedConquestDeck : selectedDeck

        if (!deckToUse || !userDecks) return null

        const deck = userDecks.find((deck) => deck.uuid === deckToUse)

        if (!!deck) {
          deckString = deck.deckString
        }
      }

      if (deckString === null) return null

      return deckString
    },
    [generateRandomDeckClass, userDecks]
  )

  return { getDeckStringForQueue }
}
