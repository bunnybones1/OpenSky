import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { appDevKeyWireErrors } from './check-cloudflare-app-dev-key-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/app_dev_keys.go',
  'cloudflare/src/app-dev-key-wire.ts',
  'cloudflare/src/app-dev-keys.ts',
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

const errorsFor = value => appDevKeyWireErrors(...Object.values(value))

test('derives and enforces AppDevKey wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects pointer, privacy, list, repository, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => {
    assert.ok(value[file].includes(from), `missing mutation fixture: ${from}`)
    return { ...value, [file]: value[file].replace(from, to) }
  }
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'CreatedBy *AccountID `json:"createdBy"',
      'CreatedBy *AccountID `json:"createdBy,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'UpdatedBy *AccountID `json:"updatedBy"',
      'UpdatedBy *AccountID `json:"updatedBy,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'UpdatedAt *time.Time `json:"updatedAt" db:"updated_at,omitempty"`\n\tCursor    string     `json:"-"',
      'UpdatedAt *time.Time `json:"updatedAt" db:"updated_at,omitempty"`\n\tCursor    string     `json:"cursor"'
    ),
    mutate(
      'api/rpc/app_dev_keys.go',
      'results := []*proto.AppDevKey{}',
      'var results []*proto.AppDevKey'
    ),
    mutate(
      'cloudflare/src/app-dev-key-wire.ts',
      'updatedBy: appDevKey.updatedBy ?? null',
      'updatedBy: appDevKey.updatedBy'
    ),
    mutate(
      'cloudflare/src/app-dev-key-wire.ts',
      'createdAt: appDevKey.createdAt ?? null',
      'createdAt: appDevKey.createdAt'
    ),
    mutate(
      'cloudflare/src/app-dev-keys.ts',
      'sourceAppDevKeyWire(appDevKeyInput(row))',
      'appDevKeyInput(row) as AppDevKey'
    ),
    mutate(
      'cloudflare/src/app-dev-keys.ts',
      'data: sourceAppDevKeyListWire(selected.map(appDevKeyInput))',
      'data: selected.map(present)'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'await appDevKeys.create(principal.userId, body.req)',
      'await appDevKeys.createSparse(principal.userId, body.req)'
    ),
    mutate('package.json', 'pnpm check:cloudflare:app-dev-key-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
