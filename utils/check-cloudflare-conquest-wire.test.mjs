import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestWireErrors } from './check-cloudflare-conquest-wire.mjs'

const fixtures = async () => {
  const [
    source,
    sourceRpc,
    sourceItem,
    sharedAssets,
    conquestWire,
    conquest,
    api
  ] = await Promise.all([
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('api/rpc/conquests.go', 'utf8'),
    readFile('api/data/item.go', 'utf8'),
    readFile('lib/shared/src/assetsIDs.ts', 'utf8'),
    readFile('cloudflare/src/conquest-wire.ts', 'utf8'),
    readFile('cloudflare/src/conquest.ts', 'utf8'),
    readFile('cloudflare/src/api.ts', 'utf8')
  ])
  return {
    source,
    sourceRpc,
    sourceItem,
    sharedAssets,
    conquestWire,
    conquest,
    api
  }
}

test('derives and enforces the complete Go Conquest RPC contract', async () => {
  const value = await fixtures()
  assert.deepEqual(
    conquestWireErrors(
      value.source,
      value.sourceRpc,
      value.sourceItem,
      value.sharedAssets,
      value.conquestWire,
      value.conquest,
      value.api
    ),
    []
  )
})

test('rejects source drift, sparse nulls, and bypassed boundaries', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        'EndedAt       *time.Time             `json:"endedAt" db:"ended_at,omitempty"`',
        'EndedAt       *time.Time             `json:"endedAt,omitempty" db:"ended_at,omitempty"`'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'Arg0 *Hero `json:"hero"`',
        'Arg0 Hero `json:"hero"`'
      )
    },
    {
      ...value,
      sourceRpc: value.sourceRpc.replace(
        'return false, proto.ErrorInternal("enter conquest")',
        'return false, err'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'TotalSupply uint64    `json:"totalSupply" db:"-"`',
        'TotalSupply uint64    `json:"totalSupply,omitempty" db:"-"`'
      )
    },
    {
      ...value,
      sourceRpc: value.sourceRpc.replace(
        'g.TotalSupply = item.Balance.Uint64()',
        'g.TotalSupply = 0'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'Ret1 uint64 `json:"nedeed"`',
        'Ret1 uint64 `json:"needed"`'
      )
    },
    {
      ...value,
      sourceRpc: value.sourceRpc.replace(
        'const pointsRequired = 30',
        'const pointsRequired = 31'
      )
    },
    {
      ...value,
      sourceRpc: value.sourceRpc.replace(
        'return points.CurrentPoints, required, err',
        'return points.TotalPoints, required, err'
      )
    },
    {
      ...value,
      sourceItem: value.sourceItem.replace(
        'return (2 << 16) + itemID',
        'return (3 << 16) + itemID'
      )
    },
    {
      ...value,
      sharedAssets: value.sharedAssets.replace(
        'return getUngradedID(id) + (2 << 16)',
        'return getUngradedID(id) + (3 << 16)'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'EndedAt       *time.Time',
        'EndedAt       time.Time '
      )
    },
    {
      ...value,
      conquestWire: value.conquestWire.replace(
        'endedAt: conquest.endedAt ?? null',
        ''
      )
    },
    {
      ...value,
      conquestWire: value.conquestWire.replace(
        'totalSupply: reward.totalSupply',
        ''
      )
    },
    {
      ...value,
      conquestWire: value.conquestWire.replace(
        'nedeed: response.nedeed',
        ''
      )
    },
    {
      ...value,
      conquest: value.conquest.replace('constructedGoldCardsWon: 0,', '')
    },
    {
      ...value,
      conquest: value.conquest.replace(': Hero.UNKNOWN', ': value as Hero')
    },
    {
      ...value,
      conquest: value.conquest.replace(
        'tokenId: getGoldID(row.card_id)',
        'tokenId: row.card_id'
      )
    },
    {
      ...value,
      conquest: value.conquest.replace(
        'LEGACY_CONQUEST_POINTS_REQUIRED = 30',
        'LEGACY_CONQUEST_POINTS_REQUIRED = 31'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'const hero = sourceConquestHeroArgument(body)',
        'const hero = (body as { hero?: string }).hero'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'conquest: await conquest.status(principal.userId)',
        'conquest: null'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'weeklyGolds: await conquest.rewards()',
        'weeklyGolds: []'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'sourceConquestPointsResponseWire({',
        '({'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'principal.userId,\n          LEGACY_CONQUEST_EVENT_ID',
        'principal.userId,\n          CONQUEST_V2_EVENT_ID'
      )
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      conquestWireErrors(
        mutation.source,
        mutation.sourceRpc,
        mutation.sourceItem,
        mutation.sharedAssets,
        mutation.conquestWire,
        mutation.conquest,
        mutation.api
      ),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
