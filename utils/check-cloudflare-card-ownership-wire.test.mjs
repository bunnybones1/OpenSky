import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cardOwnershipWireErrors } from './check-cloudflare-card-ownership-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/cards.go',
      'cloudflare/src/card-balance-wire.ts',
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/api.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    cardsRPCSource: values[1],
    cardBalanceWire: values[2],
    playerRPC: values[3],
    api: values[4]
  }
}

const errorsFor = value => cardOwnershipWireErrors(...Object.values(value))

test('derives and enforces the complete CardOwnershipResponse wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse tuple flags, and projection bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'CardBalances                 map[uint64]map[string]*BalanceTuple `json:"cardBalances"',
        'CardBalances                 map[uint64]map[string]*BalanceTuple `json:"balances"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'LockedCardsByClass           map[string]uint64                   `json:"lockedCardsByClass"',
        'LockedCardsByClass           map[string]uint64                   `json:"lockedCardsByClass,omitempty"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'UnlockedCards                uint64                              `json:"unlockedCards"',
        'UnlockedCards                *uint64                             `json:"unlockedCards"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'PendingCardsByClassAndFrame  map[string]map[string]uint64        `json:"pendingCardsByClassAndFrame"',
        'Cursor                       string                              `json:"-"`\n\tPendingCardsByClassAndFrame  map[string]map[string]uint64        `json:"pendingCardsByClassAndFrame"'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'response.CardBalances = make(map[uint64]map[string]*proto.BalanceTuple)',
        'response.CardBalances = nil'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'vals[frame.String()] = new(proto.BalanceTuple)',
        'vals[frame.String()] = nil'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'vals[b.ItemType.String()].IsNew = b.IsNew',
        'vals[b.ItemType.String()].IsNew = nil'
      )
    },
    {
      ...value,
      cardBalanceWire: value.cardBalanceWire.replaceAll(
        'sourceBalanceTupleWire(tuple)',
        'tuple'
      )
    },
    {
      ...value,
      cardBalanceWire: value.cardBalanceWire.replace(
        'pendingCards: ownership.pendingCards',
        'pendingCards: 0'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        "CARD_FRAMES.map(frame => [frame, { balance: '0', isNew: null }])",
        "CARD_FRAMES.map(frame => [frame, { balance: '0', isNew: false }])"
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'return sourceCardOwnershipWire({',
        'return ({'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace('sourceCardOwnershipWire,', '')
    },
    {
      ...value,
      api: value.api.replace(
        'playerRpc.cardOwnership(',
        'playerRpc.oldCardOwnership('
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS',
        'proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS'
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
