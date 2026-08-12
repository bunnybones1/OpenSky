import type {
  ItemType,
  PaymentProvider,
  PaymentProviderProduct
} from '@opensky/proto'

const TICKET = 'SW_CONQUEST_TICKET' as ItemType
const SKYPASS = 'SW_SKYPASS' as ItemType

const providerProducts: Partial<
  Record<PaymentProvider, Partial<Record<ItemType, readonly string[]>>>
> = {
  GOOGLE_PLAY: {
    [TICKET]: [
      'conquest_tickets_0002',
      'conquest_tickets_0005',
      'conquest_tickets_0009',
      'conquest_tickets_0014',
      'conquest_tickets_0024'
    ],
    [SKYPASS]: ['skypass_0001']
  },
  APPLE_APP_STORE: {
    [TICKET]: [
      'conquest_tickets_0002',
      'conquest_tickets_0005',
      'conquest_tickets_0009',
      'conquest_tickets_0014',
      'conquest_tickets_0024'
    ],
    [SKYPASS]: ['skypass_0001']
  },
  STRIPE: {
    [TICKET]: ['conquest_tickets_0001'],
    [SKYPASS]: ['skypass_0001']
  },
  SEQUENCE: {
    [TICKET]: ['conquest_tickets_0001'],
    [SKYPASS]: ['skypass_0001']
  },
  SAMSUNG_GALAXY_STORE: {
    [TICKET]: [
      'conquest_tickets_0002',
      'conquest_tickets_0005',
      'conquest_tickets_0009',
      'conquest_tickets_0014',
      'conquest_tickets_0024'
    ],
    [SKYPASS]: ['skypass_0001']
  }
}

const quantityFromCode = (code: string): number => {
  const suffix = code.slice(code.lastIndexOf('_') + 1)
  const quantity = Number.parseInt(suffix, 10)
  return Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 65_535
    ? quantity
    : 1
}

export const listPaymentProviderProducts = (
  provider: PaymentProvider,
  itemType?: ItemType
): PaymentProviderProduct[] => {
  const products = providerProducts[provider]
  if (!products) return []
  const itemTypes = itemType
    ? ([itemType] as ItemType[])
    : ([TICKET, SKYPASS] as ItemType[])
  return itemTypes.flatMap(type =>
    (products[type] ?? []).map(code => ({
      provider,
      itemType: type,
      code,
      quantity: quantityFromCode(code)
    }))
  )
}
