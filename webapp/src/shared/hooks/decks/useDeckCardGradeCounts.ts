import { useMemo } from 'react'

import { ItemType } from '~/lib/proto'
import { TRADABLE_CARD_ITEM_TYPES } from '~/shared/constants/cards'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'

export const useDeckCardGradeCounts = (id?: string) => {
  const { data: deck } = useUserDeck(id)
  const cardBalances = useMultiTypeTokenBalances(TRADABLE_CARD_ITEM_TYPES)

  return useMemo(() => {
    if (!id) return null
    if (!deck || !cardBalances?.length) return undefined

    let numGoldCards = 0
    let numSilverCards = 0
    let numBaseCards = 0

    deck.cardIds.forEach((baseId) => {
      if (
        !!cardBalances.some(
          (balance) =>
            balance.id === baseId && balance.itemType === ItemType.SW_GOLD_CARDS
        )
      ) {
        numGoldCards += 1
      } else if (
        !!cardBalances.some(
          (balance) =>
            balance.id === baseId && balance.itemType === ItemType.SW_SILVER_CARDS
        )
      ) {
        numSilverCards += 1
      } else if (
        !!cardBalances.some(
          (balance) =>
            balance.id === baseId && balance.itemType === ItemType.SW_BASE_CARDS
        )
      ) {
        numBaseCards += 1
      }
    })
    return {
      numGoldCards,
      numSilverCards,
      numBaseCards
    }
  }, [cardBalances, deck, id])
}
