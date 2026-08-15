import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { accountStatWireErrors } from './check-cloudflare-account-stat-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/accounts.go',
      'api/rpc/accounts_integration_test.go',
      'api/data/account_stats_store.go',
      'api/rpc/leaderboard.go',
      'cloudflare/src/account-stat-wire.ts',
      'cloudflare/src/competitive.ts',
      'cloudflare/src/api.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    accountRPCSource: values[1],
    accountRPCIntegrationSource: values[2],
    accountStoreSource: values[3],
    leaderboardSource: values[4],
    accountStatWire: values[5],
    competitive: values[6],
    api: values[7]
  }
}

const errorsFor = value => accountStatWireErrors(...Object.values(value))

test('derives and enforces the complete public Go AccountStat wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse nulls, leaks, and projection bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Experience              *uint64         `json:"experience"',
        'Experience              uint64          `json:"experience"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Score                   *int32          `json:"score"',
        'Score                   *int32          `json:"score,omitempty"'
      )
    },
    {
      ...value,
      accountRPCSource: value.accountRPCSource.replace(
        'InternalPlayerRankState = &constructedStats[i].PlayerRankState',
        'InternalPlayerRankState = nil'
      )
    },
    {
      ...value,
      accountRPCIntegrationSource: value.accountRPCIntegrationSource.replace(
        'assert.Nil(t, r.Stats.RankedConstructed.InternalPlayerRankState)',
        'assert.NotNil(t, r.Stats.RankedConstructed.InternalPlayerRankState)'
      )
    },
    {
      ...value,
      accountStoreSource: value.accountStoreSource.replace(
        'Status:          proto.AccountStatus_ACTIVE,',
        'Score:           new(int32),\n\t\t\t\t\tStatus: proto.AccountStatus_ACTIVE,'
      )
    },
    {
      ...value,
      leaderboardSource: value.leaderboardSource.replace(
        'Select("st.*")',
        'Select("st.*, rank")'
      )
    },
    {
      ...value,
      accountStatWire: value.accountStatWire.replace(
        'score: stat.score ?? null',
        'score: stat.score'
      )
    },
    {
      ...value,
      accountStatWire: value.accountStatWire.replace(
        'stat.playerRankState !== undefined',
        'false'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'winStreak: row.win_streak,',
        'playerRankState: row.player_rank_state,\n    winStreak: row.win_streak,'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        "...(projection === 'account' ? { experience } : {}),",
        'experience,'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'experience,\n    rankProgress:',
        'experience,\n    score: 0,\n    rankProgress:'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        "accountStat: statFromRow(row, 'leaderboard')",
        'accountStat: statFromRow(row)'
      )
    },
    {
      ...value,
      api: value.api.replace("case 'GetAccountStats':", "case 'OldStats':")
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
