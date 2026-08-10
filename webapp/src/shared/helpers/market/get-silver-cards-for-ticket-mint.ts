import { getSilverID } from '@opensky/shared/assetsIDs'

import {
  getCheapestSilvers,
  getSilverCosts
} from '~/shared/queries/useConquestTicketCost'
import { PriceAndSupplyWithId } from '~/shared/types/market'

interface SilverCost {
  amount: number
  cost: number
}

export const getSilverCardsForTicketMint = async (
  nSilvers: number,
  cardsSortedByPrice: PriceAndSupplyWithId[] | null | undefined
): Promise<{
  silversToBuy: { [id: number]: SilverCost }
}> => {
  const silversToBuy: { [id: number]: SilverCost } = {}

  const cheapestSilvers = getCheapestSilvers(nSilvers, cardsSortedByPrice)
  if (!cheapestSilvers) {
    throw new Error('Unable to get silvers to buy, no prices.')
  }

  const unrollCards = async (cards: { [key: number]: number }) => {
    const availableCards: {
      id: number
      amount: number
      price: number
      cost: number
    }[] = []

    // Reformart arguments
    const ids = Object.keys(cards)
      .map((a) => Number(a))
      .map(getSilverID)
    const amounts = Object.values(cards)

    const costs = await getSilverCosts(cards)

    if (!costs) return

    ids.forEach((id, idx) => {
      const amount = amounts[idx] * 100
      const cost = Number(costs[id])
      const price = cost / amount
      availableCards.push({ id, amount, price, cost })
    })
    return availableCards
  }

  // Get prices and costs for silvers to buy
  const cheapestPrices = await unrollCards(cheapestSilvers)

  if (!cheapestPrices) {
    throw new Error('Unable to get silvers to buy, no prices.')
  }

  // Sort all available cards by price
  const availableSilvers = cheapestPrices.sort((a, b) => a.price - b.price)

  // Get list of cards that will purchased
  let silverCounter = nSilvers * 100
  availableSilvers.forEach((s) => {
    if (silverCounter > 0 && s.amount <= silverCounter) {
      silversToBuy[s.id] = { amount: s.amount, cost: s.cost }
    }
    silverCounter -= s.amount
  })

  return { silversToBuy }
}
