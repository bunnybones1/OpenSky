import { ItemType } from '~/lib/proto'

export const CARD_TYPES = [ItemType.SW_BASE_CARDS, ItemType.SW_SILVER_CARDS]

export const TRADABLE_REWARDS_LIMITED = [ItemType.SW_CARD_BACKS, ItemType.SW_STICKERS]
export const TRADABLE_REWARDS = [ItemType.SW_SILVER_CARDS]
export const SKYPASS_SCALING_CONSTANT = 0.78

export const claimRewardImageSize = [
  `100vh`,
  `100vh`,
  `calc(100vh - 54px)`,
  `calc(100vh - 54px)`,
  `calc(100vh - 54px)`
]
