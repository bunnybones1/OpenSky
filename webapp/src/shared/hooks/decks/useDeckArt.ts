import { getBaseID } from '@opensky/shared/assetsIDs'
import { useMemo } from 'react'

import { DeckClass } from '~/lib/proto'
import { Cards } from '~/shared/constants/cards'

const DEFAULT_RETURN = null

interface UseDeckArtParams {
  firstCard?: number
  art?: string
  isStarterDeck?: boolean
  deckClass?: DeckClass
}

export const useDeckArt = ({
  art,
  firstCard,
  isStarterDeck,
  deckClass
}: UseDeckArtParams) => {
  return useMemo(() => {
    if (firstCard === undefined && art === undefined) {
      return DEFAULT_RETURN
    } else {
      const card = art
        ? Cards.get(getBaseID(art))
        : firstCard
        ? Cards.get(getBaseID(firstCard))
        : null

      if (!card || !deckClass) return DEFAULT_RETURN

      if (isStarterDeck) {
        return {
          id: card.baseId,
          rowArt: `webapp/cards/art-rows/${card.type.toLowerCase()}s/4x/${
            card.artSlug
          }@4x.webp`,
          columnArt: `webapp/backgrounds/prism-${deckClass.toLowerCase()}-column@6x.webp`,
          deckArt: `webapp/backgrounds/prism-${deckClass.toLowerCase()}-column@6x.webp`,
          miniDeckArt: `webapp/backgrounds/mini-deck-art-${deckClass.toLowerCase()}.webp`,
          miniColumnArt: `webapp/backgrounds/mini-deck-art-${deckClass.toLowerCase()}.webp`
        }
      }

      return {
        id: card.baseId,
        rowArt: `webapp/cards/art-rows/${card.type.toLowerCase()}s/4x/${
          card.artSlug
        }@4x.webp`,
        deckArt: `webapp/cards/deck-cover-images/4x/${card.baseId}@4x.webp`,
        miniDeckArt: `webapp/cards/deck-cover-images/2x/${card.baseId}@2x.webp`,
        columnArt: `webapp/backgrounds/prism-${deckClass.toLowerCase()}-column@6x.webp`,
        miniColumnArt: `webapp/backgrounds/mini-deck-art-${deckClass.toLowerCase()}.webp`
      }
    }
  }, [art, deckClass, firstCard, isStarterDeck])
}
