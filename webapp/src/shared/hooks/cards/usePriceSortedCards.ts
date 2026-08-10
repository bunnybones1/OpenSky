import { ItemType } from '@opensky/proto'
import { useEffect, useMemo } from 'react'

import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { CARD_SORTING_OPTIONS, CardSearchParams } from '~/shared/types/cards'
import { MarketMode } from '~/shared/types/market'

interface UsePriceSortedCardsParams {
  cards?: { id: number }[]
  sort?: CardSearchParams['sort']
  grade: ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
  mode: MarketMode
  onUpdate?: (numResults?: number) => void
}

export const usePriceSortedCards = ({
  cards,
  sort,
  mode,
  grade,
  onUpdate
}: UsePriceSortedCardsParams) => {
  const { data: cardsSortedByPrice } = useTokensSortedByPrice(mode, grade)

  const sortedCards = useMemo(() => {
    if (cardsSortedByPrice === undefined || !cards) return undefined

    if (cardsSortedByPrice === null) return null

    const validSortedCards = cardsSortedByPrice
      .filter((priceAndSupply) => {
        const _card = cards.find((card) => card.id === priceAndSupply.id)

        return !!_card
      })
      .map((priceAndSupply) => ({ id: priceAndSupply.id }))

    if (
      sort !== CARD_SORTING_OPTIONS.PRICE_ASCENDING &&
      sort !== CARD_SORTING_OPTIONS.PRICE_DESCENDING
    ) {
      return cards.filter(({ id }) => {
        return !!validSortedCards.find((card) => card.id === id)
      })
    }

    if (sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING) {
      return [...validSortedCards].reverse()
    }

    return validSortedCards
  }, [cards, cardsSortedByPrice, sort])

  useEffect(() => {
    if (!!onUpdate) {
      onUpdate(sortedCards === null ? 0 : sortedCards?.length)
    }
  }, [onUpdate, sortedCards])

  return { sortedCards }
}
