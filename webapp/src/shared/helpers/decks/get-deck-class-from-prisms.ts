import { DeckClass } from '@opensky/proto'
import { CODE_PRISMS } from '@opensky/shared/constants'
import isEmpty from 'lodash-es/isEmpty'
import xor from 'lodash-es/xor'

import { FilterablePrism } from '../../types/cards'

export const getDeckClassFromPrisms = (prisms: FilterablePrism[]): DeckClass[] => {
  let deckClasses: DeckClass[] = []
  if (prisms.length === 2) {
    Object.keys(CODE_PRISMS).forEach((code) => {
      const codePrisms = [...CODE_PRISMS[code]]
      if (isEmpty(xor(codePrisms, prisms))) deckClasses = [code as DeckClass]
    })
  } else if (prisms.length === 1)
    deckClasses = [
      Object.keys(CODE_PRISMS).find((key) => key === prisms[0]) as DeckClass
    ]
  return deckClasses
}
