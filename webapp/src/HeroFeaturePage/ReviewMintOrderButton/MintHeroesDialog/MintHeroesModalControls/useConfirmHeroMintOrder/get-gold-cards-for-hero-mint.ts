import { SwapType } from '@0xsequence/metadata'
import { getGoldID } from '@opensky/shared/assetsIDs'

import {
  getCheapestGolds,
  getGoldCosts
} from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { CartItem, MarketMode, PriceAndSupplyWithId } from '~/shared/types/market'

interface GoldCost {
  amount: number
  cost: number
}

/**
 * @desc Optimize send, buy, sell with selected gold cards to minize user's cost for hero minting
 * @note Will only burn cheap selected cards, the rest will be sold to
 *       purchase the cheapest golds on the market and cover minting fee
 */
export const getGoldCardsForHeroMint = async (
  nGolds: number,
  selectedGolds: CartItem[],
  cardsSortedByPrice: PriceAndSupplyWithId[] | null | undefined
): Promise<
  | {
      goldsToSend: { [id: number]: GoldCost }
      goldsToBuyAndSend: { [id: number]: GoldCost }
      goldsToSell: { [id: number]: GoldCost }
    }
  | undefined
> => {
  const goldsToSend: { [id: number]: GoldCost } = {}
  const goldsToBuyAndSend: { [id: number]: GoldCost } = {}
  const goldsToSell: { [id: number]: GoldCost } = {}

  const cheapestGolds = getCheapestGolds(nGolds, cardsSortedByPrice)

  if (!cheapestGolds) {
    throw new Error('Unable to calculate gold discount, no gold prices.')
  }

  const unrollCards = async (
    _orderType: MarketMode,
    cards: { [key: number]: number }
  ) => {
    const availableCards: {
      type: MarketMode
      id: number
      amount: number
      price: number
      cost: number
    }[] = []

    // Reformart arguments
    const ids = Object.keys(cards)
      .map((a) => Number(a))
      .map(getGoldID)
    const amounts = Object.values(cards)

    const costs = await getGoldCosts(cards, _orderType)

    if (!costs) return

    ids.forEach((id, idx) => {
      const amount = amounts[idx] * 100
      const cost = Number(costs[id])
      const price = cost / amount
      availableCards.push({ type: _orderType, id, amount, price, cost })
    })
    return availableCards
  }

  // Get prices and costs for golds to buy and selected golds
  const cheapestPrices = await unrollCards(SwapType.BUY, cheapestGolds)

  if (!cheapestPrices) return

  const selectedGoldsToUnroll = selectedGolds.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.tokenId]: curr.amount
    }),
    {} as { [key: number]: number }
  )

  const selectedPrices = await unrollCards(SwapType.SELL, selectedGoldsToUnroll)

  if (!selectedPrices) return

  // Sort all available cards by price
  const availableGolds = cheapestPrices
    .concat(selectedPrices)
    .sort((a, b) => a.price - b.price)

  // Get list of cards that will be sold, purchased and sent
  let goldsCounter = nGolds * 100

  availableGolds.forEach((g) => {
    if (goldsCounter > 0 && g.amount <= goldsCounter) {
      if (g.type === SwapType.SELL) {
        // Selected gold is cheap, we burn it
        goldsToSend[g.id] = { amount: g.amount, cost: g.cost }
      } else {
        // To buy gold card is cheap, we buy it
        goldsToBuyAndSend[g.id] = { amount: g.amount, cost: g.cost }
      }
      goldsCounter -= g.amount
    } else {
      if (g.type === SwapType.SELL) {
        // We have enough golds, we sell this one
        goldsToSell[g.id] = { amount: g.amount, cost: g.cost }
      } else if (
        g.type === SwapType.BUY &&
        goldsCounter < g.amount &&
        goldsCounter > 0
      ) {
        // We buy only what is needed
        goldsToBuyAndSend[g.id] = { amount: goldsCounter, cost: g.cost }
        goldsCounter = 0
      }
    }
  })

  return { goldsToSell, goldsToBuyAndSend, goldsToSend }
}
