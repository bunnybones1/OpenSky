import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { accountSignalWireErrors } from './check-cloudflare-account-signal-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/admin_ban_tools.go',
  'api/rpc/gamemaster.go',
  'cloudflare/src/account-signal-wire.ts',
  'cloudflare/src/staff.ts',
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

const errorsFor = value => accountSignalWireErrors(...Object.values(value))

test('derives and enforces AccountSignal wires from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects field, enum, float32, privacy, list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => {
    assert.ok(value[file].includes(from), `missing mutation fixture: ${from}`)
    return { ...value, [file]: value[file].replace(from, to) }
  }
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'CreatedAt    *time.Time   `json:"createdAt"',
      'CreatedAt    time.Time    `json:"createdAt"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'SignalData   interface{}  `json:"signalData"',
      'SignalData   interface{}  `json:"signalData,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Score        float32      `json:"score"',
      'Score        float64      `json:"score"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'SignalStatus_NOT_ACTIONABLE SignalStatus = 2',
      'SignalStatus_DISMISSED      SignalStatus = 2'
    ),
    mutate(
      'api/proto/api.gen.go',
      'UpdatedAt      *time.Time       `json:"updatedAt"',
      'UpdatedAt      time.Time        `json:"updatedAt"'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'results := []*data.AccountSignal{}',
      'var results []*data.AccountSignal'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'res.AccountActions = actionMap[res.AccountID]',
      'res.AccountActions = []*proto.AccountAction{}'
    ),
    mutate(
      'api/rpc/gamemaster.go',
      'res.IpHistory = ipMap[res.Account.ID]',
      'res.IpHistory = []*proto.IPAddressHistory{}'
    ),
    mutate(
      'cloudflare/src/account-signal-wire.ts',
      'score: goFloat32(signal.score ?? 0)',
      'score: signal.score ?? 0'
    ),
    mutate(
      'cloudflare/src/account-signal-wire.ts',
      'signalData: signal.signalData ?? null',
      'signalData: signal.signalData ?? {}'
    ),
    mutate(
      'cloudflare/src/account-signal-wire.ts',
      'score: summary.score ?? 0',
      'cursor: summary.score ?? 0'
    ),
    mutate(
      'cloudflare/src/staff.ts',
      'return sourceAccountSignalListWire(',
      'return ('
    ),
    mutate('cloudflare/src/api.ts', 'ipHistory: null', 'ipHistory: []'),
    mutate(
      'cloudflare/src/api.ts',
      'const signals = sourceAccountSignalSummaryListWire(',
      'const signals = ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:account-signal-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
