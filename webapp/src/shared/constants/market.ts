import { ItemType } from '@opensky/proto'

export const CONQUEST_TICKET_UNIT_PRICE = 1.5 // 1.5 USDC
export const MAX_ITEMS_IN_CART = 400
export const GOLD_CARDS_PER_HERO_SKIN = 10 // 10 golds per skin minted
export const FRONTEND_FEE_PERCENTAGE = 2
export const ROYALTY_FEE_PERCENTAGE = 4 // Royalty fee for SW assets
export const LP_FEE_PERCENTAGE = 1.5 // LP fee percentage
export const SLIPPAGE_PERCENTAGE = 2
export const TRADABLE_TICKET_ID = 1
export const NON_TRADABLE_TICKET_ID = 2
export const CONQUEST_TICKET_OFFSET = (1 << 16) * 254 + 1 // 16646145

export const VALID_MARKET_ITEM_TYPES: ItemType[] = [
  ItemType.SW_SILVER_CARDS,
  ItemType.SW_GOLD_CARDS,
  ItemType.SW_BASE_CARDS,
  ItemType.SW_STICKERS,
  ItemType.SW_HERO_SKINS,
  ItemType.SW_CARD_BACKS
]
