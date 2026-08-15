import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { accountWireErrors } from './check-cloudflare-account-wire.mjs'

const fixtures = async () => {
  const [
    source,
    authSource,
    integrationSource,
    crystalSource,
    accountWire,
    accounts,
    player,
    competitive,
    competitiveWire,
    api,
    authTest
  ] = await Promise.all([
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('api/rpc/auth.go', 'utf8'),
    readFile('api/rpc/accounts_integration_test.go', 'utf8'),
    readFile('api/data/crystal.go', 'utf8'),
    readFile('cloudflare/src/account-wire.ts', 'utf8'),
    readFile('cloudflare/src/accounts.ts', 'utf8'),
    readFile('cloudflare/src/player-rpc.ts', 'utf8'),
    readFile('cloudflare/src/competitive.ts', 'utf8'),
    readFile('cloudflare/src/competitive-wire.ts', 'utf8'),
    readFile('cloudflare/src/api.ts', 'utf8'),
    readFile('cloudflare/test/auth-api.test.ts', 'utf8')
  ])
  return {
    source,
    authSource,
    integrationSource,
    crystalSource,
    accountWire,
    accounts,
    player,
    competitive,
    competitiveWire,
    api,
    authTest
  }
}

const errorsFor = value =>
  accountWireErrors(
    value.source,
    value.authSource,
    value.integrationSource,
    value.crystalSource,
    value.accountWire,
    value.accounts,
    value.player,
    value.competitive,
    value.competitiveWire,
    value.api,
    value.authTest
  )

test('derives and enforces the complete Go Account JSON wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse nulls, and bypassed projections', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        'Settings        *AccountSettingsWrapper `json:"settings" db:"-"`',
        'Settings        *AccountSettingsWrapper `json:"settings,omitempty" db:"-"`'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'Ret3 *Account `json:"account"`',
        'Ret3 *Account `json:"account,omitempty"`'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'Ret1 *Account `json:"account"`',
        'Ret1 *Account `json:"account,omitempty"`'
      )
    },
    {
      ...value,
      authSource: value.authSource.replace(
        'return walletAddress, respAccount, nil',
        'return walletAddress, nil, nil'
      )
    },
    {
      ...value,
      integrationSource: value.integrationSource.replace(
        'assert.Nil(t, account)',
        'assert.NotNil(t, account)'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'IsBurnerWallet  *bool',
        'IsBurnerWallet  bool '
      )
    },
    {
      ...value,
      source: value.source.replace(
        'HidePlayerNames        *bool      `json:"hidePlayerNames,omitempty"',
        'HidePlayerNames        *bool      `json:"hidePlayerNames"'
      )
    },
    {
      ...value,
      crystalSource: value.crystalSource.replace('\t7: 1,', '\t7: 9,')
    },
    {
      ...value,
      accountWire: value.accountWire.replace(
        'settings: account.settings ?? null',
        ''
      )
    },
    {
      ...value,
      accountWire: value.accountWire.replace('crystal.balance > 0', '1 = 1')
    },
    {
      ...value,
      accounts: value.accounts.replace('sourceAccountWire({', '({')
    },
    {
      ...value,
      player: value.player.replace("sourceCrystalIDSQL('u.id')", 'NULL')
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'return sourceLeaderboardEntryWire({',
        'return ({'
      )
    },
    {
      ...value,
      competitiveWire: value.competitiveWire.replace(
        'account: value.account ? sourceAccountWire(value.account) : null',
        'account: value.account ?? null'
      )
    },
    {
      ...value,
      api: value.api.replace("case 'ListLeaderboard':", "case 'OldBoard':")
    },
    {
      ...value,
      api: value.api.replace('account: account ?? null', '')
    },
    {
      ...value,
      api: value.api.replace(
        'account: account ?? null,\n          ...(principal.kind',
        '...(principal.kind'
      )
    },
    {
      ...value,
      authTest: value.authTest.replace(
        'expect(body).toMatchObject({ status: true, address, account: null })',
        'expect(body).toMatchObject({ status: true, address })'
      )
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
