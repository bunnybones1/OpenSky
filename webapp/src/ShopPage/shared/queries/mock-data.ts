import { ItemType } from '@opensky/proto'

interface ShopItem {
  price: number
  priceItemType: ItemType
  expiration: string
  isSoldOut: boolean
  isClaimed: boolean
  isClaimable?: boolean
  saleAmount?: number
  valueAmount?: number
  id: string
  originalPrice?: number
}

type ShopItems = { id: string; itemType: ItemType; items: ShopItem[] }[]

const expDate = new Date(new Date().getTime() + 86400000).toISOString()

export const MOCK_SHOP_ITEMS: ShopItems = [
  {
    id: 'ONE',
    itemType: ItemType.SW_BASE_CARDS,
    items: [
      {
        price: 0.99,
        priceItemType: ItemType.USDC,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: false,
        valueAmount: 1184,
        originalPrice: 9.99,
        id: '1'
      }
    ]
  },
  {
    id: 'TWO',
    itemType: ItemType.SW_SILVER_CARDS,
    items: [
      {
        price: 100,
        priceItemType: ItemType.SW_CRYSTALS,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: true,
        saleAmount: 50,
        id: '2'
      },
      {
        price: 100,
        originalPrice: 150,
        priceItemType: ItemType.SW_CRYSTALS,
        expiration: expDate,
        isSoldOut: true,
        isClaimed: false,
        saleAmount: 99,
        id: '3'
      },
      {
        price: 100,
        originalPrice: 999.99,
        priceItemType: ItemType.SW_CRYSTALS,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: false,
        saleAmount: 50,
        id: '4'
      }
    ]
  },
  {
    id: 'THREE',
    itemType: ItemType.SW_GOLD_CARDS,
    items: [
      {
        price: 100,
        priceItemType: ItemType.USDC,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: false,
        valueAmount: 1184,
        id: '6'
      }
    ]
  },
  {
    id: 'FOUR',
    itemType: ItemType.USDC,
    items: [
      {
        price: 100,
        priceItemType: ItemType.USDC,
        expiration: expDate,
        isSoldOut: true,
        isClaimed: false,
        id: '7'
      },
      {
        price: 100,
        priceItemType: ItemType.USDC,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: false,
        isClaimable: true,
        saleAmount: 50,
        id: '8'
      },
      {
        price: 100,
        priceItemType: ItemType.USDC,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: true,
        isClaimable: true,
        id: '9'
      }
    ]
  },
  {
    id: 'FIVE',
    itemType: ItemType.SW_CARD_BACKS,
    items: [
      {
        price: 100,
        originalPrice: 299.99,
        priceItemType: ItemType.USDC,
        expiration: expDate,
        isSoldOut: false,
        isClaimed: false,
        valueAmount: 200,
        id: '10'
      }
    ]
  }
]
