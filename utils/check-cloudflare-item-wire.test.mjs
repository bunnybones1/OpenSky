import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { itemWireErrors } from './check-cloudflare-item-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/items.go',
      'cloudflare/src/item-wire.ts',
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/api.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    itemsRPCSource: values[1],
    itemWire: values[2],
    playerRPC: values[3],
    api: values[4]
  }
}

const errorsFor = value => itemWireErrors(...Object.values(value))

test('derives and enforces the complete public Go inventory wires', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse nulls, leaks, and route bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'ContractAddress *Hash           `json:"contractAddress"',
        'ContractAddress Hash            `json:"contractAddress"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'IsNew           *bool           `json:"isNew"',
        'IsNew           *bool           `json:"isNew,omitempty"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'AccountAddress  *Hash           `json:"-"',
        'AccountAddress  *Hash           `json:"accountAddress"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Balance         prototyp.BigInt `json:"balance"',
        'Balance         uint64          `json:"balance"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'UpdatedAt    *time.Time      `json:"updatedAt"',
        'UpdatedAt    time.Time       `json:"updatedAt"'
      )
    },
    {
      ...value,
      itemsRPCSource: value.itemsRPCSource.replace(
        'func (s *Server) GetBatchItemSupply',
        'func (s *Server) OldGetBatchItemSupply'
      )
    },
    {
      ...value,
      itemWire: value.itemWire.replace(
        'contractAddress: item.contractAddress ?? null',
        'contractAddress: item.contractAddress'
      )
    },
    {
      ...value,
      itemWire: value.itemWire.replace(
        'isNew: item.isNew ?? null',
        'accountID: 1,\n    isNew: item.isNew ?? null'
      )
    },
    {
      ...value,
      itemWire: value.itemWire.replace(
        'updatedAt: summary.updatedAt ?? null',
        'updatedAt: summary.updatedAt'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        '.map(row =>\n        sourceItemWire({',
        '.map(row => ({'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'supply[row.item_type] = sourceItemWire({',
        'supply[row.item_type] = ({'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace('return sourceItemWire({', 'return ({')
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'summary.USDC = sourceItemSummaryWire({',
        'summary.USDC = ({'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'playerRpc.batchItemSupply(',
        'playerRpc.oldBatchItemSupply('
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
