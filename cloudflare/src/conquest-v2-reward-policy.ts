import cardLibrary from './generated/card-library.json'

export const CONQUEST_V2_REWARD_POLICY_VERSION = 1
export const CONQUEST_V2_REWARD_POLICY_HASH =
  '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab'

export const CONQUEST_V2_TREASURE_TOTAL_POINTS = [
  0, 250, 750, 1_500, 2_500, 3_750, 5_250, 7_000, 9_000, 11_250, 13_750
] as const

export const CONQUEST_V2_TREASURE_TOTAL_WEIGHTS = [
  0, 1, 3.19, 6.9, 12.65, 21.32, 34.29, 53.99, 84.67, 134.32, 218.69
] as const

export const conquestV2SilverCardCount = (
  weightPerSilverCard: number,
  treasureLevel: number
): number =>
  Math.floor(
    Math.fround(
      Math.fround(CONQUEST_V2_TREASURE_TOTAL_WEIGHTS[treasureLevel] ?? 0) *
        Math.fround(weightPerSilverCard)
    )
  )

export const conquestV2RewardCardIds = (
  season: number,
  cardSets: string[]
): number[] => {
  const validCards = cardLibrary.cards.filter(
    card => card.validFromSeason <= season
  )
  const selected = validCards.filter(card => cardSets.includes(card.set))
  // CardIndex.GetRandomCardFromList falls back to all season-valid PLAY cards
  // when every configured-set card is excluded. Preserve that source behavior.
  return (selected.length > 0 ? selected : validCards).map(card => card.id)
}

/**
 * Canonical algorithm covered by every Conquest V2 schedule approval. The
 * schedule row and settings snapshot supply reviewed operational values; this
 * digest pins how those values become exact off-chain rewards.
 */
export const conquestV2RewardPolicyMaterial = () => ({
  contract: 'cloud-weasel-offchain-conquest-v2-v1',
  eventId: 2,
  treasureTotalPoints: CONQUEST_V2_TREASURE_TOTAL_POINTS,
  treasureTotalWeights: CONQUEST_V2_TREASURE_TOTAL_WEIGHTS,
  silverCount: 'floor(float32(float32(weight)*float32(treasureWeight)))',
  cardCatalog: cardLibrary.cards.map(card => [
    card.id,
    card.set,
    card.validFromSeason
  ]),
  cardSelection:
    'configured sets intersect season-valid cards; fallback all season-valid cards',
  inventory: ['SW_SILVER_CARDS', 'card-id', 1],
  draw:
    'sha256(cycle.random_seed:userId:index)/uint32be/modulo-frozen-pool',
  legacyUsdc: 'audit-only; player inventory and notification value are zero'
})

export const calculatedConquestV2RewardPolicyHash = async () => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(conquestV2RewardPolicyMaterial()))
  )
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
