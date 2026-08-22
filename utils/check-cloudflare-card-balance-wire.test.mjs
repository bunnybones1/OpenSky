import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cardBalanceWireErrors } from './check-cloudflare-card-balance-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/cards.go',
      'cloudflare/src/card-balance-wire.ts',
      'cloudflare/src/card-library.ts',
      'cloudflare/src/api.ts',
      'cloudflare/src/player-rpc.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    cardsRPCSource: values[1],
    cardBalanceWire: values[2],
    cardLibrary: values[3],
    api: values[4],
    playerRPC: values[5]
  }
}

const errorsFor = value => cardBalanceWireErrors(...Object.values(value))

test('derives and enforces the complete nested card-balance Go wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse nulls, leaks, and projection bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Card          *Card                    `json:"card"',
        'Card          Card                     `json:"card"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'BalanceByType map[string]*BalanceTuple `json:"balanceByType"',
        'BalanceByType map[string]*BalanceTuple `json:"balanceByType,omitempty"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Cursor        string                   `json:"-"',
        'Cursor        string                   `json:"cursor"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Balance prototyp.BigInt `json:"balance"',
        'Balance uint64          `json:"balance"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'IsNew   *bool           `json:"isNew"',
        'IsNew   bool            `json:"isNew"'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'if includeBalances && accountID.IsValid()',
        'if includeBalances'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'db.Gte(proto.ItemType_SW_BASE_CARDS)',
        'db.Gte(proto.ItemType_SW_SILVER_CARDS)'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'c.BalanceByType = map[string]*proto.BalanceTuple{}',
        'c.BalanceByType = nil'
      )
    },
    {
      ...value,
      cardBalanceWire: value.cardBalanceWire.replace(
        'isNew: tuple.isNew ?? null',
        'isNew: tuple.isNew'
      )
    },
    {
      ...value,
      cardBalanceWire: value.cardBalanceWire.replace(
        'card: entry.card == null ? null : sourceCardWire(entry.card)',
        'card: entry.card'
      )
    },
    {
      ...value,
      cardBalanceWire: value.cardBalanceWire.replace(
        'entry.balanceByType == null',
        'false'
      )
    },
    {
      ...value,
      cardLibrary: value.cardLibrary.replace(
        'const exposesBalances = includeBalances && hasAccount',
        'const exposesBalances = includeBalances'
      )
    },
    {
      ...value,
      cardLibrary: value.cardLibrary.replace("  'SW_SKYPASS',\n", '')
    },
    {
      ...value,
      cardLibrary: value.cardLibrary.replace('isNew: null', 'isNew: item.isNew')
    },
    {
      ...value,
      cardLibrary: value.cardLibrary.replace(
        'createdAt: latestCreatedAt || null',
        "createdAt: latestCreatedAt || ''"
      )
    },
    {
      ...value,
      api: value.api.replace(
        'result.res.map(sourceCardWithBalanceWire)',
        'result.res'
      )
    },
    {
      ...value,
      api: value.api.replace(
        "import { sourceCardWithBalanceWire } from './card-balance-wire'",
        ''
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'WHERE item.user_id = ? AND item.balance > 0\n         ORDER BY item.token_id ASC, item.item_type ASC',
        "WHERE item.user_id = ? AND item.balance > 0\n           AND item.item_type IN ('SW_BASE_CARDS')\n         ORDER BY item.token_id ASC, item.item_type ASC"
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
