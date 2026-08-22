import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { accountActionWireErrors } from './check-cloudflare-account-action-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/admin_ban_tools.go',
  'api/rpc/gamemaster.go',
  'cloudflare/src/account-action-wire.ts',
  'cloudflare/src/account-signal-wire.ts',
  'cloudflare/src/staff-account-wire.ts',
  'cloudflare/src/account-actions.ts',
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

const errorsFor = value => accountActionWireErrors(...Object.values(value))

test('derives and enforces AccountAction wire from Go source', async () => {
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
      'ExpiresAt      *time.Time `json:"expiresAt"',
      'ExpiresAt      time.Time  `json:"expiresAt"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'CreatedBy      *AccountID `json:"createdBy"',
      'CreatedBy      *AccountID `json:"createdBy,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'ActionType_MOD_VET                 ActionType = 10',
      'ActionType_MOD_TRUST               ActionType = 10'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'results := []*proto.AccountAction{}',
      'var results []*proto.AccountAction'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'res.AccountActions = actionMap[res.AccountID]',
      'res.AccountActions = []*proto.AccountAction{}'
    ),
    mutate(
      'api/rpc/gamemaster.go',
      'res.AccountActions = actionMap[res.Account.ID]',
      'res.AccountActions = []*proto.AccountAction{}'
    ),
    mutate(
      'cloudflare/src/account-action-wire.ts',
      'createdBy: action.createdBy ?? null',
      'createdBy: action.createdBy'
    ),
    mutate(
      'cloudflare/src/account-action-wire.ts',
      'actions == null ? null : sourceAccountActionListWire(actions)',
      'sourceAccountActionListWire(actions ?? [])'
    ),
    mutate(
      'cloudflare/src/account-actions.ts',
      'sourceAccountActionWire(accountActionInput(row))',
      'accountActionInput(row) as AccountAction'
    ),
    mutate(
      'cloudflare/src/account-signal-wire.ts',
      'sourceNullableAccountActionListWire(',
      'sourceAccountActionListWire('
    ),
    mutate(
      'cloudflare/src/staff-account-wire.ts',
      'sourceNullableAccountActionListWire(',
      'sourceAccountActionListWire('
    ),
    mutate(
      'cloudflare/src/api.ts',
      'accountActions: result.actions',
      'accountActions: []'
    ),
    mutate('package.json', 'pnpm check:cloudflare:account-action-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
