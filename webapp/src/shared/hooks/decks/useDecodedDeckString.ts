import { decode } from '@opensky/deck-string-codec'
import { i18n } from '@opensky/language-manager'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import { useMemo } from 'react'

import { alphaManaCardSort } from '../../helpers/cards/alpha-mana-card-sort'

export const getDecodedDeckString = (deckString?: string) => {
  if (!deckString) return {}

  const decoded = decode(CardLibrary, deckString)

  if (!decoded || !Array.isArray(decoded)) return {}

  const deckClass = decoded[1]
  let cardIds = decoded[2] as BaseCard[]

  if (!!cardIds && !!cardIds.length) {
    cardIds = alphaManaCardSort(cardIds, i18n.t)
  }

  return {
    deckClass,
    cardIds
  }
}

export const useDecodedDeckString = (deckString?: string) => {
  return useMemo(() => {
    return getDecodedDeckString(deckString)
  }, [deckString])
}
