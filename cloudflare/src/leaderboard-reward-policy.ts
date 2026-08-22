import cardLibrary from './generated/card-library.json'

import { leaderboardRewardsForRank } from './leaderboard-rewards'

export const LEADERBOARD_REWARD_POLICY_VERSION = 1
export const LEADERBOARD_REWARD_POLICY_HASH =
  'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a'

const rewardCards = cardLibrary.cards.filter(
  card => card.set !== 'HEXBOUND_INVASION'
)

export const leaderboardRewardCardIds = (season: number): number[] =>
  rewardCards
    .filter(card => card.validFromSeason <= season)
    .map(card => card.id)

/**
 * Canonical material covered by a leaderboard schedule approval. Changing the
 * rank curve, card pool, inventory mapping, modes, or deterministic draw rule
 * changes this digest and requires a new reviewed policy migration.
 */
export const leaderboardRewardPolicyMaterial = () => ({
  contract: 'cloud-weasel-offchain-leaderboard-v1',
  modes: ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'],
  rewards: Array.from({ length: 500 }, (_, index) =>
    leaderboardRewardsForRank(index + 1)
  ),
  // Preserve generated order: draw modulo indexes into this exact sequence.
  cardPool: rewardCards.map(card => [card.id, card.set, card.validFromSeason]),
  inventory: {
    silver: ['SW_SILVER_CARDS', 'card-id', 1],
    ticket: ['SW_CONQUEST_TICKET', 2, 1]
  },
  draw:
    'sha256(cycle.random_seed:userId:gameMode:index)/uint32be/modulo-pool'
})

export const calculatedLeaderboardRewardPolicyHash = async () => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(leaderboardRewardPolicyMaterial()))
  )
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
