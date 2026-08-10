import { Cards, CardType } from '~/shared/constants/cards'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

import { isDefined } from '../is-defined-is-not-null'

interface GetSortedCardsParams {
  cardIds: number[]
  sortOption: CARD_SORTING_OPTIONS
}

export const getSortedCardIds = ({ cardIds, sortOption }: GetSortedCardsParams) => {
  let cards: CardType[] = cardIds.map((id) => Cards.get(id)).filter(isDefined)

  switch (sortOption) {
    case CARD_SORTING_OPTIONS.MANA_ASCENDING: {
      cards = cards.sort((a, b) => {
        const aCost: number = a.cost === 'X' ? 14 : (a.cost as number)
        const bCost: number = b.cost === 'X' ? 14 : (b.cost as number)
        return aCost - bCost
      })
      break
    }

    case CARD_SORTING_OPTIONS.MANA_DESCENDING: {
      cards = cards.sort((a, b) => {
        const aCost: number = a.cost === 'X' ? 0 : (a.cost as number)
        const bCost: number = b.cost === 'X' ? 0 : (b.cost as number)
        return bCost - aCost
      })
      break
    }

    case CARD_SORTING_OPTIONS.POWER_DESCENDING: {
      cards = cards.sort((a, b) => {
        // If no power set it to the end
        const aPower: number = a.power === undefined ? -1 : (a.power as number)
        const bPower: number = b.power === undefined ? -1 : (b.power as number)
        return bPower - aPower
      })
      break
    }

    case CARD_SORTING_OPTIONS.HEALTH_DESCENDING: {
      cards = cards.sort((a, b) => {
        // If no health set it to the end
        const aHealth: number = a.health === undefined ? -1 : (a.health as number)
        const bHealth: number = b.health === undefined ? -1 : (b.health as number)
        return bHealth - aHealth
      })
      break
    }
  }

  return cards.map((card) => card.id)
}
