import {
  DUAL_PRISM_DECK_SIZE,
  POLY_PRISM_CODES,
  SINGLE_PRISM_DECK_SIZE
} from '@opensky/shared/constants'
import { useMemo } from 'react'

import { DeckClass } from '~/lib/proto'

export const useDeckCardsRequired = (deckClass?: DeckClass) => {
  return useMemo(() => {
    if (!deckClass) return null
    return POLY_PRISM_CODES.includes(deckClass)
      ? DUAL_PRISM_DECK_SIZE
      : SINGLE_PRISM_DECK_SIZE
  }, [deckClass])
}
