import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { paymentWireErrors } from './check-cloudflare-payment-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/proto/types.go',
  'api/rpc/payments.go',
  'cloudflare/src/payment-wire.ts',
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

const errorsFor = value => paymentWireErrors(...Object.values(value))

test('derives and enforces payment wires from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects enum, pointer, privacy, list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => {
    assert.ok(value[file].includes(from), `missing mutation fixture: ${from}`)
    return { ...value, [file]: value[file].replace(from, to) }
  }
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Status        *PaymentStatus',
      'Status        PaymentStatus'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Provider      *PaymentProvider `json:"provider"',
      'Provider      *PaymentProvider `json:"provider,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Cursor        string           `json:"-"',
      'Cursor        string           `json:"cursor"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Data      *PaymentLogData `json:"data"',
      'Data      *PaymentLogData `json:"data,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'PaymentStatus_FAILED    PaymentStatus = 3',
      'PaymentStatus_DECLINED  PaymentStatus = 3'
    ),
    mutate(
      'api/proto/api.gen.go',
      'PaymentProvider_SEQUENCE             PaymentProvider = 4',
      'PaymentProvider_WALLET               PaymentProvider = 4'
    ),
    mutate(
      'api/proto/types.go',
      'Data json.RawMessage `json:"data"`',
      'Data string          `json:"data"`'
    ),
    mutate(
      'api/rpc/payments.go',
      'paymentsProto := make([]*proto.Payment, len(payments))',
      'var paymentsProto []*proto.Payment'
    ),
    mutate(
      'api/rpc/payments.go',
      'paymentLogsProto := make([]*proto.PaymentLog, len(paymentLogs))',
      'var paymentLogsProto []*proto.PaymentLog'
    ),
    mutate(
      'cloudflare/src/payment-wire.ts',
      'status: payment.status ?? null',
      'status: payment.status'
    ),
    mutate(
      'cloudflare/src/payment-wire.ts',
      'data: data.data ?? null',
      'data: data.data'
    ),
    mutate(
      'cloudflare/src/payment-wire.ts',
      'payments.map(sourcePaymentWire)',
      'payments as Payment[]'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'payments: sourcePaymentListWire(response.payments)',
      'payments: response.payments'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'logs: sourcePaymentLogListWire(',
      'logs: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:payment-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
