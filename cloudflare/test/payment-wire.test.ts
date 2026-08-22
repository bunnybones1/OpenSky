import { PaymentProvider, PaymentStatus } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourcePaymentListWire,
  sourcePaymentLogListWire,
  sourcePaymentLogWire,
  sourcePaymentWire
} from '../src/payment-wire'

describe('source payment JSON wire', () => {
  it('emits every required Payment field and explicit pointer null', () => {
    expect(sourcePaymentWire({})).toEqual({
      id: 0,
      accountID: 0,
      status: null,
      provider: null,
      externalTxnID: '',
      createdAt: null
    })
  })

  it('preserves a populated row without the private cursor', () => {
    expect(
      sourcePaymentWire({
        id: 7,
        accountID: 11,
        status: PaymentStatus.SUCCEEDED,
        provider: PaymentProvider.STRIPE,
        externalTxnID: 'cs_test_1',
        createdAt: '2026-08-15T00:00:00.000Z'
      })
    ).toEqual({
      id: 7,
      accountID: 11,
      status: 'SUCCEEDED',
      provider: 'STRIPE',
      externalTxnID: 'cs_test_1',
      createdAt: '2026-08-15T00:00:00.000Z'
    })
  })

  it('emits required PaymentLog pointers and nested data zero values', () => {
    expect(sourcePaymentLogWire({})).toEqual({
      id: 0,
      paymentID: 0,
      data: null,
      createdAt: null
    })
    expect(sourcePaymentLogWire({ data: {} })).toEqual({
      id: 0,
      paymentID: 0,
      data: { type: '', data: null },
      createdAt: null
    })
  })

  it('preserves populated logs and source make-backed empty lists', () => {
    expect(
      sourcePaymentLogListWire([
        {
          id: 3,
          paymentID: 7,
          data: { type: 'payments.IntentRequest', data: { quantity: 1 } },
          createdAt: '2026-08-15T00:00:00.000Z'
        }
      ])
    ).toEqual([
      {
        id: 3,
        paymentID: 7,
        data: { type: 'payments.IntentRequest', data: { quantity: 1 } },
        createdAt: '2026-08-15T00:00:00.000Z'
      }
    ])
    expect(sourcePaymentListWire([])).toEqual([])
    expect(sourcePaymentLogListWire([])).toEqual([])
  })
})
