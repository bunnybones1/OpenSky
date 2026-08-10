/*
0x00 (2^16*1 + card ID): Silver cards 
0x01 (2^16*2 + card ID): Gold cards
0xfe (2^16*254 + card ID): Miscallenous assets (e.g. Conquest entry tickets)
*/

import { ItemType } from '@opensky/proto'

// Will return the "raw" id of a card, i.e. without the type byte
export function getUngradedID(id: string | number) {
  if (typeof id === 'string') {
    return parseInt(id) & 0x00ffff
  } else {
    return id & 0x00ffff
  }
}

// Will return the type byte of a card id
export function getGrade(id: string | number): number {
  return (parseInt(`${id}`) & 0xff0000) >> 16
}

// Will try to return the item type
export function getItemType(id: string | number) {
  switch (getGrade(id)) {
    case 0x01:
      return ItemType.SW_SILVER_CARDS
    case 0x02:
      return ItemType.SW_GOLD_CARDS
    case 0x03:
      return ItemType.SW_HERO_SKINS
    case 0x04: 
      return ItemType.SW_CRYSTALS
    case 0x05:
      return ItemType.SW_STICKERS
    case 0x06:
      return ItemType.SW_CARD_BACKS
    case 0xfe:
      return ItemType.SW_CONQUEST_TICKET
    case 0xff:
      return ItemType.SW_BASE_CARDS
    default:
      return ItemType.UNKNOWN
  }
}

export function isCardItemType(id: string | number) {
  switch (getGrade(id)) {
    case 0x01:
      return true
    case 0x02:
      return true
    case 0xff:
      return true
    default:
      return false
  }
}

export function isItemTypeAMarketCard(x: ItemType): x is ItemType.SW_SILVER_CARDS | ItemType.SW_GOLD_CARDS {
  switch(x) {
    case ItemType.SW_SILVER_CARDS:
      return true
    case ItemType.SW_GOLD_CARDS:
      return true
    default:
      return false
    } 
}

export function isItemTypeACard(x: ItemType): x is ItemType.SW_SILVER_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_BASE_CARDS {
  switch(x) {
    case ItemType.SW_BASE_CARDS:
      return true
    case ItemType.SW_SILVER_CARDS:
      return true
    case ItemType.SW_GOLD_CARDS:
      return true
    default:
      return false
    } 
}

export function isItemTypeASticker(itemType: ItemType) {
  switch(itemType) {
   case ItemType.SW_STICKERS:
     return true
   default:
     return false
   } 
 }

 export function isItemTypeAHeroSkin(itemType: ItemType) {
  switch(itemType) {
   case ItemType.SW_HERO_SKINS:
     return true
   default:
     return false
   } 
 }

 export function isItemTypeACardBack(itemType: ItemType) {
  switch(itemType) {
   case ItemType.SW_CARD_BACKS:
     return true
   default:
     return false
   } 
 }

export function getGradedID(id: string | number, grade: ItemType | undefined) {
  switch (grade) {
    case ItemType.SW_BASE_CARDS:
      return getBaseID(id)
    case ItemType.SW_SILVER_CARDS:
      return getSilverID(id)
    case ItemType.SW_GOLD_CARDS:
      return getGoldID(id)
    default:
      return getUngradedID(id)
  }
}

// Will return the full id for the Base version of a card
export function getBaseID(id: string | number) {
  return getUngradedID(id) + (255 << 16)
}

// Will return the full id for the Silver version of a card
export function getSilverID(id: string | number) {
  return getUngradedID(id) + (1 << 16)
}

// Will return the full id for the Gold version of a card
export function getGoldID(id: string | number) {
  return getUngradedID(id) + (2 << 16)
}

// Will return the full id for Legacy Hero Skins 
export function getLegacyHeroID(id: string | number) {
  return getUngradedID(id) + (3 << 16)
}

// Will return the full id for crystals
export function getCrystalID(id: number) {
  return getUngradedID(id) + (4 << 16)
}

// Will return the full id for Stickers
export function getStickerID(id: number) {
  return getUngradedID(id) + (5 << 16)
}

// Will return the full id for Stickers
export function getCardBackID(id: number) {
  return getUngradedID(id) + (6 << 16)
}