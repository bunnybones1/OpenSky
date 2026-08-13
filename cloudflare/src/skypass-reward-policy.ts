import cardLibrary from './generated/card-library.json'
import { STARTER_DECKS } from './starter-decks'

export const SKYPASS_REWARD_POLICY_VERSION = 1
export const SKYPASS_REWARD_POLICY_HASH =
  'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb'

export const SKYPASS_SUPPORTED_REWARD_ITEM_TYPES = [
  300, // SW_BASE_CARDS
  302, // SW_TITLES
  303, // SW_STICKER_POINTS
  401, // SW_SILVER_CARDS
  403, // SW_CONQUEST_TICKET
  405, // SW_STICKERS
  407, // SW_CARD_BACKS
  500 // SW_HERO
] as const

export const skypassRewardPolicyMaterial = () => ({
  contract: 'cloud-weasel-offchain-skypass-v1',
  sourceItemTypes: [
    'SW_HERO',
    'SW_BASE_CARDS',
    'SW_CONQUEST_TICKET',
    'SW_STICKERS',
    'SW_STICKER_POINTS',
    'SW_SILVER_CARDS',
    'SW_CARD_BACKS',
    'SW_TITLES'
  ],
  cardCatalog: cardLibrary.cards.map(card => [
    card.id,
    card.set,
    card.validFromSeason
  ]),
  starterDecks: STARTER_DECKS.map(deck => [
    deck.key,
    deck.heroId,
    deck.hero,
    deck.deckClass,
    deck.cardIds
  ]),
  baseCards:
    'explicit generated season-valid nonexcluded unowned card, otherwise first ordered season-valid configured-set nonexcluded unowned card',
  silverCards:
    'explicit generated-card ID or fnv1a32(userId:rewardId:index) modulo ordered season-valid configured-set nonexcluded pool',
  inventory: {
    SW_BASE_CARDS: ['SW_BASE_CARDS', 'card-id', 'nonstackable'],
    SW_HERO: ['SW_HERO', 'hero-id', 'nonstackable-with-starter-deck'],
    SW_CONQUEST_TICKET: ['SW_CONQUEST_TICKET', 2, 'stackable'],
    SW_STICKERS: ['SW_STICKERS', 'token-id', 'stackable'],
    SW_STICKER_POINTS: ['SW_STICKER_POINTS', 0, 'stackable'],
    SW_SILVER_CARDS: ['SW_SILVER_CARDS', 'card-id', 'stackable'],
    SW_CARD_BACKS: ['SW_CARD_BACKS', 'token-id', 'stackable'],
    SW_TITLES: ['SW_TITLES', 'token-id', 'nonstackable']
  },
  chainEffects: 'none; every source mint queue is identity-owned D1 inventory',
  claims: 'active exact-policy rows only; immutable exactly-once receipts'
})

export const calculatedSkypassRewardPolicyHash = async () => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(skypassRewardPolicyMaterial()))
  )
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
