import { ItemType, PaymentProvider } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceNullablePaymentProviderProductListWire,
  sourcePaymentProviderProductWire
} from '../src/payment-provider-product-wire'

describe('source payment provider product JSON wire', () => {
  it('emits required enum pointers as explicit null and scalar zero values', () => {
    expect(sourcePaymentProviderProductWire({})).toEqual({
      provider: null,
      itemType: null,
      code: '',
      quantity: 0
    })
  })

  it('preserves a populated source product', () => {
    expect(
      sourcePaymentProviderProductWire({
        provider: PaymentProvider.STRIPE,
        itemType: ItemType.SW_SKYPASS,
        code: 'skypass_0001',
        quantity: 1
      })
    ).toEqual({
      provider: 'STRIPE',
      itemType: 'SW_SKYPASS',
      code: 'skypass_0001',
      quantity: 1
    })
  })

  it('preserves the source nil list output', () => {
    expect(sourceNullablePaymentProviderProductListWire([])).toBeNull()
  })
})
