import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { paymentProductWireErrors } from './check-cloudflare-payment-product-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/data/payment_provider_product.go',
  'api/rpc/payments.go',
  'cloudflare/src/payment-provider-products.ts',
  'cloudflare/src/payment-provider-product-wire.ts',
  'cloudflare/src/api.ts',
  'package.json'
]

const fixtures = async () => {
  const values = await Promise.all(
    fixtureFiles.map(file => readFile(file, 'utf8'))
  )
  return Object.fromEntries(
    fixtureFiles.map((file, index) => [file, values[index]])
  )
}

const errorsFor = value => paymentProductWireErrors(...Object.values(value))

test('derives and enforces the complete payment product wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects enum, catalog, pointer, quantity, nil-list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Provider *PaymentProvider',
      'Provider PaymentProvider'
    ),
    mutate(
      'api/proto/api.gen.go',
      'ItemType *ItemType        `json:"itemType"`',
      'ItemType *ItemType        `json:"itemType,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'PaymentProvider_STRIPE               PaymentProvider = 3',
      'PaymentProvider_CARD                 PaymentProvider = 3'
    ),
    mutate(
      'api/proto/api.gen.go',
      'ItemType_SW_SKYPASS         ItemType = 301',
      'ItemType_SW_PASS            ItemType = 301'
    ),
    mutate(
      'api/data/payment_provider_product.go',
      '"conquest_tickets_0001": nil',
      '"conquest_tickets_0003": nil'
    ),
    mutate(
      'cloudflare/src/payment-provider-products.ts',
      "[TICKET]: ['conquest_tickets_0001']",
      "[TICKET]: ['conquest_tickets_0003']"
    ),
    mutate(
      'api/data/payment_provider_product.go',
      'index := strings.LastIndex(code, "_")',
      'index := strings.Index(code, "_")'
    ),
    mutate(
      'api/rpc/payments.go',
      'var result []*proto.PaymentProviderProduct',
      'result := make([]*proto.PaymentProviderProduct, 0)'
    ),
    mutate(
      'cloudflare/src/payment-provider-product-wire.ts',
      'provider: product.provider ?? null',
      'provider: product.provider'
    ),
    mutate(
      'cloudflare/src/payment-provider-product-wire.ts',
      'itemType: product.itemType ?? null',
      'itemType: product.itemType'
    ),
    mutate(
      'cloudflare/src/payment-provider-product-wire.ts',
      'products.length ? products.map(sourcePaymentProviderProductWire) : null',
      'products.map(sourcePaymentProviderProductWire)'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'products: sourceNullablePaymentProviderProductListWire(',
      'products: ('
    ),
    mutate(
      'cloudflare/src/payment-provider-products.ts',
      "code.lastIndexOf('_') + 1",
      "code.indexOf('_') + 1"
    ),
    mutate('package.json', 'pnpm check:cloudflare:payment-product-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
