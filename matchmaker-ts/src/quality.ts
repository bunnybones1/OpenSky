import {
  matchmakingScore,
  MatchmakerPlayer,
  playerHero
} from './model'

export interface Factor {
  name: string
  scaler: number
  exponent: number
  value: number
}

export type FactorCalculator = (
  player1: MatchmakerPlayer,
  player2: MatchmakerPlayer
) => Factor

export const factor = (
  name: string,
  scaler: number,
  exponent: number,
  value: number
): Factor => ({ name, scaler, exponent, value })

export const factorString = (value: Factor) => `${value.name}: ${value.value}`

export const quality = (...factors: Factor[]): number => {
  const exponent = factors.reduce((sum, current) => sum + current.exponent, 0)
  const product = factors.reduce(
    (result, current) =>
      result * Math.pow(1 + current.scaler * current.value, current.exponent),
    1
  )
  return Math.pow(product, 1 / exponent)
}

export const mmrDifferenceFactor: FactorCalculator = (player1, player2) =>
  factor(
    'MMR Difference',
    0.05,
    5,
    Math.abs(matchmakingScore(player1) - matchmakingScore(player2))
  )

export const sameHeroFactor: FactorCalculator = (player1, player2) =>
  factor('Mirror Match', 5, 1, playerHero(player1) === playerHero(player2) ? 1 : 0)

export const tradableCardsFactor: FactorCalculator = (player1, player2) => {
  if (!player1.cards || !player2.cards) return factor('Tradable cards', 15, -0.5, 0)
  const hasTradableCards = [player1, player2].some((player) =>
    [...(player.cards?.values() ?? [])].some(
      (rarity) => rarity === 'silver' || rarity === 'gold'
    )
  )
  return factor('Tradable cards', 15, -0.5, hasTradableCards ? 0 : 1)
}

export const rematchFactor: FactorCalculator = (player1, player2) => {
  const last1 = player1.recentMatches.at(-1)
  const last2 = player2.recentMatches.at(-1)
  const isRematch =
    Boolean(last1 && last2) &&
    (last1?.opponentId.toLowerCase() === player2.address ||
      last2?.opponentId.toLowerCase() === player1.address)
  return factor('Rematch', 40, 1, isRematch ? 1 : 0)
}

export const defaultFactorCalculators: FactorCalculator[] = [
  mmrDifferenceFactor,
  sameHeroFactor,
  tradableCardsFactor,
  rematchFactor
]

export const calculateMatchQuality = (
  player1: MatchmakerPlayer,
  player2: MatchmakerPlayer,
  calculators: FactorCalculator[] = defaultFactorCalculators
) => quality(...calculators.map((calculator) => calculator(player1, player2)))

export const sortByMatchQuality = (
  player: MatchmakerPlayer,
  candidates: MatchmakerPlayer[],
  calculator = calculateMatchQuality
) => candidates.sort((left, right) => calculator(player, left) - calculator(player, right))
