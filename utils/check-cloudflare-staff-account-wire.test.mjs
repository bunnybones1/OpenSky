import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { staffAccountWireErrors } from './check-cloudflare-staff-account-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/gamemaster.go',
  'cloudflare/src/staff-account-wire.ts',
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

const errorsFor = value => staffAccountWireErrors(...Object.values(value))

test('derives and enforces staff account/stat wires from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects field, pointer, privacy, list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => {
    assert.ok(value[file].includes(from), `missing mutation fixture: ${from}`)
    return { ...value, [file]: value[file].replace(from, to) }
  }
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'CreatedAt *time.Time  `json:"createdAt"',
      'CreatedAt time.Time   `json:"createdAt"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'AccountID AccountID   `json:"-"',
      'AccountID AccountID   `json:"accountID"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Account           *Account            `json:"account"',
      'Account           Account             `json:"account"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'TotalFlaggedUsers   uint64 `json:"total_flagged_users"',
      'TotalFlaggedUsers   uint64 `json:"totalFlaggedUsers"'
    ),
    mutate(
      'api/rpc/gamemaster.go',
      'results := make([]*proto.GMAccount, len(accounts))',
      'var results []*proto.GMAccount'
    ),
    mutate(
      'api/rpc/gamemaster.go',
      'res.IpHistory = ipMap[res.Account.ID]',
      'res.IpHistory = []*proto.IPAddressHistory{}'
    ),
    mutate(
      'api/rpc/gamemaster.go',
      'statsResponse.TotalVIPUsers = stat.Count',
      'statsResponse.TotalVIPUsers = 0'
    ),
    mutate(
      'cloudflare/src/staff-account-wire.ts',
      'createdAt: history.createdAt ?? null',
      "createdAt: history.createdAt ?? ''"
    ),
    mutate(
      'cloudflare/src/staff-account-wire.ts',
      'histories == null ? null : sourceIPAddressHistoryListWire(histories)',
      'sourceIPAddressHistoryListWire(histories ?? [])'
    ),
    mutate(
      'cloudflare/src/staff-account-wire.ts',
      'result.account == null ? null : sourceAccountWire(result.account)',
      'sourceAccountWire(result.account!)'
    ),
    mutate(
      'cloudflare/src/staff-account-wire.ts',
      'total_banned_users: stats.total_banned_users ?? 0',
      'total_banned_users: stats.total_active_users ?? 0'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'stats: sourceGMStatsWire(await staff.stats())',
      'stats: await staff.stats()'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'const accounts = sourceGMAccountListWire(',
      'const accounts = ('
    ),
    mutate('cloudflare/src/api.ts', 'ipHistory: null', 'ipHistory: []'),
    mutate('package.json', 'pnpm check:cloudflare:staff-account-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
